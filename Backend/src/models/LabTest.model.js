const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Pathology', 'Radiology', 'Cardiology', 'Other'],
      default: 'Pathology',
    },
    status: {
      type: String,
      enum: ['Ordered', 'Sample Collected', 'Testing', 'Completed', 'Cancelled'],
      default: 'Ordered',
    },
    resultSummary: {
      type: String,
      default: '',
      trim: true, // Simple text result
    },
    documentUrl: {
      type: String,
      default: null, // Simple document upload for now
      trim: true,
    },
    // Future proofing for full lab module
    sampleId: {
      type: String,
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // LAB_TECH
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

labTestSchema.index({ patientId: 1, createdAt: -1 });
labTestSchema.index({ status: 1 });

labTestSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const LabTest = mongoose.models.LabTest || mongoose.model('LabTest', labTestSchema);

module.exports = LabTest;
