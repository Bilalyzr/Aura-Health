import mongoose from 'mongoose';

const linkedAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  relationship: { type: String, required: true }, // e.g., 'partner', 'guardian', 'doctor'
  consentScope: [{ type: String }] // e.g., 'cycle_phase', 'mood_summary', 'symptom_trends'
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  userType: {
    type: String,
    enum: ['patient', 'partner', 'guardian', 'doctor', 'admin'],
    default: 'patient'
  },
  conditionTags: [{
    type: String,
    enum: ['pcos', 'endometriosis', 'pmdd']
  }],
  lifeStage: {
    type: String,
    default: ''
  },
  surveyAnswers: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  consentAggregated: {
    type: Boolean,
    default: false
  },
  locale: {
    type: String,
    default: 'en'
  },
  accessibilityAccommodations: [{
    type: String
  }],
  linkedAccounts: [linkedAccountSchema],
  preferences: {
    theme: { type: String, default: 'light' },
    notifications: { type: Boolean, default: true }
  },
  activePairingKey: {
    type: String,
    default: null
  },
  uniqueShareId: {
    type: String,
    unique: true,
    sparse: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  telemetryLogs: [{
    timestamp: { type: Date, default: Date.now },
    sleepHours: Number,
    sleepQuality: String,
    basalBodyTemp: Number,
    hrv: Number,
    source: String
  }],
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Avoid returning password hash in JSON representation
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);
export default User;
