const { ROLES } = require('../utils/constants');
const {
  createValidator,
  optionalEnum,
  requireEmail,
  requireNonEmptyString,
  requireStrongPassword,
  optionalString,
} = require('./validate');

const validateLogin = createValidator((req) => {
  const errors = [];
  const body = req.body || {};

  requireEmail(errors, 'email', body.email);
  requireNonEmptyString(errors, 'password', body.password);
  if (body.role) {
    body.role = String(body.role).toLowerCase();
  }
  optionalEnum(errors, 'role', body.role, Object.values(ROLES));

  return errors;
});

const validateSetupAdmin = createValidator((req) => {
  const errors = [];
  const body = req.body || {};

  requireNonEmptyString(errors, 'setupToken', body.setupToken);
  if (body.setupToken && String(body.setupToken).length < 24) {
    errors.push({ field: 'setupToken', message: 'setupToken must be at least 24 characters long' });
  }
  requireNonEmptyString(errors, 'firstName', body.firstName);
  requireNonEmptyString(errors, 'lastName', body.lastName);
  requireEmail(errors, 'email', body.email);
  requireStrongPassword(errors, 'password', body.password);
  optionalString(errors, 'confirmPassword', body.confirmPassword);

  if (body.confirmPassword !== undefined && body.password !== body.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'confirmPassword must match password' });
  }

  return errors;
});

const validateForgotPassword = createValidator((req) => {
  const errors = [];
  requireEmail(errors, 'email', req.body?.email);
  return errors;
});

const validateResetPassword = createValidator((req) => {
  const errors = [];
  const body = req.body || {};

  requireEmail(errors, 'email', body.email);
  requireNonEmptyString(errors, 'token', body.token);
  requireStrongPassword(errors, 'newPassword', body.newPassword);
  requireNonEmptyString(errors, 'confirmPassword', body.confirmPassword);

  if (body.newPassword !== body.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'confirmPassword must match newPassword' });
  }

  return errors;
});

const validateChangePassword = createValidator((req) => {
  const errors = [];
  const body = req.body || {};

  requireNonEmptyString(errors, 'currentPassword', body.currentPassword);
  requireStrongPassword(errors, 'newPassword', body.newPassword);
  requireNonEmptyString(errors, 'confirmPassword', body.confirmPassword);

  if (body.newPassword !== body.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'confirmPassword must match newPassword' });
  }

  return errors;
});

module.exports = {
  validateLogin,
  validateSetupAdmin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
};
