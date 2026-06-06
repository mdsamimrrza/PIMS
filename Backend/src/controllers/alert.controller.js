const {
  acknowledgeAlert,
  dismissAlert,
  listAlerts,
} = require('../services/alert.service');
const { sendError, sendSuccess } = require('../utils/responseHandler');

const getAllAlerts = async (req, res) => {
  try {
    const { alerts, pagination } = await listAlerts(req.query || {});
    return sendSuccess(res, { alerts, pagination }, 'Alerts loaded');
  } catch (error) {
    return sendError(res, error.message || 'Failed to load alerts', error.statusCode || 500);
  }
};

const acknowledgeExistingAlert = async (req, res) => {
  try {
    const alert = await acknowledgeAlert(req.params.id, req.user.id || req.user._id);
    return sendSuccess(res, { alert }, 'Alert acknowledged');
  } catch (error) {
    return sendError(res, error.message || 'Failed to acknowledge alert', error.statusCode || 500);
  }
};

const dismissExistingAlert = async (req, res) => {
  try {
    const alert = await dismissAlert(req.params.id, req.user.id || req.user._id);
    return sendSuccess(res, { alert }, 'Alert dismissed');
  } catch (error) {
    return sendError(res, error.message || 'Failed to dismiss alert', error.statusCode || 500);
  }
};

module.exports = {
  getAllAlerts,
  acknowledgeExistingAlert,
  dismissExistingAlert
};
