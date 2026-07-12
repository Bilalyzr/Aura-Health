import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Cycle from './models/Cycle.js';
import Log from './models/Log.js';
import Routine from './models/Routine.js';
import { Thread, Reply } from './models/Thread.js';
import Consent from './models/Consent.js';
import AuditLog from './models/AuditLog.js';
import OtpRequest from './models/OtpRequest.js';
import { authenticateToken, requireRole } from './middleware/auth.js';
import { generateDailyRoutine, getCycleDayAndPhase } from './ai/ruleEngine.js';
import { callLLM, callLLMStream } from './ai/llmClient.js';

// Partner Room Messages
const partnerMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true }
}, { timestamps: true });

const PartnerMessage = mongoose.model('PartnerMessage', partnerMessageSchema);

// Menstrual Leave Logs
const leaveLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  reason: { type: String, default: 'Menstrual Cramps & Severe Fatigue' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }
}, { timestamps: true });

const LeaveLog = mongoose.model('LeaveLog', leaveLogSchema);

// Partner Orders
const partnerOrderSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemName: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, default: 'Dispatched via Aura Courier (ETA: 45 minutes)' }
}, { timestamps: true });

const PartnerOrder = mongoose.models.PartnerOrder || mongoose.model('PartnerOrder', partnerOrderSchema);

// Partner Nudges
const partnerNudgeSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });

const PartnerNudge = mongoose.models.PartnerNudge || mongoose.model('PartnerNudge', partnerNudgeSchema);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

// Middleware
app.use(cors({
  origin: '*', // For development, allow all origins
  credentials: true
}));
app.use(express.json());

// Token generation helpers
const generateAccessToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

