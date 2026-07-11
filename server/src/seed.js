import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Cycle from './models/Cycle.js';
import Log from './models/Log.js';
import Routine from './models/Routine.js';
import { Thread, Reply } from './models/Thread.js';
import Consent from './models/Consent.js';
import AuditLog from './models/AuditLog.js';

// Register schemas in seed context
const partnerMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true }
}, { timestamps: true });

const PartnerMessage = mongoose.models.PartnerMessage || mongoose.model('PartnerMessage', partnerMessageSchema);

const leaveLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  reason: { type: String, default: 'Menstrual Cramps & Severe Fatigue' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }
}, { timestamps: true });

const LeaveLog = mongoose.models.LeaveLog || mongoose.model('LeaveLog', leaveLogSchema);

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Cycle.deleteMany({});
    await Log.deleteMany({});
    await Routine.deleteMany({});
    await Thread.deleteMany({});
    await Reply.deleteMany({});
    await Consent.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('Cleared existing collections.');

    // Passwords
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    // 1. Create Users (Personas)
    const patientPcos = await User.create({
      email: 'pcos@aura.com',
      passwordHash,
      fullName: 'Ananya Sharma',
      dateOfBirth: new Date('2002-05-15'),
      userType: 'patient',
      conditionTags: ['pcos'],
      preferences: { theme: 'light', notifications: true }
    });

    const patientEndo = await User.create({
      email: 'endo@aura.com',
      passwordHash,
      fullName: 'Priya Patel',
      dateOfBirth: new Date('1997-09-21'),
      userType: 'patient',
      conditionTags: ['endometriosis'],
      preferences: { theme: 'light', notifications: true }
    });

    const patientPmdd = await User.create({
      email: 'pmdd@aura.com',
      passwordHash,
      fullName: 'Kriti Sen',
      dateOfBirth: new Date('1999-12-05'),
      userType: 'patient',
      conditionTags: ['pmdd'],
      preferences: { theme: 'light', notifications: true }
    });

    const partner = await User.create({
      email: 'partner@aura.com',
      passwordHash,
      fullName: 'Rohan Sharma',
      dateOfBirth: new Date('1998-03-10'),
      userType: 'partner'
    });

    const guardian = await User.create({
      email: 'guardian@aura.com',
      passwordHash,
      fullName: 'Sunita Sharma',
      dateOfBirth: new Date('1976-11-20'),
      userType: 'guardian'
    });

    const doctor = await User.create({
      email: 'doctor@aura.com',
      passwordHash,
      fullName: 'Dr. Meera Rao',
      dateOfBirth: new Date('1984-07-14'),
      userType: 'doctor'
    });

    const admin = await User.create({
      email: 'admin@aura.com',
      passwordHash,
      fullName: 'Aura Administrator',
      dateOfBirth: new Date('1990-01-01'),
      userType: 'admin'
    });

    console.log('Seeded users (Ananya: PCOS, Priya: Endo, Kriti: PMDD, Rohan: Partner, Sunita: Guardian, Dr. Meera: Doctor, Admin: admin).');

    // 2. Seed Cycle History for PCOS Patient (Ananya)
    const today = new Date();
    const cycle1Start = new Date(today);
    cycle1Start.setDate(today.getDate() - 10); // Day 10 of current cycle

    await Cycle.create({
      userId: patientPcos._id,
      startDate: cycle1Start,
      predictedNextStart: new Date(cycle1Start.getTime() + 28 * 24 * 60 * 60 * 1000)
    });

    // Historic cycle for PCOS patient (35 days ago, lasted 5 days)
    const cycle2Start = new Date(cycle1Start);
    cycle2Start.setDate(cycle1Start.getDate() - 32);
    const cycle2End = new Date(cycle2Start);
    cycle2End.setDate(cycle2Start.getDate() + 5);

    await Cycle.create({
      userId: patientPcos._id,
      startDate: cycle2Start,
      endDate: cycle2End,
      flowIntensity: [
        { date: cycle2Start, level: 'heavy' },
        { date: new Date(cycle2Start.getTime() + 86400000), level: 'medium' },
        { date: new Date(cycle2Start.getTime() + 172800000), level: 'medium' },
        { date: new Date(cycle2Start.getTime() + 259200000), level: 'light' },
        { date: cycle2End, level: 'light' }
      ]
    });

    // 3. Seed daily logs for PCOS Patient (Ananya)
    const logDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      logDates.push(d);
    }

    for (const d of logDates) {
      // Mood log (random 2-5)
      await Log.create({
        userId: patientPcos._id,
        type: 'mood',
        date: d,
        value: Math.floor(Math.random() * 4) + 2,
        note: 'Feeling alright, tracking standard energy levels.'
      });

      // Hydration log (random 1500 - 2500 ml)
      await Log.create({
        userId: patientPcos._id,
        type: 'hydration',
        date: d,
        value: Math.floor(Math.random() * 1000) + 1500,
        note: 'Logged water intake'
      });

      // Pain symptom logs (intensity 2-4)
      await Log.create({
        userId: patientPcos._id,
        type: 'symptom',
        date: d,
        value: { symptom: 'pain', intensity: Math.floor(Math.random() * 3) + 2 },
        note: 'Mild lower back pain/cramps'
      });
    }

    console.log('Seeded cycle history and logs for PCOS Patient.');

    // 4. Seed Consents
    // Ananya shares cycle phase and mood summary with partner Rohan
    const consentPartner = await Consent.create({
      ownerId: patientPcos._id,
      granteeId: partner._id,
      scope: ['cycle_phase', 'mood_summary'],
      status: 'active'
    });

    // Ananya shares cycle phase, mood summary, and symptom trends with Doctor Meera
    const consentDoctor = await Consent.create({
      ownerId: patientPcos._id,
      granteeId: doctor._id,
      scope: ['cycle_phase', 'mood_summary', 'symptom_trends'],
      status: 'active'
    });

    // Link consents in patient profile
    patientPcos.linkedAccounts = [
      { userId: partner._id, relationship: 'partner', consentScope: ['cycle_phase', 'mood_summary'] },
      { userId: doctor._id, relationship: 'doctor', consentScope: ['cycle_phase', 'mood_summary', 'symptom_trends'] }
    ];
    await patientPcos.save();

    // Link patient in grantee profile
    partner.linkedAccounts = [
      { userId: patientPcos._id, relationship: 'patient', consentScope: ['cycle_phase', 'mood_summary'] }
    ];
    await partner.save();

    doctor.linkedAccounts = [
      { userId: patientPcos._id, relationship: 'patient', consentScope: ['cycle_phase', 'mood_summary', 'symptom_trends'] }
    ];
    await doctor.save();

    console.log('Seeded data sharing consents.');

    // 5. Seed Community Threads & Replies
    const threadPcos = await Thread.create({
      authorId: patientPcos._id,
      category: 'pcos',
      title: 'Managing PCOS fatigue and brain fog?',
      body: 'Hi everyone, I was diagnosed with PCOS 6 months ago. Lately, I have been dealing with crazy brain fog and fatigue in the afternoons. Does anyone have supplement or diet recommendations that worked for them?'
    });

    await Reply.create({
      threadId: threadPcos._id,
      authorId: doctor._id,
      body: 'Hello Ananya. Afternoon fatigue can often be linked to insulin spikes and crashes. Trying a high-protein breakfast and incorporating spearmint tea or inositol can stabilize glucose. Ensure you talk with your doctor before starting any new routine.'
    });

    await Reply.create({
      threadId: threadPcos._id,
      authorId: patientEndo._id,
      body: 'I second the protein tip! Swapping simple carbs for lentils and eggs in the morning helped cut down my mid-day slumps.'
    });

    const threadEndo = await Thread.create({
      authorId: patientEndo._id,
      category: 'endometriosis',
      title: 'Tips for managing flare-ups at work?',
      body: 'I have a desk job and during flare-ups, sitting for 8 hours is unbearable. What travel-friendly remedies do you recommend?'
    });

    await Reply.create({
      threadId: threadEndo._id,
      authorId: patientPcos._id,
      body: 'A cordless heating pad that clips around your waist is a lifesaver! I wear one under my sweater at my office.'
    });

    // 6. Seed Partner Messages and Leaves

    await PartnerMessage.create({
      senderId: patientPcos._id,
      recipientId: partner._id,
      body: "Hi Rohan! I logged my mood and cycle phase today. Check your Support tips widget!"
    });

    await PartnerMessage.create({
      senderId: partner._id,
      recipientId: patientPcos._id,
      body: "Got it! I see you are on Day 10 in your follicular phase. I'll pick up complex carbs for dinner tonight."
    });

    await LeaveLog.create({
      userId: patientPcos._id,
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      reason: "Menstrual Cramps & Severe Fatigue",
      status: "approved"
    });

    console.log('Seeded community threads, replies, leave logs, and partner chats.');

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seed();
