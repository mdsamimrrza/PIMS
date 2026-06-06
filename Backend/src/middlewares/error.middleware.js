const { sendError } = require('../utils/responseHandler');

const notFound = (_req, res) => {
  return sendError(res, 'Route not found', 404);
};

const SAFE_STATUS_CODES = new Set([400, 401, 403, 404, 409, 422, 429]);

const errorHandler = (err, _req, res, _next) => {
  if (res.headersSent) {
    if ((err?.statusCode || 500) >= 500) {
      console.error(err);
    }
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = SAFE_STATUS_CODES.has(statusCode)
    ? (err.message || 'Request failed')
    : 'Internal server error';

  if (statusCode >= 500) {
    console.error(err);
  }

  return sendError(res, message, statusCode);
};

module.exports = {
  notFound,
  errorHandler
};
