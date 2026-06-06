const User = require('../models/User.model');
const Patient = require('../models/Patient.model');
const { sendPasswordChangedEmail, sendPasswordResetEmail } = require('./email.service');
const { hashPassword, hashToken, verifyPassword, generateToken } = require('../utils/password');
const { logAudit } = require('../utils/auditLogger');
const { USER } = require('../constants/auditActions');

const authError = (message, statusCode = 401) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const markPasswordChangedAt = () => new Date(Date.now() - 1000);

const ensureAdminSetupToken = (setupToken) => {
  const isEnabled = String(process.env.ENABLE_ADMIN_SETUP || 'false').trim().toLowerCase() === 'true';
  const expectedToken = String(process.env.ADMIN_SETUP_TOKEN || '').trim();

  if (!isEnabled) {
    throw authError('Admin setup is disabled', 403);
  }

  if (!expectedToken) {
    throw authError('Admin setup is not configured', 500);
  }

  if (String(setupToken || '').trim() !== expectedToken) {
    throw authError('Invalid setup token', 403);
  }
};

const toAuthPayload = (user) => ({
  user: user.toSafeObject(),
});

const DEFAULT_BOOTSTRAP_USERS = [
  {
    firstName: 'Asha',
    lastName: 'Rao',
    email: 'doctor@pims.com',
    password: 'test123',
    role: 'doctor',
  },
  {
    firstName: 'Naveen',
    lastName: 'Kumar',
    email: 'pharma@pims.com',
    password: 'test123',
    role: 'pharmacist',
  },
  {
    firstName: 'Sara',
    lastName: 'Joseph',
    email: 'admin@pims.com',
    password: 'test123',
    role: 'admin',
  },
  {
    firstName: 'Meera',
    lastName: 'Das',
    email: 'nurse@pims.com',
    password: 'test123',
    role: 'nurse',
  },
  {
    firstName: 'Rohan',
    lastName: 'Shah',
    email: 'recep@pims.com',
    password: 'test123',
    role: 'receptionist',
  },
  {
    firstName: 'Kiran',
    lastName: 'Patel',
    email: 'cashier@pims.com',
    password: 'test123',
    role: 'cashier',
  },
  {
    firstName: 'Anita',
    lastName: 'Roy',
    email: 'patient@pims.com',
    password: 'test123',
    role: 'patient',
  },
];

const bootstrapDefaultUsersIfEmpty = async () => {
  const isProduction = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
  const shouldSyncDemoUsers = String(process.env.BOOTSTRAP_DEMO_USERS || 'false').trim().toLowerCase() === 'true';

  if (isProduction || !shouldSyncDemoUsers) {
    return { seeded: false, reason: isProduction ? 'production-disabled' : 'disabled-by-env' };
  }

  for (const seedUser of DEFAULT_BOOTSTRAP_USERS) {
    const user = await User.findOneAndUpdate(
      { email: normalizeEmail(seedUser.email) },
      {
        $set: {
          firstName: seedUser.firstName,
          lastName: seedUser.lastName,
          email: normalizeEmail(seedUser.email),
          passwordHash: hashPassword(seedUser.password),
          role: seedUser.role,
          isActive: true,
          failedLoginAttempts: 0,
          lockUntil: null,
          passwordChangedAt: markPasswordChangedAt(),
        },
      },
      { upsert: true, new: true }
    );

    // If it's a patient, ensure they have a linked Patient record
    if (seedUser.role === 'patient') {
      await Patient.updateOne(
        { userId: user._id },
        {
          $set: {
            userId: user._id,
            patientId: 'PAT-DEMO-001',
            name: `${seedUser.firstName} ${seedUser.lastName}`,
            dob: new Date('1990-01-01'),
            gender: 'Female',
            allergies: [{ substance: 'Penicillin', severity: 'High' }],
            medicalHistory: ['Asthma'],
          },
        },
        { upsert: true }
      );
    }
  }

  return { seeded: true, count: DEFAULT_BOOTSTRAP_USERS.length, mode: 'sync' };
};

const authenticateUser = async ({ email, password, role }) => {
  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user || !user.isActive) {
    throw authError('Invalid email or password');
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw authError('Account temporarily locked due to too many failed login attempts. Please try again later.', 403);
  }

  const passwordMatches = verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
    }
    await user.save();
    throw authError('Invalid email or password');
  }

  if (role && role !== user.role) {
    throw authError('Role mismatch', 403);
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  await user.save();

  return toAuthPayload(user);
};

