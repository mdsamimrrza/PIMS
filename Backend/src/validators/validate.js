const mongoose = require('mongoose');
const { sendError } = require('../utils/responseHandler');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createValidator = (buildErrors) => {
  return (req, res, next) => {
    const errors = buildErrors(req);

    if (errors.length > 0) {
      return sendError(res, 'Validation failed', 400, errors);
    }

    return next();
  };
};

const addError = (errors, field, message) => {
  errors.push({ field, message });
};

const isProvided = (value) => value !== undefined && value !== null;

const requireNonEmptyString = (errors, field, value) => {
  if (!isProvided(value) || !String(value).trim()) {
    addError(errors, field, `${field} is required`);
  }
};

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const requireStrongPassword = (errors, field, value) => {
  requireNonEmptyString(errors, field, value);

  if (isProvided(value) && String(value).trim() && !PASSWORD_REGEX.test(String(value).trim())) {
    addError(errors, field, `${field} must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character`);
  }
};

const optionalStrongPassword = (errors, field, value) => {
  if (!isProvided(value)) {
    return;
  }

  if (typeof value !== 'string') {
    addError(errors, field, `${field} must be a string`);
    return;
  }

  if (String(value).trim() && !PASSWORD_REGEX.test(String(value).trim())) {
    addError(errors, field, `${field} must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character`);
  }
};

const optionalString = (errors, field, value) => {
  if (isProvided(value) && typeof value !== 'string') {
    addError(errors, field, `${field} must be a string`);
  }
};

const requireEmail = (errors, field, value) => {
  requireNonEmptyString(errors, field, value);

  if (isProvided(value) && String(value).trim() && !EMAIL_REGEX.test(String(value).trim())) {
    addError(errors, field, `${field} must be a valid email`);
  }
};

const optionalEmail = (errors, field, value) => {
  if (isProvided(value) && (!String(value).trim() || !EMAIL_REGEX.test(String(value).trim()))) {
    addError(errors, field, `${field} must be a valid email`);
  }
};

const requireObjectId = (errors, field, value) => {
  if (!isProvided(value) || !mongoose.isValidObjectId(value)) {
    addError(errors, field, `${field} must be a valid object id`);
  }
};

const optionalObjectId = (errors, field, value) => {
  if (isProvided(value) && !mongoose.isValidObjectId(value)) {
    addError(errors, field, `${field} must be a valid object id`);
  }
};

const requireEnum = (errors, field, value, allowedValues) => {
  if (!isProvided(value) || !allowedValues.includes(value)) {
    addError(errors, field, `${field} must be one of: ${allowedValues.join(', ')}`);
  }
};

const optionalEnum = (errors, field, value, allowedValues) => {
  if (isProvided(value) && !allowedValues.includes(value)) {
    addError(errors, field, `${field} must be one of: ${allowedValues.join(', ')}`);
  }
};

const requireNonNegativeNumber = (errors, field, value) => {
  const normalized = Number(value);

  if (!isProvided(value) || !Number.isFinite(normalized) || normalized < 0) {
    addError(errors, field, `${field} must be a non-negative number`);
  }
};

const optionalNonNegativeNumber = (errors, field, value) => {
  if (!isProvided(value)) {
    return;
  }

  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized < 0) {
    addError(errors, field, `${field} must be a non-negative number`);
  }
};

const optionalNumberRange = (errors, field, value, min, max) => {
  if (!isProvided(value)) {
    return;
  }

  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized < min || normalized > max) {
    addError(errors, field, `${field} must be between ${min} and ${max}`);
  }
};

const requireDate = (errors, field, value) => {
  const date = new Date(value);

  if (!isProvided(value) || Number.isNaN(date.getTime())) {
    addError(errors, field, `${field} must be a valid date`);
  }
};

const optionalDate = (errors, field, value) => {
  if (!isProvided(value)) {
    return;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    addError(errors, field, `${field} must be a valid date`);
  }
};

const optionalBoolean = (errors, field, value) => {
  if (isProvided(value) && typeof value !== 'boolean') {
    addError(errors, field, `${field} must be a boolean`);
  }
};

const optionalBooleanQuery = (errors, field, value) => {
  if (isProvided(value) && value !== 'true' && value !== 'false') {
    addError(errors, field, `${field} must be either "true" or "false"`);
  }
};

const requireArray = (errors, field, value) => {
  if (!Array.isArray(value) || value.length === 0) {
    addError(errors, field, `${field} must be a non-empty array`);
  }
};

const optionalStringArray = (errors, field, value) => {
  if (!isProvided(value)) {
    return;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    addError(errors, field, `${field} must be an array of strings`);
  }
};

const requireAtLeastOneOf = (errors, source, fields) => {
  const hasAnyValue = fields.some((field) => isProvided(source?.[field]));

  if (!hasAnyValue) {
    addError(errors, 'body', `At least one of these fields is required: ${fields.join(', ')}`);
  }
};

module.exports = {
  createValidator,
  addError,
  isProvided,
  requireNonEmptyString,
  requireStrongPassword,
  optionalStrongPassword,
  optionalString,
  requireEmail,
  optionalEmail,
  requireObjectId,
  optionalObjectId,
  requireEnum,
  optionalEnum,
  requireNonNegativeNumber,
  optionalNonNegativeNumber,
  optionalNumberRange,
  requireDate,
  optionalDate,
  optionalBoolean,
  optionalBooleanQuery,
  requireArray,
  optionalStringArray,
  requireAtLeastOneOf
};
