import mongoose from 'mongoose';

const consentSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  granteeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  scope: [{
    type: String,
    enum: ['cycle_phase', 'hydration', 'mood_summary', 'symptom_trends', 'medication_reminders', 'red_flags']
  }],
  status: {
    type: String,
    enum: ['active', 'revoked'],
    default: 'active'
  },
  revokedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Ensure compound uniqueness for owner-grantee relationships
consentSchema.index({ ownerId: 1, granteeId: 1 }, { unique: true });

const Consent = mongoose.model('Consent', consentSchema);
export default Consent;
