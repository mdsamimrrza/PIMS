const mongoose = require('mongoose');
const Patient = require('../models/Patient.model');
const Prescription = require('../models/Prescription.model');
const Medicine = require('../models/Medicine.model');
const User = require('../models/User.model');
const { createPatient, createPatientPortalAccount } = require('./patient.service');
const { consumeInventoryForPrescriptionItems } = require('./inventory.service');
const { sendPrescriptionNotificationEmail } = require('./email.service');
const { ROLES } = require('../utils/constants');
const { buildPagination, getPagination } = require('../utils/pagination');
const { logAudit } = require('../utils/auditLogger');
const { PRESCRIPTION } = require('../constants/auditActions');

const PRESCRIPTION_STATUSES = ['Draft', 'Pending', 'Processing', 'Filled', 'Cancelled'];
const PHARMACIST_ALLOWED_STATUSES = ['Processing', 'Filled', 'Cancelled'];

const getPrimaryClientOrigin = () => {
  const allOrigins = String(process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => String(url || '').trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return allOrigins.find((url) => !url.includes('localhost')) || allOrigins[0] || '';
};

const prescriptionNotFound = () => {
  const error = new Error('Prescription not found');
  error.statusCode = 404;
  return error;
};

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const forbiddenError = (message) => {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ensureObjectId = (value, label) => {
  if (!mongoose.isValidObjectId(value)) {
    throw validationError(`Invalid ${label}`);
  }
};

const generateRxId = async () => {
  const total = await Prescription.countDocuments();
  return `RX-${String(total + 9001).padStart(4, '0')}`;
};

const buildDigitalSignature = (doctor) => {
  const nameSeed = String(doctor?.lastName || doctor?.firstName || 'PIMS')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6) || 'PIMS';

  return `DSIG-${nameSeed}-${Date.now().toString().slice(-4)}`;
};

const normalizeAtcCode = (value) => String(value || '').trim().toUpperCase();

const normalizePrescriptionItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw validationError('At least one prescription item is required');
  }

  const normalizedItems = [];

  for (const item of items) {
    if (!item?.dose || !item?.frequency) {
      throw validationError('Each prescription item requires dose and frequency');
    }

    let medicine = null;

    if (item.medicineId) {
      ensureObjectId(item.medicineId, 'medicineId');
      medicine = await Medicine.findById(item.medicineId);

      if (!medicine) {
        throw validationError('Referenced medicine not found');
      }
    }

    const atcCode = normalizeAtcCode(item.atcCode || medicine?.atcCode);

    if (!atcCode) {
      throw validationError('Each prescription item requires an atcCode or valid medicineId');
    }

    normalizedItems.push({
      medicineId: medicine?._id || null,
      atcCode,
      dose: String(item.dose).trim(),
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      frequency: String(item.frequency).trim(),
      route: String(item.route || 'Oral').trim(),
      durationDays: Number(item.durationDays) > 0 ? Number(item.durationDays) : 1,
      instructions: String(item.instructions || '').trim(),
    });
  }

  return normalizedItems;
};

const getPatientIdForActor = async (actor) => {
  const userId = actor?.id || actor?._id;

  if (!userId) {
    throw forbiddenError('Patient account is not linked to a patient record');
  }

  const patient = await Patient.findOne({ userId });

  if (!patient) {
    throw forbiddenError('Patient account is not linked to a patient record');
  }

  return patient._id;
};

const getPrescriptionQuery = async (actor, filters = {}) => {
  const query = {};

  if (actor?.role === ROLES.DOCTOR) {
    query.doctorId = actor.id || actor._id;
  } else if (actor?.role === ROLES.PATIENT) {
    query.patientId = await getPatientIdForActor(actor);
  } else if (filters.doctorId) {
    query.doctorId = filters.doctorId;
  }

  if (filters.status && PRESCRIPTION_STATUSES.includes(filters.status)) {
    query.status = filters.status;
  }

  if (filters.patientId) {
    query.patientId = filters.patientId;
  }

  if (filters.isUrgent === 'true') {
    query.isUrgent = true;
  }

  if (filters.isUrgent === 'false') {
    query.isUrgent = false;
  }

  if (filters.q) {
    query.rxId = { $regex: escapeRegex(String(filters.q).trim()), $options: 'i' };
  }

  return query;
};

