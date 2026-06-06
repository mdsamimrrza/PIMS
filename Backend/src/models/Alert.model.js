const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['LOW_STOCK', 'NEAR_EXPIRY', 'EXPIRED', 'EMAIL_FAILURE'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'WARNING', 'INFO'],
      required: true,
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      default: null,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isAcknowledged: {
      type: Boolean,
      default: false,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ isAcknowledged: 1, severity: 1, createdAt: -1 });
alertSchema.index({ type: 1, medicineId: 1, isAcknowledged: 1 });

alertSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema);

module.exports = Alert;
