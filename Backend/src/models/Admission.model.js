const mongoose = require('mongoose');
const { getNextSequence } = require('./Sequence.model');

const admissionSchema = new mongoose.Schema(
  {
    admissionId: {
      type: String,
      unique: true,
    },
    patientRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    bedRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bed',
      required: true,
    },
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    admittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'emergency'],
      default: 'routine',
    },
    status: {
      type: String,
      enum: ['active', 'discharged', 'cancelled'],
      default: 'active',
      index: true,
    },
    admittedAt: {
      type: Date,
      default: Date.now,
    },
    dischargedAt: {
      type: Date,
      default: null,
    },
    dischargedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    diagnosis: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    icd10Codes: [
      {
        code: { type: String },
        description: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate admissionId
admissionSchema.pre('save', async function (next) {
  if (this.isNew && !this.admissionId) {
    const year = new Date().getFullYear();
    const seq = await getNextSequence('admission');
    const paddedSeq = seq.toString().padStart(4, '0');
    this.admissionId = `ADM-${year}-${paddedSeq}`;
  }
  next();
});

admissionSchema.index({ patientRef: 1, status: 1 });
admissionSchema.index({ admittedAt: -1 });

admissionSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Admission = mongoose.models.Admission || mongoose.model('Admission', admissionSchema);

module.exports = Admission;
