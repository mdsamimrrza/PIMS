const mongoose = require('mongoose');

const emergencyVisitSchema = new mongoose.Schema({
  patientRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    default: null
  },
  walkInData: {
    name: { type: String, trim: true },
    age: { type: Number },
    phone: { type: String, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] }
  },
  chiefComplaint: {
    type: String,
    required: true,
    trim: true
  },
  triageScore: {
    type: Number,
    min: 1,
    max: 5,
    index: true
  },
  triageCategory: {
    type: String,
    enum: ['resuscitation', 'emergent', 'urgent', 'less_urgent', 'non_urgent']
  },
  arrivalMode: {
    type: String,
    enum: ['walk_in', 'ambulance', 'transferred', 'referred'],
    required: true
  },
  vitalsOnArrival: {
    bp: {
      systolic: { type: Number },
      diastolic: { type: Number }
    },
    hr: { type: Number },
    spo2: { type: Number },
    temp: { type: Number },
    gcs: { type: Number, min: 3, max: 15 }
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  triageNurse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['waiting', 'in_triage', 'being_treated', 'admitted', 'discharged', 'absconded'],
    default: 'waiting',
    index: true
  },
  disposition: {
    type: String,
    enum: ['discharge', 'admit', 'refer', 'ama', 'deceased'],
    default: null
  },
  overrideDispenses: [{
    drugRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    qty: { type: Number },
    dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dispensedAt: { type: Date, default: Date.now },
    signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    signedAt: { type: Date, default: null }
  }],
  priority: {
    type: String,
    enum: ['routine', 'urgent', 'stat', 'emergency'],
    default: 'urgent'
  },
  timestamps: {
    arrivedAt: { type: Date, default: Date.now },
    triageAt: { type: Date, default: null },
    doctorSeenAt: { type: Date, default: null },
    dispositionAt: { type: Date, default: null }
  }
}, {
  timestamps: true
});

emergencyVisitSchema.index({ triageScore: 1, 'timestamps.arrivedAt': 1 });

emergencyVisitSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const EmergencyVisit = mongoose.models.EmergencyVisit || mongoose.model('EmergencyVisit', emergencyVisitSchema);

module.exports = EmergencyVisit;
