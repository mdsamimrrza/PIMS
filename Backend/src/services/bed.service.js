const Bed = require('../models/Bed.model');

/**
 * Get all beds grouped by ward, populating current patient name if occupied
 */
const getBedLayout = async () => {
  const beds = await Bed.find()
    .populate({
      path: 'currentAdmission',
      select: 'patientRef',
      populate: { path: 'patientRef', select: 'firstName lastName' },
    })
    .sort({ ward: 1, room: 1, bedCode: 1 });

  return beds.reduce((acc, bed) => {
    const ward = bed.ward || 'Other';
    if (!acc[ward]) acc[ward] = [];
    acc[ward].push(bed);
    return acc;
  }, {});
};

/**
 * Get available beds, optionally filtered by ward
 */
const getAvailableBeds = async (ward = null) => {
  const query = { status: 'available' };
  if (ward) query.ward = ward;
  return await Bed.find(query).sort({ bedCode: 1 });
};

/**
 * Update bed status with transition validation
 * Note: available -> occupied transition is handled by createAdmission only
 */
const updateBedStatus = async (bedId, status, actorId = null) => {
  const bed = await Bed.findById(bedId);
  if (!bed) {
    const error = new Error('Bed not found');
    error.status = 404;
    throw error;
  }

  const currentStatus = bed.status;
  const targetStatus = status.toLowerCase();

  // Transition validation
  if (targetStatus === 'occupied' && currentStatus !== 'occupied') {
    const error = new Error('Beds can only be marked as occupied via the Admission process');
    error.status = 400;
    throw error;
  }

  if (currentStatus === 'occupied' && targetStatus === 'available') {
    const error = new Error('Occupied beds must be discharged first, which moves them to cleaning');
    error.status = 400;
    throw error;
  }

  if (currentStatus === 'cleaning' && targetStatus === 'occupied') {
    const error = new Error('Beds must be marked as available before they can be occupied');
    error.status = 400;
    throw error;
  }

  // Admin/Nurse only transitions would be handled at route level, 
  // but logic here ensures state integrity
  
  bed.status = targetStatus;
  if (targetStatus === 'available' || targetStatus === 'cleaning') {
    bed.lastSanitizedAt = new Date();
  }

  await bed.save();
  return bed;
};

/**
 * Get beds waiting for sanitization
 */
const getSanitizationQueue = async () => {
  return await Bed.find({ status: 'cleaning' })
    .sort({ lastSanitizedAt: 1 });
};

module.exports = {
  getBedLayout,
  getAvailableBeds,
  updateBedStatus,
  getSanitizationQueue
};
