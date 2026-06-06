const { getAtcByCode, getAtcTree, searchAtc } = require('../services/atc.service');
const { sendError, sendSuccess } = require('../utils/responseHandler');

const getTree = async (_req, res) => {
  try {
    const tree = await getAtcTree();
    return sendSuccess(res, { tree }, 'ATC tree loaded');
  } catch (error) {
    return sendError(res, error.message || 'Failed to load ATC tree', error.statusCode || 500);
  }
};

const getByCode = async (req, res) => {
  try {
    const node = await getAtcByCode(req.params.code);
    return sendSuccess(res, { node }, 'ATC node loaded');
  } catch (error) {
    return sendError(res, error.message || 'Failed to load ATC node', error.statusCode || 500);
  }
};

const search = async (req, res) => {
  try {
    const results = await searchAtc(req.query.q);
    return sendSuccess(res, { results }, 'ATC search results');
  } catch (error) {
    return sendError(res, error.message || 'ATC search failed', error.statusCode || 500);
  }
};

module.exports = {
  getTree,
  getByCode,
  search
};
