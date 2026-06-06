const { sendSuccess } = require('../utils/responseHandler');

const getHealth = (_req, res) => {
  return sendSuccess(res, { status: 'ok' }, 'Backend is running');
};

module.exports = {
  getHealth
};