const issuePasswordSetup = async (user, options = {}) => {
  const setupToken = generateToken(24);
  user.passwordResetTokenHash = hashToken(setupToken);
  user.passwordResetTokenExpiresAt = new Date(Date.now() + (options.expiresInMs || 60 * 60 * 1000));
  await user.save();

  const allOrigins = String(process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  const primaryOrigin = allOrigins.find((u) => !u.includes('localhost')) || allOrigins[0];
  const resetUrl = `${primaryOrigin.replace(/\/$/, '')}/reset-password?email=${encodeURIComponent(
    user.email
  )}&token=${encodeURIComponent(setupToken)}`;

  const inviteEmail = await sendPasswordResetEmail({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    resetToken: setupToken,
    resetUrl,
    mode: options.mode || 'reset',
  });

  return {
    setupRequired: true,
    expiresAt: user.passwordResetTokenExpiresAt,
    inviteEmail,
    loginUrl: `${primaryOrigin.replace(/\/$/, '')}/login?role=${String(user.role || '').toLowerCase()}`,
  };
};

const getAuthenticatedUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw authError('User not found', 401);
  }

  const safeUser = user.toSafeObject();

  if (safeUser.role === 'PATIENT') {
    const patient = await Patient.findOne({ userId: safeUser.id });
    if (patient) {
      safeUser.patient = patient;
    }
  }

  return safeUser;
};

const setupFirstAdmin = async ({ firstName, lastName, email, password, setupToken }) => {
  ensureAdminSetupToken(setupToken);

  const adminCount = await User.countDocuments({ role: 'ADMIN' });

  if (adminCount > 0) {
    throw authError('Admin already exists', 409);
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw authError('Email already exists', 409);
  }

  const user = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role: 'ADMIN',
    isActive: true,
    lastLogin: new Date(),
    passwordChangedAt: markPasswordChangedAt(),
  });

  return toAuthPayload(user);
};

const changePassword = async ({ userId, currentPassword, newPassword }, actor = null) => {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw authError('User not found', 401);
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw authError('Current password is incorrect', 400);
  }

  user.passwordHash = hashPassword(newPassword);
  user.passwordChangedAt = markPasswordChangedAt();
  user.passwordResetTokenHash = null;
  user.passwordResetTokenExpiresAt = null;
  await user.save();

  // Global Audit
  if (actor) {
    logAudit({
      actor,
      action: USER.PASSWORD_CHANGED,
      module: 'user',
      resource: { collection: 'User', docId: user._id },
      diff: null // Do not log before/after for password changes
    });
  }

  try {
    await sendPasswordChangedEmail({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });
  } catch (error) {
    console.warn(`Failed to write password changed email for ${user.email}: ${error.message}`);
  }

  return toAuthPayload(user);
};

const createPasswordResetRequest = async ({ email }) => {
  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user || !user.isActive) {
    return { accepted: true };
  }

  const resetToken = generateToken(24);
  user.passwordResetTokenHash = hashToken(resetToken);
  user.passwordResetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const allOrigins = String(process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);

  const primaryOrigin = allOrigins.find((u) => !u.includes('localhost')) || allOrigins[0];

  const resetUrl = `${primaryOrigin.replace(/\/$/, '')}/reset-password?email=${encodeURIComponent(
    user.email
  )}&token=${encodeURIComponent(resetToken)}`;

  await sendPasswordResetEmail({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    resetToken,
    resetUrl,
    mode: 'reset',
  });

  return { accepted: true };
};

const resetPassword = async ({ email, token, newPassword }) => {
  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user || !user.isActive) {
    throw authError('Invalid reset link', 400);
  }

  if (!user.passwordResetTokenHash || !user.passwordResetTokenExpiresAt) {
    throw authError('Reset token expired', 400);
  }

  if (user.passwordResetTokenExpiresAt.getTime() < Date.now()) {
    throw authError('Reset token expired', 400);
  }

  if (hashToken(token) !== user.passwordResetTokenHash) {
    throw authError('Invalid reset token', 400);
  }

  user.passwordHash = hashPassword(newPassword);
  user.passwordChangedAt = markPasswordChangedAt();
  user.passwordResetTokenHash = null;
  user.passwordResetTokenExpiresAt = null;
  await user.save();

  try {
    await sendPasswordChangedEmail({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });
  } catch (error) {
    console.warn(`Failed to write password changed email for ${user.email}: ${error.message}`);
  }

  return toAuthPayload(user);
};

module.exports = {
  bootstrapDefaultUsersIfEmpty,
  authenticateUser,
  issuePasswordSetup,
  getAuthenticatedUser,
  setupFirstAdmin,
  changePassword,
  createPasswordResetRequest,
  resetPassword
};
