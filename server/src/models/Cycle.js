import mongoose from 'mongoose';

const flowIntensitySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  level: { type: String, enum: ['light', 'medium', 'heavy'], required: true }
}, { _id: false });

const cycleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    default: null
  },
  flowIntensity: [flowIntensitySchema],
  predictedNextStart: {
    type: Date
  }
}, {
  timestamps: true
});

// Index compound for queries
cycleSchema.index({ userId: 1, startDate: -1 });

const Cycle = mongoose.model('Cycle', cycleSchema);
export default Cycle;
