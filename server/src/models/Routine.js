import mongoose from 'mongoose';

const routineItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, required: true }, // e.g., 'diet', 'exercise', 'meditation', 'medication'
  completed: { type: Boolean, default: false },
  rationale: { type: String, required: true }
}, { _id: false });

const routineSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true
  },
  items: [routineItemSchema],
  generatedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Ensure a user has only one routine per day
routineSchema.index({ userId: 1, date: 1 }, { unique: true });

const Routine = mongoose.model('Routine', routineSchema);
export default Routine;
