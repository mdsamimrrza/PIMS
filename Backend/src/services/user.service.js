const User = require('../models/User.model');
const Patient = require('../models/Patient.model');
const Prescription = require('../models/Prescription.model');
const { hashPassword, generatePassword } = require('../utils/password');
const { ROLES } = require('../utils/constants');
const { logAudit } = require('../utils/auditLogger');
const { USER } = require('../constants/auditActions');
const { issuePasswordSetup } = require('./auth.service');

const markPasswordChangedAt = () => new Date(Date.now() - 1000);

const getPrimaryClientOrigin = () => {
  const allOrigins = String(process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => String(url || '').trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return allOrigins.find((url) => !url.includes('localhost')) || allOrigins[0] || '';
};

const getRoleAccessUrl = (role) => {
  const clientUrl = getPrimaryClientOrigin();
  const accessPath = {
    [ROLES.DOCTOR]: '/doctor/access',
    [ROLES.PHARMACIST]: '/pharmacist/access',
    [ROLES.ADMIN]: '/admin/login',
    [ROLES.PATIENT]: '/patient/access',
  }[role] || '/doctor/access';

  return clientUrl ? `${clientUrl}${accessPath}` : accessPath;
};

const userNotFound = () => {
  const error = new Error('User not found');
  error.statusCode = 404;
  return error;
};

const buildUserQuery = (filters = {}) => {
  const query = {};

  if (filters.role) {
    query.role = filters.role;
  }

  if (filters.isActive === 'true') {
    query.isActive = true;
  }

  if (filters.isActive === 'false') {
    query.isActive = false;
  }

  if (filters.q) {
    const regex = new RegExp(String(filters.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
  }

  return query;
};

const getPagination = (filters = {}) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const listUsers = async (filters = {}) => {
  const query = buildUserQuery(filters);
  const { page, limit, skip } = getPagination(filters);

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  return {
    users: users.map((user) => user.toSafeObject()),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getUserById = async (id) => {
  const user = await User.findById(id);

  if (!user) {
    throw userNotFound();
  }

  return user.toSafeObject();
};

const createUser = async ({ firstName, lastName, email, password, role, isActive = true }, actor) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    const error = new Error('Email already exists');
    error.statusCode = 409;
    throw error;
  }

  const initialPassword = String(password || generatePassword());
  const user = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    passwordHash: hashPassword(initialPassword),
    role,
    isActive,
    passwordChangedAt: markPasswordChangedAt(),
  });

  // Global Audit
  if (actor) {
    logAudit({
      actor,
      action: USER.CREATED,
      module: 'user',
      resource: { collection: 'User', docId: user._id },
      diff: { after: { name: `${firstName} ${lastName}`, email: normalizedEmail, role } }
    });
  }

  let inviteEmail = {
    delivered: false,
    mode: 'unknown',
  };

  try {
    const setup = await issuePasswordSetup(user, { mode: 'activation' });
    inviteEmail = setup.inviteEmail;
  } catch (error) {
    console.warn(`Failed to send invite email for ${user.email}: ${error.message}`);
  }

  return {
    ...user.toSafeObject(),
    inviteEmail,
    passwordSetupRequired: true,
    loginUrl: getRoleAccessUrl(user.role),
  };
};

const updateUser = async (id, updates, actor) => {
  const payload = { ...updates };

  if (payload.email) {
    payload.email = String(payload.email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: payload.email, _id: { $ne: id } });

    if (existingUser) {
      const error = new Error('Email already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  if (payload.password) {
    payload.passwordHash = hashPassword(payload.password);
    delete payload.password;
  }

  const before = await User.findById(id).lean();
  if (!before) throw userNotFound();

  const user = await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw userNotFound();
  }

  // Global Audit
  if (actor) {
    if (payload.role && payload.role !== before.role) {
      logAudit({
        actor,
        action: USER.ROLE_CHANGED,
        module: 'user',
        resource: { collection: 'User', docId: user._id },
        diff: { before: { role: before.role }, after: { role: user.role } }
      });
    }
  }

  // Sync name to Patient record if applicable
  if (user.role === ROLES.PATIENT && (payload.firstName || payload.lastName)) {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    await Patient.findOneAndUpdate(
      { userId: user._id },
      { name: fullName },
      { runValidators: true }
    ).catch(err => console.error('Failed to sync patient name:', err));
  }

  return user.toSafeObject();
};

const deleteUser = async (id, actor) => {
  const before = { isActive: true };
  const user = await User.findByIdAndUpdate(
    id,
    {
      isActive: false,
      passwordChangedAt: markPasswordChangedAt(),
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
    },
    { new: true }
  );

  if (!user) {
    throw userNotFound();
  }

  // Global Audit
  if (actor) {
    logAudit({
      actor,
      action: USER.DEACTIVATED,
      module: 'user',
      resource: { collection: 'User', docId: user._id },
      diff: { before, after: { isActive: false } }
    });
  }

  return user.toSafeObject();
};

const permanentlyDeleteUser = async (id, actor) => {
  const user = await User.findById(id);

  if (!user) {
    throw userNotFound();
  }

  // Global Audit
  if (actor) {
    logAudit({
      actor,
      action: USER.DELETED,
      module: 'user',
      resource: { collection: 'User', docId: user._id },
      diff: { before: user.toSafeObject(), after: null }
    });
  }

  // If this was a patient, clean up their records
  if (user.role === ROLES.PATIENT) {
    const patient = await Patient.findOne({ userId: user._id });
    if (patient) {
      await Prescription.deleteMany({ patientId: patient._id });
      await Patient.findByIdAndDelete(patient._id);
    }
  }

  await User.findByIdAndDelete(id);

  return user.toSafeObject();
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  permanentlyDeleteUser
};
