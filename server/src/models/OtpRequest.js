import mongoose from 'mongoose';

const otpRequestSchema = new mongoose.Schema({
  originalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  trustedEmail: {
    type: String,
    required: true
  },
  otpCode: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  token: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '15m' } // Automatically delete expired OTP requests after 15 mins
  }
}, {
  timestamps: true
});

const OtpRequest = mongoose.model('OtpRequest', otpRequestSchema);
export default OtpRequest;
