const mongoose = require('mongoose');
const {
  authenticateUser,
  changePassword,
  createPasswordResetRequest,
  getAuthenticatedUser,
  resetPassword,
  setupFirstAdmin,
} = require('../services/auth.service');
const { sendError, sendSuccess } = require('../utils/responseHandler');
const { logAudit, extractActor } = require('../utils/auditLogger');
const { SYSTEM } = require('../constants/auditActions');

const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const configuredSecureCookie = process.env.SESSION_COOKIE_SECURE;
const useSecureCookie = typeof configuredSecureCookie === 'string'
  ? configuredSecureCookie === 'true'
  : isProduction;
const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'pims.sid';

const saveSession = (req) => new Promise((resolve, reject) => {
  req.session.save((error) => {
    if (error) {
      reject(error);
      return;
    }
    resolve();
  });
});

const regenerateSession = (req) => new Promise((resolve, reject) => {
  req.session.regenerate((error) => {
    if (error) {
      reject(error);
      return;
    }
    resolve();
  });
});

const destroySession = (req) => new Promise((resolve, reject) => {
  req.session.destroy((error) => {
    if (error) {
      reject(error);
      return;
    }
    resolve();
  });
});

const clearSessionCookie = (res) => {
  res.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure: useSecureCookie,
    sameSite: 'strict',
  });
};

const login = async (req, res) => {
  const { email, password, role } = req.body || {};
  const ip = req.ip || req.headers['x-forwarded-for'] || null;
  const userAgent = req.headers['user-agent'] || null;

  try {
    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    const { user } = await authenticateUser({ email, password, role });

    await regenerateSession(req);
    req.session.user = {
      id: user.id,
      role: user.role,
    };
    await saveSession(req);

    logAudit({
      actor: { userId: user._id || user.id, name: `${user.firstName} ${user.lastName}`, role: user.role, ip, userAgent },
      action: SYSTEM.LOGIN,
      module: 'system',
      resource: { collection: 'User', docId: user._id || user.id },
      metadata: { email, loginTime: new Date() }
    });

    return sendSuccess(res, { user }, 'Login successful');
  } catch (error) {
    logAudit({
      actor: { userId: null, name: email, role: 'unknown', ip, userAgent },
      action: SYSTEM.LOGIN_FAILED,
      module: 'system',
      resource: { collection: 'System', docId: new mongoose.Types.ObjectId() },
      metadata: { email, reason: error.message || 'invalid_credentials' }
    });

    return sendError(res, error.message || 'Login failed', error.statusCode || 500);
  }
};

const setupAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password, setupToken } = req.body || {};

    if (!firstName || !lastName || !email || !password || !setupToken) {
      return sendError(res, 'firstName, lastName, email, password, and setupToken are required', 400);
    }

    const { user } = await setupFirstAdmin({ firstName, lastName, email, password, setupToken });

    await regenerateSession(req);
    req.session.user = {
      id: user.id,
      role: user.role,
    };
    await saveSession(req);

    return sendSuccess(res, { user }, 'Admin setup successful', 201);
  } catch (error) {
    return sendError(res, error.message || 'Admin setup failed', error.statusCode || 500);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return sendError(res, 'Email is required', 400);
    }

    await createPasswordResetRequest({ email });

    return sendSuccess(res, { accepted: true }, 'If the account exists, a reset email has been sent');
  } catch (error) {
    return sendError(res, error.message || 'Password reset request failed', error.statusCode || 500);
  }
};

const resetPasswordFlow = async (req, res) => {
  try {
    const { email, token, newPassword, confirmPassword } = req.body || {};

    if (!email || !token || !newPassword || !confirmPassword) {
      return sendError(res, 'email, token, newPassword, and confirmPassword are required', 400);
    }

    const result = await resetPassword({ email, token, newPassword });
    return sendSuccess(res, result, 'Password reset successful');
  } catch (error) {
    return sendError(res, error.message || 'Password reset failed', error.statusCode || 500);
  }
};

const changePasswordFlow = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return sendError(res, 'currentPassword, newPassword, and confirmPassword are required', 400);
    }

    const actor = extractActor(req);
    const result = await changePassword({
      userId: req.user.id || req.user._id,
      currentPassword,
      newPassword,
    }, actor);

    return sendSuccess(res, result, 'Password changed successfully');
  } catch (error) {
    return sendError(res, error.message || 'Password change failed', error.statusCode || 500);
  }
};

const getMe = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req.user.id || req.user._id);
    return sendSuccess(res, { user }, 'Current user');
  } catch (error) {
    return sendError(res, error.message || 'Failed to load current user', error.statusCode || 500);
  }
};

const logout = async (req, res) => {
  const actor = extractActor(req);
  try {
    if (req.session) {
      await destroySession(req);
    }
    clearSessionCookie(res);

    if (actor.userId) {
      logAudit({
        actor,
        action: SYSTEM.LOGOUT,
        module: 'system',
        resource: { collection: 'User', docId: actor.userId },
      });
    }

    return sendSuccess(res, { loggedOut: true }, 'Logged out successfully');
  } catch (error) {
    clearSessionCookie(res);
    return sendSuccess(res, { loggedOut: true }, 'Logged out locally');
  }
};

module.exports = {
  login,
  setupAdmin,
  forgotPassword,
  resetPasswordFlow,
  changePasswordFlow,
  getMe,
  logout
};