const populatePrescriptionQuery = (query) =>
  query
    .populate('patientId', 'patientId name dob gender allergies medicalHistory weight userId')
    .populate('patientId.userId', 'firstName lastName email role lastLogin')
    .populate('doctorId', 'firstName lastName email role')
    .populate('items.medicineId', 'name genericName brand atcCode strength dosageForm');

const listPrescriptions = async (actor, filters = {}) => {
  const { page, limit, skip } = getPagination(filters);
  const query = await getPrescriptionQuery(actor, filters);

  // Pharmacists get special priority sorting
  if (actor?.role === ROLES.PHARMACIST) {
    const pipeline = [
      { $match: query },
      {
        $addFields: {
          priorityWeight: {
            $switch: {
              branches: [
                { case: { $eq: ['$priority', 'emergency'] }, then: 1 },
                { case: { $eq: ['$priority', 'stat'] }, then: 2 },
                { case: { $eq: ['$priority', 'urgent'] }, then: 3 },
                { case: { $eq: ['$priority', 'routine'] }, then: 4 }
              ],
              default: 5
            }
          }
        }
      },
      { $sort: { priorityWeight: 1, createdAt: 1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const [prescriptions, total] = await Promise.all([
      Prescription.aggregate(pipeline),
      Prescription.countDocuments(query),
    ]);

    // Re-populate because aggregate doesn't do it
    const populated = await Prescription.populate(prescriptions, [
      { path: 'patientId', select: 'patientId name dob gender allergies medicalHistory weight userId' },
      { path: 'doctorId', select: 'firstName lastName email role' },
      { path: 'items.medicineId', select: 'name genericName brand atcCode strength dosageForm' }
    ]);

    return {
      prescriptions: populated,
      pagination: buildPagination({ page, limit, total }),
    };
  }

  // Default sorting for other roles
  const [prescriptions, total] = await Promise.all([
    populatePrescriptionQuery(Prescription.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Prescription.countDocuments(query),
  ]);

  return {
    prescriptions,
    pagination: buildPagination({ page, limit, total }),
  };
};

const getPrescriptionById = async (id, actor) => {
  ensureObjectId(id, 'prescription id');

  const query = { _id: id };

  if (actor?.role === ROLES.DOCTOR) {
    query.doctorId = actor.id || actor._id;
  } else if (actor?.role === ROLES.PATIENT) {
    query.patientId = await getPatientIdForActor(actor);
  }

  const prescription = await populatePrescriptionQuery(Prescription.findOne(query));

  if (!prescription) {
    throw prescriptionNotFound();
  }

  return prescription;
};

const createPrescription = async (payload, actor) => {
  ensureObjectId(payload.doctorId, 'doctorId');

  const isDraft = Boolean(payload.isDraft);

  if (!isDraft && (!Array.isArray(payload.items) || payload.items.length === 0)) {
    throw validationError('At least one prescription item is required');
  }

  const normalizedItems = isDraft && (!payload.items || payload.items.length === 0)
    ? []
    : await normalizePrescriptionItems(payload.items);
  let patient = null;
  let patientPortal = null;

  if (payload.patientId) {
    ensureObjectId(payload.patientId, 'patientId');
    patient = await Patient.findById(payload.patientId);

    const existingPatientEmail = String(payload.patientEmail || payload.patient?.email || '').trim().toLowerCase();

    if (patient && !patient.userId && existingPatientEmail) {
      try {
        patientPortal = await createPatientPortalAccount(patient._id, {
          firstName: payload.patient?.firstName,
          lastName: payload.patient?.lastName,
          email: existingPatientEmail,
        });
      } catch (error) {
        console.warn(`Failed to create patient portal for existing patient: ${error.message}`);
      }
    }
  } else {
    const sourcePatient = payload.patient || {};
    if (!String(sourcePatient.name || '').trim() || !String(sourcePatient.dob || '').trim() || !String(sourcePatient.email || '').trim()) {
      throw validationError('New patient name, dob, and email are required');
    }

    const normalizedEmail = String(sourcePatient.email || '').trim().toLowerCase();
    const existingPortalUser = await User.findOne({ email: normalizedEmail });

    if (existingPortalUser) {
      if (existingPortalUser.role !== ROLES.PATIENT) {
        throw validationError(`Email "${normalizedEmail}" is already used by a ${existingPortalUser.role} account. Please use a different email for the patient portal.`);
      }

      const linkedPatient = await Patient.findOne({ userId: existingPortalUser._id });

      if (!linkedPatient) {
        throw validationError(`Patient account for "${normalizedEmail}" exists but is not properly linked. Please contact an administrator to fix this account link.`);
      }

      patient = linkedPatient;
      patientPortal = {
        patient: linkedPatient,
        user: existingPortalUser,
        access: {
          email: existingPortalUser.email,
          loginUrl: getPrimaryClientOrigin() ? `${getPrimaryClientOrigin()}/patient/login` : '/patient/login',
          passwordSetupRequired: true,
        },
      };
    } else {
      patient = await createPatient({
        patientId: sourcePatient.patientId,
        name: sourcePatient.name,
        dob: sourcePatient.dob,
        gender: sourcePatient.gender,
        allergies: sourcePatient.allergies,
        medicalHistory: sourcePatient.medicalHistory,
      });

      try {
        patientPortal = await createPatientPortalAccount(patient._id, {
          firstName: sourcePatient.firstName,
          lastName: sourcePatient.lastName,
          email: normalizedEmail,
        });
      } catch (error) {
        console.warn(`Failed to create patient portal for new patient: ${error.message}`);
      }
    }
  }

  const doctor = await User.findById(payload.doctorId);

  if (!patient) {
    throw validationError('Patient not found');
  }

  if (!doctor || !doctor.isActive || doctor.role !== ROLES.DOCTOR) {
    throw validationError('Doctor not found');
  }

  const prescription = await Prescription.create({
    rxId: await generateRxId(),
    patientId: patient._id,
    doctorId: doctor._id,
    diagnosis: String(payload.diagnosis || '').trim(),
    items: normalizedItems,
    status: isDraft ? 'Draft' : 'Pending',
    isUrgent: Boolean(payload.isUrgent),
    allowRefills:
      Number(payload.allowRefills) >= 0 && Number(payload.allowRefills) <= 3
        ? Number(payload.allowRefills)
        : 0,
    digitalSignature: isDraft ? '' : String(payload.digitalSignature || buildDigitalSignature(doctor)).trim(),
    pdfUrl: String(payload.pdfUrl || '').trim(),
  });

  // Global Audit
  if (actor) {
    logAudit({
      actor,
      action: PRESCRIPTION.CREATED,
      module: 'prescription',
      resource: { collection: 'Prescription', docId: prescription._id },
      diff: { 
        after: { 
          patientRef: patient._id, 
          medicinesCount: normalizedItems.length, 
          doctorRef: doctor._id 
        } 
      }
    });
  }

  // Send emails asynchronously
  if (!isDraft) {
    if (process.env.PHARMACY_NOTIFICATION_EMAIL) {
      setImmediate(() => {
        sendPrescriptionNotificationEmail({
          to: process.env.PHARMACY_NOTIFICATION_EMAIL,
          rxId: prescription.rxId,
          patientName: patient.name,
          doctorName: `${doctor.firstName} ${doctor.lastName}`.trim(),
          isUrgent: prescription.isUrgent,
        }).catch((error) => {
          console.warn(`Failed to send pharmacy notification for ${prescription.rxId}: ${error.message}`);
        });
      });
    }

    if (patient.userId) {
      const patientUser = await User.findById(patient.userId);
      if (patientUser?.email) {
        setImmediate(() => {
          sendPrescriptionNotificationEmail({
            to: patientUser.email,
            rxId: prescription.rxId,
            patientName: patient.name,
            doctorName: `${doctor.firstName} ${doctor.lastName}`.trim(),
            isUrgent: prescription.isUrgent,
          }).catch((error) => {
            console.warn(`Failed to send patient notification for ${prescription.rxId}: ${error.message}`);
          });
        });
      }
    }
  }

  const responsePrescription = await getPrescriptionById(prescription._id, { role: ROLES.PHARMACIST });

  return {
    prescription: responsePrescription,
    patientPortal: patientPortal
      ? {
          patient: patientPortal.patient,
          user: patientPortal.user,
          access: patientPortal.access,
        }
      : null,
  };
};

const updatePrescriptionStatus = async (id, status, actor = null) => {
  ensureObjectId(id, 'prescription id');

  if (!PHARMACIST_ALLOWED_STATUSES.includes(status)) {
    throw validationError(
      `Invalid prescription status. Allowed values: ${PHARMACIST_ALLOWED_STATUSES.join(', ')}`
    );
  }

  const existingPrescription = await Prescription.findById(id).lean();

  if (!existingPrescription) {
    throw prescriptionNotFound();
  }

  if (existingPrescription.status === status) {
    return getPrescriptionById(id, { role: ROLES.PHARMACIST });
  }

  const before = { status: existingPrescription.status };

  const prescription = await Prescription.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!prescription) {
    throw prescriptionNotFound();
  }

  // Global Audit
  if (actor) {
    let action = PRESCRIPTION.UPDATED;
    if (status === 'Filled') action = PRESCRIPTION.FILLED;
    if (status === 'Cancelled') action = PRESCRIPTION.CANCELLED;

    logAudit({
      actor,
      action,
      module: 'prescription',
      resource: { collection: 'Prescription', docId: prescription._id },
      diff: { 
        before,
        after: { 
          status,
          filledBy: status === 'Filled' ? actor.userId : undefined,
          filledAt: status === 'Filled' ? new Date() : undefined
        } 
      }
    });
  }

  if (status === 'Filled' && existingPrescription.status !== 'Filled') {
    try {
      await consumeInventoryForPrescriptionItems(existingPrescription.items);
    } catch (error) {
      await Prescription.findByIdAndUpdate(
        id,
        { status: existingPrescription.status },
        { new: true, runValidators: true }
      );
      throw error;
    }
  }

  return getPrescriptionById(prescription._id, { role: ROLES.PHARMACIST });
};

const updateDraftPrescription = async (id, payload, actor) => {
  ensureObjectId(id, 'prescription id');

  const existing = await Prescription.findOne({
    _id: id,
    doctorId: actor.id || actor._id,
    status: 'Draft',
  }).lean();

  if (!existing) {
    throw validationError('Draft prescription not found or you do not have permission to edit it');
  }

  const isSubmitting = payload.submit === true;
  const normalizedItems = payload.items && payload.items.length > 0
    ? await normalizePrescriptionItems(payload.items)
    : existing.items;

  if (isSubmitting && normalizedItems.length === 0) {
    throw validationError('At least one prescription item is required to submit a prescription');
  }

  const doctor = await User.findById(actor.id || actor._id);
  const updates = {
    diagnosis: payload.diagnosis !== undefined ? String(payload.diagnosis || '').trim() : existing.diagnosis,
    items: normalizedItems,
    isUrgent: payload.isUrgent !== undefined ? Boolean(payload.isUrgent) : existing.isUrgent,
    allowRefills: payload.allowRefills !== undefined
      ? (Number(payload.allowRefills) >= 0 && Number(payload.allowRefills) <= 3 ? Number(payload.allowRefills) : existing.allowRefills)
      : existing.allowRefills,
    status: isSubmitting ? 'Pending' : 'Draft',
    digitalSignature: isSubmitting ? buildDigitalSignature(doctor) : '',
  };

  const updated = await Prescription.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

  if (!updated) {
    throw prescriptionNotFound();
  }

  // Global Audit
  logAudit({
    actor,
    action: isSubmitting ? PRESCRIPTION.CREATED : PRESCRIPTION.UPDATED,
    module: 'prescription',
    resource: { collection: 'Prescription', docId: updated._id },
    diff: { before: existing, after: updated.toJSON() }
  });

  if (isSubmitting) {
    if (process.env.PHARMACY_NOTIFICATION_EMAIL) {
      setImmediate(async () => {
        try {
          const patient = await Patient.findById(updated.patientId).lean();
          await sendPrescriptionNotificationEmail({
            to: process.env.PHARMACY_NOTIFICATION_EMAIL,
            rxId: updated.rxId,
            patientName: patient?.name || 'Patient',
            doctorName: `${doctor.firstName} ${doctor.lastName}`.trim(),
            isUrgent: updated.isUrgent,
          });
        } catch (err) {
          console.warn(`Notification email failed for ${updated.rxId}: ${err.message}`);
        }
      });
    }

    const patient = await Patient.findById(existing.patientId);
    if (patient?.userId) {
      const patientUser = await User.findById(patient.userId);
      if (patientUser?.email) {
        setImmediate(() => {
          sendPrescriptionNotificationEmail({
            to: patientUser.email,
            rxId: updated.rxId,
            patientName: patient.name,
            doctorName: `${doctor.firstName} ${doctor.lastName}`.trim(),
            isUrgent: updated.isUrgent,
          }).catch((error) => {
            console.warn(`Failed to send patient notification for ${updated.rxId}: ${error.message}`);
          });
        });
      }
    }
  }

  return getPrescriptionById(updated._id, { role: ROLES.DOCTOR });
};

module.exports = {
  listPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescriptionStatus,
  updateDraftPrescription
};
