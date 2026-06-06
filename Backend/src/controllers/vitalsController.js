const vitalsService = require('../services/vitalsService');
const { sendSuccess } = require('../utils/responseHandler');
const { extractActor } = require('../utils/auditLogger');

const recordVitals = async (req, res, next) => {
  try {
    const actor = extractActor(req);
    const data = await vitalsService.recordVitals(req.body, actor);
    
    let warning = null;
    if (data.wardMismatch) {
      warning = "Vitals recorded but nurse ward assignment does not match patient ward. Please verify.";
    }

    return sendSuccess(res, 'Vitals recorded successfully', data, 201, warning);
  } catch (error) {
    next(error);
  }
};

const getTimeline = async (req, res, next) => {
  try {
    const { admissionId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const before = req.query.before ? new Date(req.query.before) : undefined;

    const result = await vitalsService.getVitalsTimeline(admissionId, { limit, before });

    return sendSuccess(res, 'Vitals timeline retrieved', result.vitals, 200, null, {
      hasMore: result.hasMore,
      nextCursor: result.nextCursor
    });
  } catch (error) {
    next(error);
  }
};

const getLatest = async (req, res, next) => {
  try {
    const { admissionId } = req.params;
    const data = await vitalsService.getLatestVitals(admissionId);
    return sendSuccess(res, 'Latest vitals retrieved', data);
  } catch (error) {
    next(error);
  }
};

const getCriticalAdmissions = async (req, res, next) => {
  try {
    const data = await vitalsService.getAdmissionsWithCriticalVitals();
    return sendSuccess(res, 'Critical admissions retrieved', data);
  } catch (error) {
    next(error);
  }
};

const voidVitals = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { voidReason } = req.body;
    const actor = extractActor(req);
    const data = await vitalsService.voidVitals(id, voidReason, actor);
    return sendSuccess(res, 'Vitals record voided successfully', data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordVitals,
  getTimeline,
  getLatest,
  getCriticalAdmissions,
  voidVitals
};
