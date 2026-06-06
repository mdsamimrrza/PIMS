const mongoose = require('mongoose');
const thresholds = require('../constants/vitalsThresholds');
const { Schema } = mongoose;

const vitalsSchema = new Schema({
  patientRef: { 
    type: Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true, 
    index: true 
  },
  admissionRef: { 
    type: Schema.Types.ObjectId, 
    ref: 'Admission', 
    required: true, 
    index: true 
  },
  recordedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  vitals: {
    bp: {
      systolic: Number,
      diastolic: Number
    },
    hr:   { type: Number, min: 0, max: 300 },
    spo2: { type: Number, min: 0, max: 100 },
    temp: { type: Number, min: 25, max: 45 },
    rr:   { type: Number, min: 0, max: 100 },
    gcs:  { type: Number, min: 3, max: 15 }
  },
  notes: { 
    type: String, 
    maxLength: 500, 
    trim: true 
  },
  recordedAt: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  alerts: [{
    field: String,
    severity: { type: String, enum: ['warning', 'critical'] },
    message: String
  }],
  isVoided: { 
    type: Boolean, 
    default: false, 
    index: true 
  },
  voidedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  voidedAt: { 
    type: Date, 
    default: null 
  },
  voidReason: { 
    type: String, 
    default: null 
  },
  wardMismatch: { 
    type: Boolean, 
    default: false 
  },
  isBackdated: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

// INDEXES
vitalsSchema.index({ admissionRef: 1, recordedAt: -1 });
vitalsSchema.index({ admissionRef: 1, recordedBy: 1, recordedAt: 1 }, { unique: true });
vitalsSchema.index({ 'alerts.severity': 1, recordedAt: -1 });

// PRE-SAVE HOOK: Compute alerts from thresholds
vitalsSchema.pre('save', function(next) {
  this.alerts = [];
  const v = this.vitals;
  const t = thresholds;

  // HR
  if (v.hr !== undefined) {
    if (v.hr <= t.hr.critLow || v.hr >= t.hr.critHigh) {
      this.alerts.push({ field: 'hr', severity: 'critical', message: `Critical Heart Rate: ${v.hr}` });
    } else if (v.hr <= t.hr.warnLow || v.hr >= t.hr.warnHigh) {
      this.alerts.push({ field: 'hr', severity: 'warning', message: `Warning Heart Rate: ${v.hr}` });
    }
  }

  // SpO2
  if (v.spo2 !== undefined) {
    if (v.spo2 <= t.spo2.critLow) {
      this.alerts.push({ field: 'spo2', severity: 'critical', message: `Critical SpO2: ${v.spo2}%` });
    } else if (v.spo2 <= t.spo2.warnLow) {
      this.alerts.push({ field: 'spo2', severity: 'warning', message: `Warning SpO2: ${v.spo2}%` });
    }
  }

  // Temp
  if (v.temp !== undefined) {
    if (v.temp <= t.temp.critLow || v.temp >= t.temp.critHigh) {
      this.alerts.push({ field: 'temp', severity: 'critical', message: `Critical Temperature: ${v.temp}°C` });
    } else if (v.temp <= t.temp.warnLow || v.temp >= t.temp.warnHigh) {
      this.alerts.push({ field: 'temp', severity: 'warning', message: `Warning Temperature: ${v.temp}°C` });
    }
  }

  // RR
  if (v.rr !== undefined) {
    if (v.rr <= t.rr.critLow || v.rr >= t.rr.critHigh) {
      this.alerts.push({ field: 'rr', severity: 'critical', message: `Critical Respiratory Rate: ${v.rr}` });
    } else if (v.rr <= t.rr.warnLow || v.rr >= t.rr.warnHigh) {
      this.alerts.push({ field: 'rr', severity: 'warning', message: `Warning Respiratory Rate: ${v.rr}` });
    }
  }

  // SBP
  if (v.bp && v.bp.systolic !== undefined) {
    if (v.bp.systolic <= t.sbp.critLow || v.bp.systolic >= t.sbp.critHigh) {
      this.alerts.push({ field: 'sbp', severity: 'critical', message: `Critical Systolic BP: ${v.bp.systolic}` });
    } else if (v.bp.systolic <= t.sbp.warnLow || v.bp.systolic >= t.sbp.warnHigh) {
      this.alerts.push({ field: 'sbp', severity: 'warning', message: `Warning Systolic BP: ${v.bp.systolic}` });
    }
  }

  // GCS
  if (v.gcs !== undefined) {
    if (v.gcs <= t.gcs.critAt) {
      this.alerts.push({ field: 'gcs', severity: 'critical', message: `Critical GCS: ${v.gcs}` });
    } else if (v.gcs <= t.gcs.warnAt) {
      this.alerts.push({ field: 'gcs', severity: 'warning', message: `Warning GCS: ${v.gcs}` });
    }
  }

  next();
});

// QUERY MIDDLEWARE
function excludeVoidedMiddleware(next) {
  if (this._conditions && this._conditions.includeVoided === true) {
    delete this._conditions.includeVoided;
    return next();
  }
  this.where({ isVoided: false });
  next();
}

vitalsSchema.pre('find', excludeVoidedMiddleware);
vitalsSchema.pre('findOne', excludeVoidedMiddleware);

module.exports = mongoose.models.Vitals || mongoose.model('Vitals', vitalsSchema);
