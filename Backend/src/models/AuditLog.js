const mongoose = require('mongoose');

const REDACTED_FIELDS = [
  'passwordHash',
  'password',
  'token',
  'refreshToken',
  'resetToken',
  'otp',
  'setupToken',
  'passwordResetTokenHash',
  'passwordResetToken',
  'resetUrl',
  'activationUrl',
  'inviteLink',
];

/**
 * sanitizeDiff - Strips sensitive fields from before/after objects.
 */
function sanitizeDiff(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = Array.isArray(obj) ? [...obj] : { ...obj };
  
  if (Array.isArray(clean)) {
    return clean.map(item => sanitizeDiff(item));
  }

  for (const field of REDACTED_FIELDS) {
    if (field in clean) clean[field] = '[REDACTED]';
  }

  // Recursive sanitization for nested objects
  for (const key in clean) {
    if (typeof clean[key] === 'object' && clean[key] !== null) {
      clean[key] = sanitizeDiff(clean[key]);
    }
  }

  return clean;
}

const AuditLogSchema = new mongoose.Schema({
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  actor: {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: false // Allow null for login failures
    },
    name: { type: String, required: true },
    role: { type: String, required: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null }
  },
  action: { 
    type: String, 
    required: true, 
    index: true 
  },
  module: { 
    type: String, 
    required: true, 
    index: true,
    enum: [
      'admission', 'billing', 'prescription', 'user', 
      'patient', 'vitals', 'inventory', 'emergency', 
      'bed', 'system'
    ] 
  },
  resource: {
    collection: { type: String, required: true },
    docId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true, 
      index: true 
    }
  },
  diff: {
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  sessionId: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null }
});

// INDEXES
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ 'actor.userId': 1, timestamp: -1 });
AuditLogSchema.index({ module: 1, timestamp: -1 });
AuditLogSchema.index({ 'resource.docId': 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, module: 1 });

// TTL index: Expire records after 7 years
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 220752000 });

// APPEND-ONLY ENFORCEMENT
AuditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('AuditLog is append-only. Updates are not permitted on audit records.');
});
AuditLogSchema.pre('updateOne', function() {
  throw new Error('AuditLog is append-only.');
});
AuditLogSchema.pre('updateMany', function() {
  throw new Error('AuditLog is append-only.');
});
AuditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('AuditLog records cannot be deleted.');
});
AuditLogSchema.pre('deleteOne', function() {
  throw new Error('AuditLog records cannot be deleted.');
});
AuditLogSchema.pre('deleteMany', function() {
  throw new Error('AuditLog records cannot be deleted.');
});

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

module.exports = {
  AuditLog,
  sanitizeDiff
};
