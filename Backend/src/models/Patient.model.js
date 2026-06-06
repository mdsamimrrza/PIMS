const mongoose = require('mongoose');
const { Sequence } = require('./Sequence.model');

const allergySchema = new mongoose.Schema(
  {
    substance: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['Severe', 'Moderate', 'Mild'],
      default: 'Mild',
    },
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    uhid: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    patientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Other',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
    },
    weight: {
      type: Number,
      min: 0,
      default: null,
    },
    allergies: {
      type: [allergySchema],
      default: [],
    },
    medicalHistory: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      name: { type: String, trim: true, default: '' },
      relation: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
    },
    nextOfKin: {
      name: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      relation: { type: String, trim: true, default: '' },
    },
    insuranceDetails: {
      provider: { type: String, trim: true, default: '' },
      policyNumber: { type: String, trim: true, default: '' },
      validUntil: { type: Date, default: null },
    },
    consentSigned: {
      type: Boolean,
      default: false,
    },
    isDeceased: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

patientSchema.pre('save', async function (next) {
  if (this.isNew && !this.uhid) {
    const year = new Date().getFullYear();
    const sequence = await Sequence.findOneAndUpdate(
      { name: 'patient_uhid' },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    this.uhid = `P${year}${String(sequence.value).padStart(5, '0')}`;
  }
  next();
});

patientSchema.index({ name: 'text', patientId: 1, uhid: 1 });

patientSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);

module.exports = Patient;
