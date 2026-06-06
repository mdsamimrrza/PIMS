const mongoose = require('mongoose');
const Alert = require('../models/Alert.model');
const { buildPagination, getPagination } = require('../utils/pagination');

const ALERT_TYPES = ['LOW_STOCK', 'NEAR_EXPIRY', 'EXPIRED'];
const ALERT_SEVERITIES = ['CRITICAL', 'WARNING', 'INFO'];

const alertNotFound = () => {
  const error = new Error('Alert not found');
  error.statusCode = 404;
  return error;
};

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const ensureObjectId = (value, label) => {
  if (value && !mongoose.isValidObjectId(value)) {
    throw validationError(`Invalid ${label}`);
  }
};

const populateAlertQuery = (query) =>
  query
    .populate('medicineId', 'name genericName brand atcCode strength dosageForm manufacturer')
    .populate('acknowledgedBy', 'firstName lastName email role');

const listAlerts = async (filters = {}) => {
  const query = {};
  const { page, limit, skip } = getPagination(filters);

  if (filters.type && ALERT_TYPES.includes(filters.type)) {
    query.type = filters.type;
  }

  if (filters.severity && ALERT_SEVERITIES.includes(filters.severity)) {
    query.severity = filters.severity;
  }

  if (filters.includeAcknowledged !== 'true') {
    query.isAcknowledged = false;
  }

  const [alerts, total] = await Promise.all([
    populateAlertQuery(Alert.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Alert.countDocuments(query),
  ]);

  return {
    alerts,
    pagination: buildPagination({ page, limit, total }),
  };
};

const getAlertById = async (id) => {
  ensureObjectId(id, 'alert id');

  const alert = await populateAlertQuery(Alert.findById(id));

  if (!alert) {
    throw alertNotFound();
  }

  return alert;
};

const createAlert = async ({ type, severity, medicineId = null, message }) => {
  if (!ALERT_TYPES.includes(type)) {
    throw validationError('Invalid alert type');
  }

  if (!ALERT_SEVERITIES.includes(severity)) {
    throw validationError('Invalid alert severity');
  }

  if (!message || !String(message).trim()) {
    throw validationError('Alert message is required');
  }

  ensureObjectId(medicineId, 'medicineId');

  const existingAlert = await Alert.findOne({
    type,
    medicineId,
    isAcknowledged: false,
  });

  if (existingAlert) {
    return getAlertById(existingAlert._id);
  }

  const alert = await Alert.create({
    type,
    severity,
    medicineId,
    message: String(message).trim(),
  });

  return getAlertById(alert._id);
};

const markAlertHandled = async (id, userId) => {
  ensureObjectId(id, 'alert id');
  ensureObjectId(userId, 'user id');

  const alert = await Alert.findByIdAndUpdate(
    id,
    {
      isAcknowledged: true,
      acknowledgedBy: userId,
    },
    { new: true, runValidators: true }
  );

  if (!alert) {
    throw alertNotFound();
  }

  return getAlertById(alert._id);
};

const acknowledgeAlert = async (id, userId) => markAlertHandled(id, userId);

const dismissAlert = async (id, userId) => markAlertHandled(id, userId);

module.exports = {
  listAlerts,
  getAlertById,
  createAlert,
  acknowledgeAlert,
  dismissAlert
};
