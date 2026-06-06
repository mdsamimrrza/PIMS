const mongoose = require('mongoose');
const Admission = require('../models/Admission.model');
const Bed = require('../models/Bed.model');
const Patient = require('../models/Patient.model');
const User = require('../models/User.model');
const billingService = require('./billing.service');

/**
 * Create a new admission and mark bed as occupied
 */
const createAdmission = async (actorId, data) => {
  const { patientRef, bedRef, assignedDoctor, priority, diagnosis, notes } = data;

  // 1. Verify patient exists
  const patient = await Patient.findById(patientRef);
  if (!patient) {
    const error = new Error('Patient not found');
    error.status = 404;
    throw error;
  }

  // 2. Verify bed exists and is available
  const bed = await Bed.findById(bedRef);
  if (!bed) {
    const error = new Error('Bed not found');
    error.status = 404;
    throw error;
  }
  if (bed.status !== 'available') {
    const error = new Error(`Bed ${bed.bedCode} is not available. Status: ${bed.status}`);
    error.status = 409;
    throw error;
  }

  // 3. Verify doctor exists and has clinical role
  const doctor = await User.findById(assignedDoctor);
  if (!doctor || doctor.role !== 'doctor') {
    const error = new Error('Assigned doctor not found or invalid role');
    error.status = 400;
    throw error;
  }

  // 4. Verify no active admission for patient
  const activeAdmission = await Admission.findOne({ patientRef, status: 'active' });
  if (activeAdmission) {
    const error = new Error(`Patient already has active admission ${activeAdmission.admissionId}`);
    error.status = 409;
    throw error;
  }

  // 5. Create Admission document
  const session = await Admission.startSession();
  session.startTransaction();
  try {
    const admission = new Admission({
      patientRef,
      bedRef,
      assignedDoctor,
      admittedBy: actorId,
      priority: priority || 'routine',
      diagnosis,
      notes,
      status: 'active'
    });

    await admission.save({ session });

    // 6. Update bed: status -> 'occupied', currentAdmission -> admission._id
    bed.status = 'occupied';
    bed.currentAdmission = admission._id;
    await bed.save({ session });

    await session.commitTransaction();
    session.endSession();

    return await Admission.findById(admission._id)
      .populate('patientRef', 'firstName lastName uhid')
      .populate('bedRef', 'bedCode ward')
      .populate('assignedDoctor', 'firstName lastName');
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Get admission by ID or admissionId string
 */
const getAdmission = async (id) => {
  const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { admissionId: id };
  const admission = await Admission.findOne(query)
    .populate('patientRef', 'firstName lastName uhid bloodGroup allergies')
    .populate('bedRef', 'bedCode ward type pricePerDay')
    .populate('assignedDoctor', 'firstName lastName role')
    .populate('admittedBy', 'firstName lastName role');

  if (!admission) {
    const error = new Error('Admission not found');
    error.status = 404;
    throw error;
  }
  return admission;
};

/**
 * Get paginated list of active admissions with filters
 */
const getActiveAdmissions = async ({ ward, priority, page = 1, limit = 20 }) => {
  const query = { status: 'active' };
  
  if (priority) query.priority = priority;
  
  // If ward filter, we need to find bed IDs in that ward
  if (ward) {
    const bedsInWard = await Bed.find({ ward }).select('_id');
    query.bedRef = { $in: bedsInWard.map(b => b._id) };
  }

  const total = await Admission.countDocuments(query);
  const admissions = await Admission.find(query)
    .populate('patientRef', 'firstName lastName uhid')
    .populate('bedRef', 'bedCode ward')
    .populate('assignedDoctor', 'firstName lastName')
    .sort({ priority: -1, admittedAt: 1 }) // priority 'emergency' should be first if enum/weighting matches
    .skip((page - 1) * limit)
    .limit(limit);

  return { admissions, total, page, limit };
};

/**
 * Discharge patient, free bed, and trigger billing
 */
const dischargePatient = async (admissionId, actorId, { notes, dischargeType } = {}) => {
  const admission = await Admission.findById(admissionId);
  if (!admission) {
    const error = new Error('Admission not found');
    error.status = 404;
    throw error;
  }

  if (admission.status !== 'active') {
    const error = new Error('Patient is not currently admitted');
    error.status = 400;
    throw error;
  }

  admission.status = 'discharged';
  admission.dischargedAt = new Date();
  admission.dischargedBy = actorId;
  if (notes) admission.notes = (admission.notes ? admission.notes + '\n' : '') + `Discharge Notes: ${notes}`;

  const bed = await Bed.findById(admission.bedRef);
  if (bed) {
    bed.status = 'cleaning';
    bed.currentAdmission = null;
  }

  // 5. Trigger billing (non-blocking)
  try {
    if (billingService.generateInvoice) {
      await billingService.generateInvoice(admission._id);
    }
  } catch (err) {
    console.error('Billing generation failed during discharge:', err);
  }

  await admission.save();
  if (bed) await bed.save();

  return admission;
};

/**
 * Get all admissions for a patient
 */
const getAdmissionsByPatient = async (patientRef) => {
  return await Admission.find({ patientRef })
    .sort({ admittedAt: -1 })
    .populate('bedRef', 'bedCode ward')
    .populate('assignedDoctor', 'firstName lastName');
};

module.exports = {
  createAdmission,
  getAdmission,
  getActiveAdmissions,
  dischargePatient,
  getAdmissionsByPatient
};
