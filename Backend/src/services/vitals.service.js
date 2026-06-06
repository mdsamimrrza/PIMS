const mongoose = require('mongoose');
const Vitals = require('../models/Vitals.model');
const Admission = require('../models/Admission.model');
const Bed = require('../models/Bed.model');
const Alert = require('../models/Alert.model');
const User = require('../models/User.model');

const recordVitals = async (actorId, actorRole, body) => {
  const { admissionRef, patientRef, vitals, notes, recordedAt } = body;

  // 1. Load admission
  const admission = await Admission.findById(admissionRef);
  if (!admission) {
    const err = new Error('Admission not found');
    err.status = 404;
    throw err;
  }
  if (['discharged', 'cancelled'].includes(admission.status.toLowerCase())) {
    const err = new Error(`Cannot record vitals for ${admission.status} admission`);
    err.status = 400;
    throw err;
  }

  // 2. Verify patient matches admission
  if (admission.patientRef.toString() !== patientRef.toString()) {
    const err = new Error('Patient ID does not match admission. Consistency violation.');
    err.status = 400;
    throw err;
  }

  // 3. Check 5-minute duplicate
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentVitals = await Vitals.findOne({
    admissionRef,
    recordedBy: actorId,
    recordedAt: { $gte: fiveMinutesAgo }
  });
  if (recentVitals) {
    const err = new Error(`Duplicate entry. Vitals already recorded at ${recentVitals.recordedAt.toLocaleTimeString()}`);
    err.status = 409;
    throw err;
  }

  // 4. Validate recordedAt
  const now = Date.now();
  const providedTime = recordedAt ? new Date(recordedAt).getTime() : now;
  if (providedTime > now + 10 * 60 * 1000) {
    const err = new Error('Recorded time cannot be in the future');
    err.status = 400;
    throw err;
  }
  const isBackdated = providedTime < now - 60 * 60 * 1000;

  // 5. Ward mismatch check
  let wardMismatch = false;
  if (actorRole === 'nurse') {
    const [bed, user] = await Promise.all([
      Bed.findById(admission.bedRef),
      User.findById(actorId)
    ]);
    if (bed && user?.ward && bed.ward !== user.ward) {
      wardMismatch = true;
      console.warn(`[Vitals] Ward mismatch for nurse ${actorId}: Bed ${bed.ward} vs User ${user.ward}`);
    }
  }

  // 6. Build doc
  const vitalsDoc = new Vitals({
    patientRef,
    admissionRef,
    recordedBy: actorId,
    vitals,
    notes,
    recordedAt: providedTime,
    wardMismatch,
    isBackdated
  });

  // 7. Save with transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const saved = await vitalsDoc.save({ session });
    
    // Create Alert if critical
    const criticalAlerts = saved.alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      await Alert.create([{
        type: 'vitals',
        severity: 'critical',
        message: `Critical Vitals for ${admissionRef}: ${criticalAlerts.map(a => a.field).join(', ')}`,
        patientRef,
        admissionRef,
        metadata: { vitalsId: saved._id }
      }], { session });
    }

    await session.commitTransaction();
    return await saved.populate('recordedBy', 'firstName lastName role');
  } catch (err) {
    await session.abortTransaction();
    
    // Fallback for standalone MongoDB (Error code 20)
    if (err.code === 20 || err.message.includes('transaction')) {
      console.warn('[Vitals] Transaction failed (standalone DB?), falling back to non-atomic save');
      const saved = await vitalsDoc.save();
      const criticalAlerts = saved.alerts.filter(a => a.severity === 'critical');
      if (criticalAlerts.length > 0) {
        await Alert.create({
          type: 'vitals',
          severity: 'critical',
          message: `Critical Vitals for ${admissionRef}: ${criticalAlerts.map(a => a.field).join(', ')}`,
          patientRef,
          admissionRef,
          metadata: { vitalsId: saved._id }
        });
      }
      return await saved.populate('recordedBy', 'firstName lastName role');
    }
    throw err;
  } finally {
    session.endSession();
  }
};

const getVitalsTimeline = async (admissionRef, { limit = 20, before } = {}) => {
  const query = { admissionRef };
  if (before) {
    query.recordedAt = { $lt: new Date(before) };
  }

  const vitals = await Vitals.find(query)
    .sort({ recordedAt: -1 })
    .limit(limit + 1)
    .populate('recordedBy', 'firstName lastName role')
    .lean();

  const hasMore = vitals.length > limit;
  const data = hasMore ? vitals.slice(0, limit) : vitals;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].recordedAt : null;

  return { vitals: data, hasMore, nextCursor };
};

const getLatestVitals = async (admissionRef) => {
  return await Vitals.findOne({ admissionRef })
    .sort({ recordedAt: -1 })
    .populate('recordedBy', 'firstName lastName role')
    .lean();
};

const getAdmissionsWithCriticalVitals = async () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return await Vitals.aggregate([
    { 
      $match: { 
        isVoided: false, 
        'alerts.severity': 'critical', 
        recordedAt: { $gte: yesterday } 
      } 
    },
    { $sort: { recordedAt: -1 } },
    {
      $group: {
        _id: '$admissionRef',
        latestRecordedAt: { $first: '$recordedAt' },
        patientRef: { $first: '$patientRef' }
      }
    },
    {
      $lookup: {
        from: 'patients',
        localField: 'patientRef',
        foreignField: '_id',
        as: 'patient'
      }
    },
    { $unwind: '$patient' },
    { $sort: { latestRecordedAt: -1 } }
  ]);
};

const voidVitals = async (vitalsId, actorId, voidReason) => {
  const vitals = await Vitals.findById(vitalsId);
  if (!vitals) {
    const err = new Error('Vitals record not found');
    err.status = 404;
    throw err;
  }
  if (vitals.isVoided) {
    const err = new Error('Vitals already voided');
    err.status = 409;
    throw err;
  }

  vitals.isVoided = true;
  vitals.voidedBy = actorId;
  vitals.voidedAt = new Date();
  vitals.voidReason = voidReason;
  
  return await vitals.save();
};

module.exports = {
  recordVitals,
  getVitalsTimeline,
  getLatestVitals,
  getAdmissionsWithCriticalVitals,
  voidVitals
};