// Helper to generate a fixed unique shareable ID
async function generateUniqueShareId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let uid = '';
  while (!isUnique) {
    uid = 'AURA-UID-';
    for (let i = 0; i < 6; i++) {
      uid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await User.findOne({ uniqueShareId: uid });
    if (!existing) {
      isUnique = true;
    }
  }
  return uid;
}

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, fullName, dateOfBirth, userType } = req.body;

    // Validate required fields up front so missing data returns 400, not a 500
    if (!email || !password || !fullName || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email, password, full name, and date of birth are required.' }
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check duplicate
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email address is already registered.' }
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate unique ID
    const uniqueShareId = await generateUniqueShareId();

    // Create user
    const newUser = await User.create({
      email: normalizedEmail,
      passwordHash,
      fullName,
      dateOfBirth,
      userType: userType || 'patient',
      uniqueShareId
    });

    const token = generateAccessToken(newUser._id, newUser.userType);

    // Create initial audit log
    await AuditLog.create({
      actorId: newUser._id,
      action: 'user.register',
      targetId: newUser._id
    });

    res.status(201).json({
      success: true,
      user: {
        id: newUser._id,
        email: newUser.email,
        fullName: newUser.fullName,
        userType: newUser.userType,
        conditionTags: newUser.conditionTags,
        uniqueShareId: newUser.uniqueShareId
      },
      token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();
    console.log(`[AUTH LOGIN] Attempt: "${email}" -> Normalized: "${normalizedEmail}"`);
    
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.deletedAt) {
      console.log(`[AUTH LOGIN] User not found for email: "${normalizedEmail}"`);
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log(`[AUTH LOGIN] Password match status: ${isMatch}`);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    // Generate unique ID on first login if not already present (ensures fixed unique ID)
    if (!user.uniqueShareId) {
      user.uniqueShareId = await generateUniqueShareId();
      await user.save();
    }

    const token = generateAccessToken(user._id, user.userType);

    // Log login action
    await AuditLog.create({
      actorId: user._id,
      action: 'user.login',
      targetId: user._id
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
        conditionTags: user.conditionTags,
        uniqueShareId: user.uniqueShareId
      },
      token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

// POST /api/auth/trusted-login
app.post('/api/auth/trusted-login', async (req, res) => {
  try {
    const { uniqueShareId, trustedEmail } = req.body;
    if (!uniqueShareId || !trustedEmail) {
      return res.status(400).json({ success: false, error: { message: 'Unique ID and Email are required.' } });
    }

    const patient = await User.findOne({ uniqueShareId });
    if (!patient) {
      return res.status(404).json({ success: false, error: { message: 'Patient with this Unique ID not found.' } });
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    const request = await OtpRequest.create({
      originalUserId: patient._id,
      trustedEmail: trustedEmail.trim().toLowerCase(),
      otpCode,
      status: 'pending',
      expiresAt
    });

    res.json({ success: true, requestId: request._id });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/auth/trusted-login/status/:requestId
app.get('/api/auth/trusted-login/status/:requestId', async (req, res) => {
  try {
    const request = await OtpRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ success: false, error: { message: 'OTP request not found.' } });
    }

    if (new Date() > request.expiresAt) {
      request.status = 'rejected';
      await request.save();
      return res.json({ success: true, status: 'rejected', message: 'Request expired.' });
    }

    res.json({
      success: true,
      status: request.status,
      token: request.status === 'approved' ? request.token : null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/users/me
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const populated = await User.findById(req.user._id)
      .populate('linkedAccounts.userId', 'fullName email userType');
    res.json({ success: true, user: populated });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ----------------------------------------------------
// ONBOARDING SURVEY
// ----------------------------------------------------

// POST /api/onboarding/survey
app.post('/api/onboarding/survey', authenticateToken, async (req, res) => {
  try {
    const { 
      conditionTags, 
      cycleStartDate, 
      lifeStage, 
      surveyAnswers, 
      consentAggregated, 
      locale, 
      accessibilityAccommodations 
    } = req.body;

    // Update user profile with complete survey data
    const user = req.user;
    user.conditionTags = conditionTags || [];
    user.lifeStage = lifeStage || '';
    user.surveyAnswers = surveyAnswers || {};
    user.consentAggregated = !!consentAggregated;
    user.locale = locale || 'en';
    user.accessibilityAccommodations = accessibilityAccommodations || [];
    await user.save();

    // If cycle start date is provided, initialize a cycle entry
    let cycle = null;
    if (cycleStartDate) {
      const start = new Date(cycleStartDate);
      // Predict next starts 28 days later
      const predictedNextStart = new Date(start.getTime() + 28 * 24 * 60 * 60 * 1000);
      
      cycle = await Cycle.create({
        userId: user._id,
        startDate: start,
        predictedNextStart
      });
    }

    // Trigger daily routine generation
    const ruleOutput = generateDailyRoutine(user, cycle, []);
    
    // Save routine
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Remove existing routine if any
    await Routine.deleteOne({ userId: user._id, date: today });
    
    const routine = await Routine.create({
      userId: user._id,
      date: today,
      items: ruleOutput.items,
      generatedBy: 'rule-engine-v1.0'
    });

    res.json({
      success: true,
      user,
      routine,
      phase: ruleOutput.phase,
      cycleDay: ruleOutput.cycleDay
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

// POST /api/telemetry/sync
app.post('/api/telemetry/sync', authenticateToken, async (req, res) => {
  try {
    const { sleepHours, sleepQuality, basalBodyTemp, hrv, source } = req.body;
    const user = req.user;

    // Save telemetry log
    user.telemetryLogs.push({
      sleepHours: Number(sleepHours),
      sleepQuality,
      basalBodyTemp: Number(basalBodyTemp),
      hrv: Number(hrv),
      source,
      timestamp: new Date()
    });

    // Limit telemetry logs to last 30 entries to prevent document bloat
    if (user.telemetryLogs.length > 30) {
      user.telemetryLogs.shift();
    }

    await user.save();

    // Fetch cycle phase for daily routine update
    const cycle = await Cycle.findOne({ userId: user._id }).sort({ startDate: -1 });
    
    // Fetch recent symptom logs to check for consecutive pain / red flags
    const recentLogs = await Log.find({ 
      userId: user._id, 
      date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
    }).sort({ date: -1 });

    // Trigger routine generator
    const ruleOutput = generateDailyRoutine(user, cycle, recentLogs);
    
    // Save routine
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Remove existing routine if any
    await Routine.deleteOne({ userId: user._id, date: today });
    
    const routine = await Routine.create({
      userId: user._id,
      date: today,
      items: ruleOutput.items,
      generatedBy: 'rule-engine-v1.0-telemetry'
    });

    res.json({
      success: true,
      user,
      routine,
      phase: ruleOutput.phase,
      cycleDay: ruleOutput.cycleDay,
      telemetry: user.telemetryLogs[user.telemetryLogs.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

// ----------------------------------------------------
// CYCLE TRACKING ROUTES
// ----------------------------------------------------

// GET /api/cycles
app.get('/api/cycles', authenticateToken, async (req, res) => {
  try {
    const cycles = await Cycle.find({ userId: req.user._id }).sort({ startDate: -1 });
    res.json({ success: true, cycles });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/cycles
app.post('/api/cycles', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, flowIntensity } = req.body;

    const start = startDate ? new Date(startDate) : new Date();

    // Handle end-dating previous active cycle
    const activeCycle = await Cycle.findOne({ userId: req.user._id, endDate: null });
    if (activeCycle) {
      activeCycle.endDate = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      await activeCycle.save();
    }

    const predictedNextStart = new Date(start.getTime() + 28 * 24 * 60 * 60 * 1000);

    const cycle = await Cycle.create({
      userId: req.user._id,
      startDate: start,
      endDate: endDate ? new Date(endDate) : null,
      flowIntensity: flowIntensity || [],
      predictedNextStart
    });

    res.status(201).json({ success: true, cycle });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// PATCH /api/cycles/:id/flow
app.patch('/api/cycles/:id/flow', authenticateToken, async (req, res) => {
  try {
    const { date, level } = req.body;
    const cycle = await Cycle.findOne({ _id: req.params.id, userId: req.user._id });
    if (!cycle) return res.status(404).json({ success: false, error: { message: 'Cycle not found' } });

    // Remove log for date if already exists and replace
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    cycle.flowIntensity = cycle.flowIntensity.filter(f => {
      const d = new Date(f.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() !== logDate.getTime();
    });

    cycle.flowIntensity.push({ date: logDate, level });
    await cycle.save();
    
    res.json({ success: true, cycle });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/cycles/prediction
app.get('/api/cycles/prediction', authenticateToken, async (req, res) => {
  try {
    const lastCycle = await Cycle.findOne({ userId: req.user._id }).sort({ startDate: -1 });
    if (!lastCycle) {
      return res.json({ success: true, prediction: null });
    }

    const nextPredicted = lastCycle.predictedNextStart || new Date(lastCycle.startDate.getTime() + 28 * 24 * 60 * 60 * 1000);
    
    res.json({
      success: true,
      prediction: {
        lastCycleStart: lastCycle.startDate,
        predictedNextStart: nextPredicted,
        estimatedCycleLength: 28
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ----------------------------------------------------
// SYMPTOM / MOOD LOGGING ROUTES
// ----------------------------------------------------

// POST /api/logs/:type
app.post('/api/logs/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { value, note, date } = req.body;

    const logDate = date ? new Date(date) : new Date();
    
    // Create new health log entry
    const log = await Log.create({
      userId: req.user._id,
      type,
      date: logDate,
      value,
      note: note || ''
    });

    // If it's a water log, we can automatically update dashboard summaries or routines if needed.
    res.status(201).json({ success: true, log });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/logs/:type
app.get('/api/logs/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const logs = await Log.find({ userId: req.user._id, type }).sort({ date: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ----------------------------------------------------
// DAILY ROUTINE ROUTES
// ----------------------------------------------------

// GET /api/routines/today
app.get('/api/routines/today', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let routine = await Routine.findOne({ userId: user._id, date: today });
    
    // Fetch latest active cycle to determine phase
    const cycle = await Cycle.findOne({ userId: user._id }).sort({ startDate: -1 });

    // Fetch recent logs (last 7 days) to run rules
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentLogs = await Log.find({ userId: user._id, date: { $gte: weekAgo } }).sort({ date: -1 });

    const ruleOutput = generateDailyRoutine(user, cycle, recentLogs);

    if (!routine) {
      // Create new one for today using rule output
      routine = await Routine.create({
        userId: user._id,
        date: today,
        items: ruleOutput.items,
        generatedBy: 'rule-engine-v1.0'
      });
    }

    res.json({
      success: true,
      routine,
      recommendations: ruleOutput.recommendations,
      redFlagAlert: ruleOutput.redFlagAlert,
      redFlagMessage: ruleOutput.redFlagMessage,
      phase: ruleOutput.phase,
      cycleDay: ruleOutput.cycleDay
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// PATCH /api/routines/:id/items/:itemId
app.patch('/api/routines/:id/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const { completed } = req.body;
    const routine = await Routine.findOne({ _id: req.params.id, userId: req.user._id });
    if (!routine) return res.status(404).json({ success: false, error: { message: 'Routine card not found' } });

    const item = routine.items.find(i => i.id === req.params.itemId);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Routine checklist item not found' } });

    item.completed = completed;
    await routine.save();

    res.json({ success: true, routine });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ----------------------------------------------------
// DASHBOARD SUMMARY ENDPOINT
// ----------------------------------------------------

// GET /api/dashboard/summary
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch cycle phase
    const cycle = await Cycle.findOne({ userId: user._id }).sort({ startDate: -1 });
    const { day, phase } = getCycleDayAndPhase(cycle?.startDate);

    // Fetch routine
    let routine = await Routine.findOne({ userId: user._id, date: today });
    
    // Fetch logs from today — sorted ascending by date so .pop() returns the most recent
    const logsToday = await Log.find({
      userId: user._id,
      date: { $gte: today }
    }).sort({ date: 1 });

    const moodLog = logsToday.filter(l => l.type === 'mood').pop();
    const hydrationLogs = logsToday.filter(l => l.type === 'hydration');
    const exerciseLogs = logsToday.filter(l => l.type === 'exercise');
    const symptomLogs = logsToday.filter(l => l.type === 'symptom');

    const totalHydration = hydrationLogs.reduce((acc, log) => acc + Number(log.value), 0);
    const totalExercise = exerciseLogs.reduce((acc, log) => acc + Number(log.value), 0);
    // Use peak (max) pain across all pain logs today, matching the "Today's peak pain" label in the UI
    const painLogs = symptomLogs.filter(s => s.value?.symptom === 'pain');
    const peakPain = painLogs.length > 0 ? Math.max(...painLogs.map(s => Number(s.value.intensity))) : null;

    // Run rules to generate recommendations
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentLogs = await Log.find({ userId: user._id, date: { $gte: weekAgo } }).sort({ date: -1 });
    const ruleOutput = generateDailyRoutine(user, cycle, recentLogs);

    if (!routine) {
      routine = await Routine.create({
        userId: user._id,
        date: today,
        items: ruleOutput.items,
        generatedBy: 'rule-engine-v1.0'
      });
    }

    // Average cycle length from the gaps between consecutive period start dates
    const allCycles = await Cycle.find({ userId: user._id }).sort({ startDate: 1 });
    let avgCycleLength = 28;
    if (allCycles.length >= 2) {
      let totalGap = 0;
      for (let i = 1; i < allCycles.length; i++) {
        totalGap += Math.round((new Date(allCycles[i].startDate) - new Date(allCycles[i - 1].startDate)) / (1000 * 60 * 60 * 24));
      }
      const avg = Math.round(totalGap / (allCycles.length - 1));
      if (avg > 0) avgCycleLength = avg;
    }

    res.json({
      success: true,
      cycleDay: day,
      phase,
      routine,
      avgCycleLength,
      symptomsToday: symptomLogs.length,
      logs: {
        mood: moodLog ? moodLog.value : null,
        hydration: totalHydration,
        exercise: totalExercise,
        pain: peakPain
      },
      recommendations: ruleOutput.recommendations,
      redFlagAlert: ruleOutput.redFlagAlert,
      redFlagMessage: ruleOutput.redFlagMessage
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ----------------------------------------------------
// COMMUNITY FORUM ROUTES
// ----------------------------------------------------

// GET /api/forum/threads
app.get('/api/forum/threads', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: 'visible' };
    if (category && category !== 'general') {
      filter.category = category;
    }
    const threads = await Thread.find(filter)
      .populate('authorId', 'fullName userType')
      .sort({ createdAt: -1 });

    res.json({ success: true, threads });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/forum/threads
app.post('/api/forum/threads', authenticateToken, async (req, res) => {
  try {
    const { title, body, category } = req.body;
    const thread = await Thread.create({
      authorId: req.user._id,
      title,
      body,
      category: category || 'general'
    });

    const populated = await thread.populate('authorId', 'fullName userType');

    res.status(201).json({ success: true, thread: populated });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/forum/threads/:id
app.get('/api/forum/threads/:id', authenticateToken, async (req, res) => {
  try {
    const thread = await Thread.findOne({ _id: req.params.id, status: 'visible' })
      .populate('authorId', 'fullName userType');
    if (!thread) {
      return res.status(404).json({ success: false, error: { message: 'Thread not found' } });
    }

    const replies = await Reply.find({ threadId: req.params.id, status: 'visible' })
      .populate('authorId', 'fullName userType')
      .sort({ createdAt: 1 });

    res.json({ success: true, thread, replies });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/forum/threads/:id/replies
app.post('/api/forum/threads/:id/replies', authenticateToken, async (req, res) => {
  try {
    const { body } = req.body;
    const reply = await Reply.create({
      threadId: req.params.id,
      authorId: req.user._id,
      body
    });

    const populated = await reply.populate('authorId', 'fullName userType');
    res.status(201).json({ success: true, reply: populated });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/forum/threads/:id/upvote
app.post('/api/forum/threads/:id/upvote', authenticateToken, async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ success: false, error: { message: 'Thread not found' } });

    const idx = thread.upvotes.indexOf(req.user._id);
    if (idx > -1) {
      thread.upvotes.splice(idx, 1); // remove upvote
    } else {
      thread.upvotes.push(req.user._id);
    }
    await thread.save();
    res.json({ success: true, upvotesCount: thread.upvotes.length, hasUpvoted: idx === -1 });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/forum/reports
app.post('/api/forum/reports', authenticateToken, async (req, res) => {
  try {
    const { targetId, targetType, reason } = req.body;
    
    if (targetType === 'thread') {
      const thread = await Thread.findById(targetId);
      if (thread) {
        thread.reportCount += 1;
        if (thread.reportCount >= 3) {
          thread.status = 'flagged'; // Flag for moderation review
        }
        await thread.save();
      }
    } else if (targetType === 'reply') {
      const reply = await Reply.findById(targetId);
      if (reply) {
        reply.reportCount += 1;
        if (reply.reportCount >= 3) {
          reply.status = 'flagged';
        }
        await reply.save();
      }
    }

    await AuditLog.create({
      actorId: req.user._id,
      action: 'forum.report',
      targetId,
      metadata: { targetType, reason }
    });

    res.json({ success: true, message: 'Content reported successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ----------------------------------------------------
// CONSENT SHARING ROUTES
// ----------------------------------------------------

// GET /api/consents
app.get('/api/consents', authenticateToken, async (req, res) => {
  try {
    const consents = await Consent.find({ ownerId: req.user._id })
      .populate('granteeId', 'fullName email userType');
    res.json({ success: true, consents });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/consents/otp-requests
app.get('/api/consents/otp-requests', authenticateToken, async (req, res) => {
  try {
    const requests = await OtpRequest.find({
      originalUserId: req.user._id,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/consents/otp-requests/:requestId/action
app.post('/api/consents/otp-requests/:requestId/action', authenticateToken, async (req, res) => {
  try {
    const { action } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid action. Must be approve or reject.' } });
    }

    const request = await OtpRequest.findOne({
      _id: req.params.requestId,
      originalUserId: req.user._id
    });

    if (!request) {
      return res.status(404).json({ success: false, error: { message: 'OTP request not found.' } });
    }

    if (new Date() > request.expiresAt) {
      request.status = 'rejected';
      await request.save();
      return res.status(400).json({ success: false, error: { message: 'OTP request has expired.' } });
    }

    if (action === 'reject') {
      request.status = 'rejected';
      await request.save();
      return res.json({ success: true });
    }

    // Approve flow: Link partner
    let partner = await User.findOne({ email: request.trustedEmail });
    if (!partner) {
      // Create new partner account
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash('Password123!', salt);
      partner = await User.create({
        email: request.trustedEmail,
        passwordHash,
        fullName: 'Trusted Person (' + request.trustedEmail.split('@')[0] + ')',
        dateOfBirth: new Date('1990-01-01'),
        userType: 'partner',
        uniqueShareId: await generateUniqueShareId()
      });
    }

    // Create / Update Consent relationship (full scope)
    const scope = ['cycle_phase', 'hydration', 'mood_summary', 'symptom_trends', 'medication_reminders', 'red_flags'];
    await Consent.findOneAndUpdate(
      { ownerId: req.user._id, granteeId: partner._id },
      { scope, status: 'active' },
      { upsert: true, new: true }
    );

    // Link accounts in patient profile
    const indexOwner = req.user.linkedAccounts.findIndex(l => l.userId.toString() === partner._id.toString());
    if (indexOwner > -1) {
      req.user.linkedAccounts[indexOwner].consentScope = scope;
    } else {
      req.user.linkedAccounts.push({
        userId: partner._id,
        relationship: 'partner',
        consentScope: scope
      });
    }
    await req.user.save();

    // Link accounts in partner profile
    const indexGrantee = partner.linkedAccounts.findIndex(l => l.userId.toString() === req.user._id.toString());
    if (indexGrantee > -1) {
      partner.linkedAccounts[indexGrantee].consentScope = scope;
    } else {
      partner.linkedAccounts.push({
        userId: req.user._id,
        relationship: 'patient',
        consentScope: scope
      });
    }
    await partner.save();

    // Generate token for partner to log in
    const token = generateAccessToken(partner._id, partner.userType);

    request.status = 'approved';
    request.token = token;
    await request.save();

    // Create audit log
    await AuditLog.create({
      actorId: req.user._id,
      action: 'consent.granted',
      targetId: partner._id,
      metadata: { granteeId: partner._id, scope, mode: 'trusted_otp' }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/consents
app.post('/api/consents', authenticateToken, async (req, res) => {
  try {
    const { granteeEmail, scope } = req.body;
    const grantee = await User.findOne({ email: granteeEmail });
    if (!grantee) {
      return res.status(404).json({
        success: false,
        error: { code: 'GRANTEE_NOT_FOUND', message: 'User with this email not found.' }
      });
    }

    // Prevent duplicate consents, check if active
    let consent = await Consent.findOne({ ownerId: req.user._id, granteeId: grantee._id });
    if (consent) {
      consent.status = 'active';
      consent.scope = scope || [];
      await consent.save();
    } else {
      consent = await Consent.create({
        ownerId: req.user._id,
        granteeId: grantee._id,
        scope: scope || []
      });
    }

    // Link target accounts together
    const indexOwner = req.user.linkedAccounts.findIndex(l => l.userId.toString() === grantee._id.toString());
    if (indexOwner > -1) {
      req.user.linkedAccounts[indexOwner].consentScope = scope;
    } else {
      req.user.linkedAccounts.push({
        userId: grantee._id,
        relationship: grantee.userType === 'doctor' ? 'doctor' : (grantee.userType === 'guardian' ? 'guardian' : 'partner'),
        consentScope: scope
      });
    }
    await req.user.save();

    // Link in Grantee profile as well
    const indexGrantee = grantee.linkedAccounts.findIndex(l => l.userId.toString() === req.user._id.toString());
    if (indexGrantee > -1) {
      grantee.linkedAccounts[indexGrantee].consentScope = scope;
    } else {
      grantee.linkedAccounts.push({
        userId: req.user._id,
        relationship: 'patient',
        consentScope: scope
      });
    }
    await grantee.save();

    await AuditLog.create({
      actorId: req.user._id,
      action: 'consent.granted',
      targetId: consent._id,
      metadata: { granteeId: grantee._id, scope }
    });

    res.status(201).json({ success: true, consent });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// DELETE /api/consents/:id
app.delete('/api/consents/:id', authenticateToken, async (req, res) => {
  try {
    const consent = await Consent.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!consent) return res.status(404).json({ success: false, error: { message: 'Consent not found' } });

    consent.status = 'revoked';
    consent.revokedAt = new Date();
    await consent.save();

    // Remove from user lists
    req.user.linkedAccounts = req.user.linkedAccounts.filter(l => l.userId.toString() !== consent.granteeId.toString());
    await req.user.save();

    const grantee = await User.findById(consent.granteeId);
    if (grantee) {
      grantee.linkedAccounts = grantee.linkedAccounts.filter(l => l.userId.toString() !== req.user._id.toString());
      await grantee.save();
    }

    await AuditLog.create({
      actorId: req.user._id,
      action: 'consent.revoked',
      targetId: consent._id
    });

    res.json({ success: true, message: 'Consent revoked successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ----------------------------------------------------
// GRANTEE SHARED VISIBILITY ROUTE
// ----------------------------------------------------

// GET /api/shared/patient/:patientId
app.get('/api/shared/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    // Check if grantee has consent from patient
    const consent = await Consent.findOne({
      ownerId: req.params.patientId,
      granteeId: req.user._id,
      status: 'active'
    });

    if (!consent) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'You do not have active consent from this user.' }
      });
    }

    const patient = await User.findById(req.params.patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'The linked patient account no longer exists.' }
      });
    }
    const cycle = await Cycle.findOne({ userId: req.params.patientId }).sort({ startDate: -1 });

    const sharedData = {
      fullName: patient.fullName,
      email: patient.email,
      conditionTags: patient.conditionTags,
      scopes: consent.scope
    };

    if (consent.scope.includes('cycle_phase')) {
      const { day, phase } = getCycleDayAndPhase(cycle?.startDate);
      sharedData.cycle = {
        phase,
        cycleDay: day,
        predictedNextStart: cycle?.predictedNextStart
      };
    }

    if (consent.scope.includes('mood_summary')) {
      const moodLogs = await Log.find({ userId: req.params.patientId, type: 'mood' })
        .sort({ date: -1 }).limit(10);
      sharedData.moodLogs = moodLogs;
    }

    if (consent.scope.includes('symptom_trends')) {
      const symptomLogs = await Log.find({ userId: req.params.patientId, type: 'symptom' })
        .sort({ date: -1 }).limit(20);
      sharedData.symptomLogs = symptomLogs;
    }

    if (consent.scope.includes('red_flags')) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentLogs = await Log.find({ userId: req.params.patientId, date: { $gte: weekAgo } });
      const ruleOutput = generateDailyRoutine(patient, cycle, recentLogs);
      sharedData.redFlagAlert = ruleOutput.redFlagAlert;
      sharedData.redFlagMessage = ruleOutput.redFlagMessage;
    }

    res.json({ success: true, data: sharedData });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ----------------------------------------------------
// REPORTS & ANALYTICS DATA
// ----------------------------------------------------
app.get('/api/reports/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Retrieve last 6 cycles
    const cycles = await Cycle.find({ userId }).sort({ startDate: -1 }).limit(6);
    
    // Retrieve historical symptom and mood logs (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await Log.find({
      userId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });

    res.json({
      success: true,
      cycles,
      logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ----------------------------------------------------
// ADMIN CONSOLE ROUTES
// ----------------------------------------------------

// GET /api/admin/moderation-queue
app.get('/api/admin/moderation-queue', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const flaggedThreads = await Thread.find({ status: 'flagged' })
      .populate('authorId', 'fullName email');
    const flaggedReplies = await Reply.find({ status: 'flagged' })
      .populate('authorId', 'fullName email');

    res.json({
      success: true,
      flagged: {
        threads: flaggedThreads,
        replies: flaggedReplies
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/admin/content/:type/:id/moderate
app.post('/api/admin/content/:type/:id/moderate', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type, id } = req.params;
    const { action } = req.body; // 'approve' or 'remove'

    const targetStatus = action === 'approve' ? 'visible' : 'removed';

    if (type === 'thread') {
      const thread = await Thread.findById(id);
      if (!thread) return res.status(404).json({ success: false, message: 'Thread not found' });
      thread.status = targetStatus;
      thread.reportCount = 0; // reset reports
      await thread.save();
    } else if (type === 'reply') {
      const reply = await Reply.findById(id);
      if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });
      reply.status = targetStatus;
      reply.reportCount = 0;
      await reply.save();
    }

    await AuditLog.create({
      actorId: req.user._id,
      action: `admin.moderate.${type}.${action}`,
      targetId: id
    });

    res.json({ success: true, message: `Content has been moderated: ${action}` });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/admin/users/:id/suspend
app.post('/api/admin/users/:id/suspend', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.deletedAt = new Date(); // Soft delete represents suspension
    await user.save();

    await AuditLog.create({
      actorId: req.user._id,
      action: 'admin.user.suspend',
      targetId: user._id
    });

    res.json({ success: true, message: 'User has been suspended successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/admin/users
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const users = await User.find({}).select('fullName email userType conditionTags createdAt deletedAt');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ----------------------------------------------------
// NEW MODULES: LUNA AI, TIMELINE, MENSTRUAL LEAVE, PARTNER CHAT
// ----------------------------------------------------

// Compute the weightage score programmatically based on message context
const computeWeightage = (message) => {
  const msgLower = message.toLowerCase();
  if (msgLower.includes('pain') || msgLower.includes('severe') || msgLower.includes('faint') || msgLower.includes('bleed') || msgLower.includes('emergency') || msgLower.includes('accident')) {
    return 8;
  } else if (msgLower.includes('pcos') || msgLower.includes('endo') || msgLower.includes('pmdd') || msgLower.includes('insulin') || msgLower.includes('cramp') || msgLower.includes('mood') || msgLower.includes('anxiety')) {
    return 6;
  } else if (msgLower.includes('period') || msgLower.includes('cycle') || msgLower.includes('ovulat') || msgLower.includes('fertil')) {
    return 4;
  }
  return 3;
};

// Deterministic rule-based reply used when no LLM is configured/available
const ruleBasedReply = (message, phase, day) => {
  const lowercaseMsg = message.toLowerCase();
  if (lowercaseMsg.includes('pcos') || lowercaseMsg.includes('insulin') || lowercaseMsg.includes('weight') || lowercaseMsg.includes('hair')) {
    return `Focus on stabilizing insulin and reducing androgens by using spearmint tea twice daily, opting for low-glycemic carbs like oats, and engaging in light strength training.`;
  } else if (lowercaseMsg.includes('endo') || lowercaseMsg.includes('pain') || lowercaseMsg.includes('cramp') || lowercaseMsg.includes('flare')) {
    return `For endometriosis discomfort, use a warm pelvic compress, do gentle pelvic stretches, and take magnesium glycinate. Seek immediate care if pain rises above an 8/10.`;
  } else if (lowercaseMsg.includes('pmdd') || lowercaseMsg.includes('mood') || lowercaseMsg.includes('anxiety') || lowercaseMsg.includes('sad') || lowercaseMsg.includes('depress')) {
    return `During your luteal phase, saffron extract (30mg) and evening complex carbs can help stabilize mood and serotonin levels. Gratitude journaling helps map intense luteal swings.`;
  } else if (lowercaseMsg.includes('period') || lowercaseMsg.includes('cycle') || lowercaseMsg.includes('ovulat') || lowercaseMsg.includes('fertil')) {
    return `You are in your ${phase.toUpperCase()} phase (Day ${day}). ${phase === 'follicular' || phase === 'ovulatory' ? 'Estrogen is rising, boosting your energy and stamina.' : 'Estrogen is low, so rest and gentle movement are key right now.'}`;
  } else if (lowercaseMsg.includes('agent') || lowercaseMsg.includes('capability') || lowercaseMsg.includes('tool')) {
    return `I operate as an AI agent running wellness diagnostics within strict safety boundaries to verify health outcomes.`;
  } else if (lowercaseMsg.includes('prompt') || lowercaseMsg.includes('instruction')) {
    return `My conversational outputs are formatted using system prompts that load active conditions and cycle phases to prevent diagnoses.`;
  } else if (lowercaseMsg.includes('rag') || lowercaseMsg.includes('retrieval') || lowercaseMsg.includes('vector')) {
    return `My retrieval pipeline scans clinical guidelines and matches user queries to vector space wellness articles.`;
  } else if (lowercaseMsg.includes('workflow') || lowercaseMsg.includes('creator') || lowercaseMsg.includes('stack')) {
    return `My workflow engine checks target stacks and executes single-responsibility steps before verifying output correctness.`;
  }
  return `I hear you. Tell me more about what you're experiencing. Regular logging helps me customize your daily routine recommendations.`;
};

const stripWeightageText = (text) =>
  (text || '').replace(/⚖️?\s*(?:Weightage|weightage|Clinical Weightage):\s*[^\n]+/gi, '').trim();

// POST /api/ai/chat
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const { message, stream } = req.body;
    const user = req.user;

    // Fetch cycle phase
    const cycle = await Cycle.findOne({ userId: user._id }).sort({ startDate: -1 });
    const { phase, day } = getCycleDayAndPhase(cycle?.startDate);

    const systemInstruction = `You are Luna, a clinical assistant companion for Aura Health. Keep responses simple, crisp, and extremely brief (maximum of 1-2 sentences). Do not write multiple paragraphs. Defer diagnostics or medical treatments to doctors.
User Profile:
- Name: ${user.fullName}
- Conditions: ${(user.conditionTags || []).join(', ').toUpperCase() || 'None'}
- Cycle: Day ${day} (${phase.toUpperCase()} phase)`;

    const weightage = computeWeightage(message);

    // ── Streaming path (Server-Sent Events) ──
    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      res.flushHeaders?.();

      // Once headers are sent we can no longer fall through to the JSON error
      // handler below (that would throw ERR_HTTP_HEADERS_SENT), so handle any
      // failure here by closing the SSE stream cleanly.
      try {
        const streamed = await callLLMStream(message, systemInstruction, (delta) => {
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        });

        // Fall back to a rule-based reply if the model produced nothing.
        if (!streamed) {
          const fallback = ruleBasedReply(message, phase, day);
          res.write(`data: ${JSON.stringify({ delta: fallback })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ done: true, weightage })}\n\n`);
      } catch (streamErr) {
        console.error('SSE streaming error:', streamErr);
        // Best-effort: hand the client a usable reply and close.
        const fallback = ruleBasedReply(message, phase, day);
        res.write(`data: ${JSON.stringify({ delta: fallback })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true, weightage })}\n\n`);
      }
      return res.end();
    }

    // ── Non-streaming path (JSON) ──
    let response = null;
    try {
      response = await callLLM(message, systemInstruction);
    } catch (err) {
      console.error("LLM integration error:", err);
    }

    if (!response) {
      response = ruleBasedReply(message, phase, day);
    }

    response = stripWeightageText(response);

    res.json({ success: true, response, weightage });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/timeline/weekly — real per-day aggregated data for the past 7 days
app.get('/api/timeline/weekly', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Build array of the past 7 days (today included)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    const weekStart = days[0];
    const weekEnd = new Date(); // now

    // Fetch all logs for the past 7 days in one query
    const logs = await Log.find({
      userId,
      date: { $gte: weekStart, $lte: weekEnd }
    }).sort({ date: 1 });

    // Aggregate per-day
    const daily = days.map(dayStart => {
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayLogs = logs.filter(l => {
        const ld = new Date(l.date);
        return ld >= dayStart && ld <= dayEnd;
      });

      const hydrationLogs = dayLogs.filter(l => l.type === 'hydration');
      const exerciseLogs = dayLogs.filter(l => l.type === 'exercise');
      const moodLogs = dayLogs.filter(l => l.type === 'mood');
      const painLogs = dayLogs.filter(l => l.type === 'symptom' && l.value?.symptom === 'pain');

      const totalHydration = hydrationLogs.reduce((sum, l) => sum + Number(l.value), 0);
      const totalExercise = exerciseLogs.reduce((sum, l) => sum + Number(l.value), 0);
      const avgMood = moodLogs.length > 0
        ? moodLogs.reduce((sum, l) => sum + Number(l.value), 0) / moodLogs.length
        : null;
      const peakPain = painLogs.length > 0
        ? Math.max(...painLogs.map(l => Number(l.value.intensity)))
        : null;

      return {
        date: dayStart.toISOString(),
        label: dayStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        hydration: totalHydration,
        exercise: totalExercise,
        mood: avgMood !== null ? parseFloat(avgMood.toFixed(1)) : null,
        pain: peakPain
      };
    });

    res.json({ success: true, weekly: daily });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/timeline
app.get('/api/timeline', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Retrieve cycles, logs
    const cycles = await Cycle.find({ userId }).sort({ startDate: -1 });
    const logs = await Log.find({ userId }).sort({ date: -1 });
    const leaveLogs = await LeaveLog.find({ userId }).sort({ date: -1 });

    const timeline = [];

    // Format cycles
    cycles.forEach(c => {
      timeline.push({
        type: 'cycle',
        date: c.startDate,
        title: 'New Cycle Logged',
        desc: `Started period on ${new Date(c.startDate).toLocaleDateString()}.${c.endDate ? ` Completed on ${new Date(c.endDate).toLocaleDateString()}.` : ' Currently in progress.'}`
      });
      c.flowIntensity.forEach(f => {
        timeline.push({
          type: 'cycle',
          date: f.date,
          title: 'Period Flow intensity',
          desc: `Flow rated as ${f.level.toUpperCase()}`
        });
      });
    });

    // Format logs
    logs.forEach(l => {
      let desc = '';
      if (l.type === 'mood') desc = `Mood rated: ${l.value}/5. Note: "${l.note}"`;
      else if (l.type === 'hydration') desc = `Drank: ${l.value} ml of water.`;
      else if (l.type === 'exercise') desc = `Exercised: ${l.value} minutes.`;
      else if (l.type === 'symptom') desc = `${l.value?.symptom?.toUpperCase()} level: ${l.value?.intensity}/10. Note: "${l.note}"`;

      timeline.push({
        type: l.type,
        date: l.date,
        title: `${l.type.charAt(0).toUpperCase() + l.type.slice(1)} Logged`,
        desc
      });
    });

    // Format leaves
    leaveLogs.forEach(l => {
      timeline.push({
        type: 'leave',
        date: l.date,
        title: 'Menstrual Leave Taken',
        desc: `Reason: ${l.reason} (${l.status.toUpperCase()})`
      });
    });

    // Sort timeline chronologically (newest first)
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, timeline: timeline.slice(0, 100) });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/leave
app.get('/api/leave', authenticateToken, async (req, res) => {
  try {
    const logs = await LeaveLog.find({ userId: req.user._id }).sort({ date: -1 });
    res.json({ success: true, leaveLogs: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/leave
app.post('/api/leave', authenticateToken, async (req, res) => {
  try {
    const { date, reason } = req.body;
    const leaveLog = await LeaveLog.create({
      userId: req.user._id,
      date: new Date(date),
      reason: reason || 'Menstrual Cramps & Severe Fatigue'
    });
    res.status(201).json({ success: true, leaveLog });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Resolve the Partner Room counterparty by role: a patient messages their
// linked 'partner'; a partner messages their linked 'patient'. Using
// linkedAccounts[0] blindly could route messages to a doctor/guardian instead.
const resolvePartnerLink = (u) => {
  const accounts = u.linkedAccounts || [];
  const wanted = u.userType === 'patient' ? 'partner' : 'patient';
  const link = accounts.find(l => l.relationship === wanted);
  return link?.userId?._id || link?.userId || null;
};

// GET /api/partner/messages
app.get('/api/partner/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    // Find linked partner/patient ID
    const partnerId = resolvePartnerLink(req.user);
    if (!partnerId) {
      return res.json({ success: true, messages: [] });
    }

    const messages = await PartnerMessage.find({
      $or: [
        { senderId: userId, recipientId: partnerId },
        { senderId: partnerId, recipientId: userId }
      ]
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/partner/messages
app.post('/api/partner/messages', authenticateToken, async (req, res) => {
  try {
    const { body } = req.body;
    const partnerId = resolvePartnerLink(req.user);
    if (!partnerId) {
      return res.status(400).json({ success: false, message: 'No linked partner found for this account.' });
    }

    const msg = await PartnerMessage.create({
      senderId: req.user._id,
      recipientId: partnerId,
      body
    });

    res.status(201).json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/auth/partner-login
app.post('/api/auth/partner-login', async (req, res) => {
  try {
    const { email, pairingKey } = req.body;
    if (!email || !pairingKey) {
      return res.status(400).json({ success: false, error: { message: "Email and pairing key are required." } });
    }

    // Find patient user with this active pairing key
    const patient = await User.findOne({ activePairingKey: pairingKey });
    if (!patient) {
      return res.status(404).json({ success: false, error: { message: "Invalid or expired pairing key." } });
    }

    // Find or create partner
    let partner = await User.findOne({ email });
    if (!partner) {
      const hash = await bcrypt.hash('PartnerPassword123!', 10);
      partner = await User.create({
        email,
        passwordHash: hash,
        fullName: 'Partner Account',
        dateOfBirth: new Date('1990-01-01'),
        userType: 'partner'
      });
    } else {
      if (partner.userType !== 'partner') {
        partner.userType = 'partner';
        await partner.save();
      }
    }

    // Link patient and partner if not already linked
    const partnerIdStr = partner._id.toString();
    const patientIdStr = patient._id.toString();

    // Check patient side links
    const hasPartnerLink = patient.linkedAccounts.some(l => l.userId.toString() === partnerIdStr);
    if (!hasPartnerLink) {
      patient.linkedAccounts.push({
        userId: partner._id,
        relationship: 'partner',
        consentScope: ['cycle_phase', 'hydration', 'mood_summary', 'red_flags']
      });
    }

    // Clear pairing key so it is a single-use token
    patient.activePairingKey = null;
    await patient.save();

    // Check partner side links
    const hasPatientLink = partner.linkedAccounts.some(l => l.userId.toString() === patientIdStr);
    if (!hasPatientLink) {
      partner.linkedAccounts.push({
        userId: patient._id,
        relationship: 'patient',
        consentScope: ['cycle_phase', 'hydration', 'mood_summary', 'red_flags']
      });
    }
    await partner.save();

    // Create Consent record
    const hasConsent = await Consent.findOne({ ownerId: patient._id, granteeId: partner._id });
    if (!hasConsent) {
      await Consent.create({
        ownerId: patient._id,
        granteeId: partner._id,
        scope: ['cycle_phase', 'hydration', 'mood_summary', 'red_flags']
      });
    }

    // Create audit log
    await AuditLog.create({
      actorId: partner._id,
      action: 'consent.granted',
      targetId: patient._id,
      metadata: { pairingKey }
    });

    await partner.populate('linkedAccounts.userId', 'fullName email userType');
    const token = generateAccessToken(partner._id, partner.userType);
    res.json({
      success: true,
      token,
      user: {
        id: partner._id,
        email: partner.email,
        fullName: partner.fullName,
        userType: partner.userType,
        conditionTags: partner.conditionTags,
        linkedAccounts: partner.linkedAccounts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/partner/pairing-key
app.post('/api/partner/pairing-key', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const randomKey = `AURA-PAIR-${Math.floor(1000 + Math.random() * 9000)}`;
    user.activePairingKey = randomKey;
    await user.save();
    res.json({ success: true, pairingKey: randomKey });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// PUT /api/users/profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, dateOfBirth, profileImage } = req.body;
    const user = req.user;
    if (fullName) user.fullName = fullName;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (profileImage !== undefined) user.profileImage = profileImage;
    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// DELETE /api/users/me
app.delete('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: { message: 'Password is required for re-authentication.' } });
    }
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: { message: 'Invalid password. Re-authentication failed.' } });
    }
    user.deletedAt = new Date();
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      action: 'user.delete',
      targetId: user._id,
      metadata: { dpdpErasure: true }
    });

    res.json({ success: true, message: 'Account soft-deleted. You have 30 days to recover before permanent erasure.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/partner/orders
app.post('/api/partner/orders', authenticateToken, async (req, res) => {
  try {
    const { itemName, price, patientId } = req.body;
    const partnerId = req.user._id;
    const order = await PartnerOrder.create({
      partnerId,
      patientId,
      itemName,
      price
    });

    // Create automatic chat message notifying patient
    await PartnerMessage.create({
      senderId: partnerId,
      recipientId: patientId,
      body: `🎁 Care Package Ordered: "${itemName}" (₹${price}) has been placed for dispatch! ETA: 45 minutes.`
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/partner/orders
app.get('/api/partner/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await PartnerOrder.find({
      $or: [{ partnerId: userId }, { patientId: userId }]
    }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/partner/nudges
app.post('/api/partner/nudges', authenticateToken, async (req, res) => {
  try {
    const { type, message, receiverId } = req.body;
    const senderId = req.user._id;

    const nudge = await PartnerNudge.create({
      senderId,
      receiverId,
      type,
      message
    });

    res.status(201).json({ success: true, nudge });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/partner/nudges
app.get('/api/partner/nudges', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const nudges = await PartnerNudge.find({ receiverId: userId, read: false });
    
    if (nudges.length > 0) {
      await PartnerNudge.updateMany({ receiverId: userId, read: false }, { $set: { read: true } });
    }

    res.json({ success: true, nudges });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Serve static built files from the React client application
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientBuildPath = path.join(__dirname, '../../client/dist');

app.use(express.static(clientBuildPath));

// Catch-all handler for client-side routing: serve index.html for any non-API request
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
