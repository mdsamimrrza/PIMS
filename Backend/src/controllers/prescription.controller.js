const prescriptionService = require('../services/prescription.service');
const pdfService = require('../services/pdf.service');
const { sendError, sendSuccess } = require('../utils/responseHandler');
const { extractActor } = require('../utils/auditLogger');

const getAllPrescriptions = async (req, res) => {
  try {
    const { prescriptions, pagination } = await prescriptionService.listPrescriptions(req.user, req.query || {});
    return sendSuccess(res, { prescriptions, pagination }, 'Prescriptions loaded');
  } catch (error) {
    return sendError(res, error.message || 'Failed to load prescriptions', error.statusCode || 500);
  }
};

const getPrescription = async (req, res) => {
  try {
    const prescription = await prescriptionService.getPrescriptionById(req.params.id, req.user);
    return sendSuccess(res, { prescription }, 'Prescription loaded');
  } catch (error) {
    return sendError(res, error.message || 'Failed to load prescription', error.statusCode || 500);
  }
};

const createNewPrescription = async (req, res) => {
  try {
    const { patientId, patient, items, allergyOverrideReason } = req.body || {};
    const actor = extractActor(req);

    if ((!patientId && !patient) || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'patient or patientId and at least one item are required', 400);
    }

    // Allergy check logic (Middlewares inject allergyWarnings)
    if (req.allergyWarnings && req.allergyWarnings.length > 0 && !allergyOverrideReason) {
      return res.status(409).json({
        success: false,
        message: 'Potential allergy detected. Requires clinical override.',
        warnings: req.allergyWarnings
      });
    }

    const result = await prescriptionService.createPrescription({
      ...(req.body || {}),
      doctorId: req.user.id || req.user._id,
      allergyWarnings: req.allergyWarnings || [],
      allergyChecked: true
    }, actor);

    return sendSuccess(res, result, 'Prescription created', 201);
  } catch (error) {
    return sendError(res, error.message || 'Failed to create prescription', error.statusCode || 500);
  }
};

const updateExistingPrescriptionStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    const actor = extractActor(req);

    if (!status) {
      return sendError(res, 'status is required', 400);
    }

    const prescription = await prescriptionService.updatePrescriptionStatus(req.params.id, status, actor);
    return sendSuccess(res, { prescription }, 'Prescription status updated');
  } catch (error) {
    return sendError(
      res,
      error.message || 'Failed to update prescription status',
      error.statusCode || 500
    );
  }
};

const downloadPrescriptionPdf = async (req, res) => {
  try {
    const pdfBuffer = await pdfService.generatePrescriptionPdf(req.params.id, req.user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate prescription PDF', error.statusCode || 500);
  }
};

const updateDraft = async (req, res) => {
  try {
    const actor = extractActor(req);
    const prescription = await prescriptionService.updateDraftPrescription(req.params.id, req.body || {}, actor);
    return sendSuccess(res, { prescription }, 'Draft prescription updated');
  } catch (error) {
    return sendError(res, error.message || 'Failed to update draft prescription', error.statusCode || 500);
  }
};

module.exports = {
  getAllPrescriptions,
  getPrescription,
  createNewPrescription,
  updateExistingPrescriptionStatus,
  downloadPrescriptionPdf,
  updateDraft
};
