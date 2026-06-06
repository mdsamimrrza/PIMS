const crypto = require('crypto');
const Patient = require('../models/Patient.model');
const User = require('../models/User.model');
const { createUser } = require('./user.service');
const { buildPagination, getPagination } = require('../utils/pagination');
const { logAudit } = require('../utils/auditLogger');
const { PATIENT } = require('../constants/auditActions');

const patientNotFound = () => {
  const error = new Error('Patient not found');
  error.statusCode = 404;
  return error;
};

const duplicatePatientError = () => {
  const error = new Error('Patient ID already exists');
  error.statusCode = 409;
  return error;
};

const isDuplicateNullUserIdError = (error) => {
  if (!error || error.code !== 11000) {
    return false;
  }

  return (
    String(error.message || '').includes('userId_1') &&
    String(error.message || '').includes('dup key: { userId: null')
  );
};

const generatePatientId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `PAT-${datePart}-${randomPart}`;
};

const normalizePatientId = (value) => String(value || '').trim().toUpperCase();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeStringArray = (values) =>
  Array.isArray(values)
    ? values
      .map((value) => String(value || '').trim())
      .filter(Boolean)
    : [];

const normalizeAllergies = (values) =>
  Array.isArray(values)
    ? values
      .map((entry) => ({
        substance: String(entry?.substance || '').trim(),
        severity: String(entry?.severity || 'Mild').trim() || 'Mild',
      }))
      .filter((entry) => entry.substance)
    : [];

const normalizeWeight = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : value;
};

const getPrimaryClientOrigin = () => {
  const allOrigins = String(process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => String(url || '').trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return allOrigins.find((url) => !url.includes('localhost')) || allOrigins[0] || '';
};

const buildPatientQuery = (filters = {}) => {
  const query = {};
  const term = String(filters.q || '').trim();

  if (term) {
    const regex = new RegExp(escapeRegex(term), 'i');
    query.$or = [{ patientId: regex }, { name: regex }];
  }

  return query;
};

const listPatients = async (filters = {}) => {
  const query = buildPatientQuery(filters);
  const { page, limit, skip } = getPagination(filters);

  const [patients, total] = await Promise.all([
    Patient.find(query).populate('userId', 'email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Patient.countDocuments(query),
  ]);

  return {
    patients,
    pagination: buildPagination({ page, limit, total }),
  };
};

const getPatientById = async (id) => {
  const patient = await Patient.findById(id).populate('userId', 'email');

  if (!patient) {
    throw patientNotFound();
  }

  return patient;
};

const getPatientByUserId = async (userId) => {
  const patient = await Patient.findOne({ userId });

  if (!patient) {
    throw patientNotFound();
  }

  return patient;
};

const createPatient = async (payload, actor = null) => {
  let patientId = normalizePatientId(payload.patientId);

  if (!patientId) {
    let existingPatient = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      patientId = generatePatientId();
      existingPatient = await Patient.findOne({ patientId });

      if (!existingPatient) {
        break;
      }
    }

    if (existingPatient) {
      throw duplicatePatientError();
    }
  } else {
    const existingPatient = await Patient.findOne({ patientId });

    if (existingPatient) {
      throw duplicatePatientError();
    }
  }

  const patientPayload = {
    patientId,
    name: String(payload.name || '').trim(),
    dob: payload.dob,
    gender: payload.gender,
    weight: normalizeWeight(payload.weight),
    allergies: normalizeAllergies(payload.allergies),
    medicalHistory: normalizeStringArray(payload.medicalHistory),
  };

  let patient = null;

  try {
    patient = await Patient.create(patientPayload);
  } catch (error) {
    if (!isDuplicateNullUserIdError(error)) {
      throw error;
    }

    // Heal old records where userId is persisted as null under unique sparse index.
    await Patient.updateMany({ userId: null }, { $unset: { userId: 1 } });
    patient = await Patient.create(patientPayload);
  }

  // Global Audit
  if (actor) {
    logAudit({
      actor,
      action: PATIENT.CREATED,
      module: 'patient',
      resource: { collection: 'Patient', docId: patient._id },
      diff: { after: patient.toJSON() }
    });
  }

  return patient;
};

const splitName = (fullName = '') => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return {
      firstName: parts[0] || 'Patient',
      lastName: 'User',
    };
  }

  return {
    firstName: parts.shift(),
    lastName: parts.join(' '),
  };
};

const createPatientPortalAccount = async (patientId, payload = {}, actor = null) => {
  const patient = await Patient.findById(patientId);

  if (!patient) {
    throw patientNotFound();
  }

  if (patient.userId) {
    const user = await User.findById(patient.userId);
    if (user) {
      return {
        patient,
        user: user.toSafeObject(),
        access: {
          email: user.email,
          loginUrl: getPrimaryClientOrigin() ? `${getPrimaryClientOrigin()}/patient/login` : '/patient/login',
          passwordSetupRequired: true,
        },
      };
    }
  }

  const normalizedEmail = String(payload.email || '').trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    if (!patient.userId) {
      await Patient.findByIdAndUpdate(patient._id, { userId: existingUser._id });
    }
    return {
      patient: await getPatientById(patient._id),
      user: existingUser.toSafeObject(),
      access: {
        email: existingUser.email,
        loginUrl: getPrimaryClientOrigin() ? `${getPrimaryClientOrigin()}/patient/login` : '/patient/login',
        passwordSetupRequired: true,
      },
    };
  }

  const { firstName, lastName } = splitName(patient.name);
  const user = await createUser({
    firstName: String(payload.firstName || firstName).trim(),
    lastName: String(payload.lastName || lastName).trim(),
    email: normalizedEmail,
    role: 'patient',
    isActive: payload.isActive ?? true,
  });

  await Patient.findByIdAndUpdate(patient._id, { userId: user._id }, { new: true, runValidators: true });

  const linkedPatient = await getPatientById(patient._id);

  // Global Audit
  if (actor) {
    logAudit({
      actor,
      action: PATIENT.UPDATED,
      module: 'patient',
      resource: { collection: 'Patient', docId: patient._id },
      diff: { after: { userId: user._id, email: user.email } }
    });
  }

  return {
    patient: linkedPatient,
    user,
    access: {
      email: user.email,
      loginUrl: getPrimaryClientOrigin() ? `${getPrimaryClientOrigin()}/patient/login` : '/patient/login',
      passwordSetupRequired: true,
      inviteEmail: user.inviteEmail || null,
    },
  };
};

module.exports = {
  listPatients,
  getPatientById,
  getPatientByUserId,
  createPatient,
  createPatientPortalAccount
};
