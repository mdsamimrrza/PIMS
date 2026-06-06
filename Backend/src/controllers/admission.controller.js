const admissionService = require('../services/admission.service');

const create = async (req, res, next) => {
  try {
    const actorId = req.session?.user?.id;
    const data = await admissionService.createAdmission(actorId, req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await admissionService.getAdmission(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getActive = async (req, res, next) => {
  try {
    const { ward, priority, page, limit } = req.query;
    const data = await admissionService.getActiveAdmissions({ 
      ward, 
      priority, 
      page: parseInt(page) || 1, 
      limit: parseInt(limit) || 20 
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const discharge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorId = req.session?.user?.id;
    const data = await admissionService.dischargePatient(id, actorId, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const byPatient = async (req, res, next) => {
  try {
    const { pid } = req.params;
    const data = await admissionService.getAdmissionsByPatient(pid);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getOne,
  getActive,
  discharge,
  byPatient
};
