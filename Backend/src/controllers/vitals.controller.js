const vitalsService = require('../services/vitals.service');
const { validationResult } = require('express-validator');

const recordVitals = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', errors: errors.array() });
    }

    const { id: actorId, role: actorRole } = req.session.user;
    const result = await vitalsService.recordVitals(actorId, actorRole, req.body);
    
    let response = { status: 'success', data: result };
    if (result.wardMismatch) {
      response.warning = "Vitals recorded but nurse ward assignment does not match patient ward.";
    }

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

const getVitalsTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit, before } = req.query;
    const result = await vitalsService.getVitalsTimeline(id, { 
      limit: parseInt(limit) || 20, 
      before 
    });
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

const getLatestVitals = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await vitalsService.getLatestVitals(id);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

const getCriticalAdmissions = async (req, res, next) => {
  try {
    const result = await vitalsService.getAdmissionsWithCriticalVitals();
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

const voidVitals = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', errors: errors.array() });
    }

    const { id: actorId } = req.session.user;
    const { voidReason } = req.body;
    const result = await vitalsService.voidVitals(req.params.id, actorId, voidReason);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  recordVitals,
  getVitalsTimeline,
  getLatestVitals,
  getCriticalAdmissions,
  voidVitals
};
