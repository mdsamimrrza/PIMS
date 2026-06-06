const { AuditLog, sanitizeDiff } = require('../models/AuditLog');

/**
 * logAudit - Records a mutation event to the global audit log.
 * This is designed to be fire-and-forget and must NOT crash the main flow.
 */
async function logAudit({
  actor,        // { userId, name, role, ip, userAgent }
  action,       // string from auditActions
  module,       // enum e.g. 'admission'
  resource,     // { collection, docId }
  diff,         // { before, after }
  sessionId,    // optional
  metadata      // optional
}) {
  try {
    const entry = new AuditLog({
      actor,
      action,
      module,
      resource,
      diff: {
        before: diff?.before ? sanitizeDiff(diff.before) : null,
        after:  diff?.after  ? sanitizeDiff(diff.after)  : null
      },
      sessionId: sessionId || null,
      metadata:  metadata  || null
    });

    // Fire and forget - do not await in the main request flow if possible
    await entry.save();
  } catch (err) {
    console.error('[AuditLog] Failed to write audit entry:', err.message);
    console.error('[AuditLog] Entry attempted:', { action, module, resource });
  }
}

/**
 * extractActor - Helper to pull audit context from an Express request object.
 */
const extractActor = (req) => {
  const user = req.user || req.session?.user || {};
  const name = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.email || 'System';

  return {
    userId: user.id || user._id || null,
    name,
    role: user.role || 'unknown',
    ip: req.ip || req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null
  };
};

module.exports = {
  logAudit,
  extractActor
};
