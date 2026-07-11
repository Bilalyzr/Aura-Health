import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['symptom', 'mood', 'hydration', 'exercise', 'medication'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for query performance (e.g., fetching logs for a user on a specific date)
logSchema.index({ userId: 1, type: 1, date: -1 });

const Log = mongoose.model('Log', logSchema);
export default Log;
