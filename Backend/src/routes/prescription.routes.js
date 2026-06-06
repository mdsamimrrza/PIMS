const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescription.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const allergyCheck = require('../middlewares/allergyCheck.middleware');
const prescriptionValidator = require('../validators/prescription.validator');

router.use(verifyToken);

router.get(
  '/', 
  requireRole('doctor', 'pharmacist', 'patient', 'admin'), 
  prescriptionValidator.validatePrescriptionQuery, 
  prescriptionController.getAllPrescriptions
);

router.post(
  '/', 
  requireRole('doctor'), 
  prescriptionValidator.validateCreatePrescription, 
  allergyCheck, 
  prescriptionController.createNewPrescription
);

router.get(
  '/:id/pdf', 
  requireRole('doctor', 'pharmacist', 'patient', 'admin'), 
  prescriptionValidator.validatePrescriptionIdParam, 
  prescriptionController.downloadPrescriptionPdf
);

router.get(
  '/:id', 
  requireRole('doctor', 'pharmacist', 'patient', 'admin'), 
  prescriptionValidator.validatePrescriptionIdParam, 
  prescriptionController.getPrescription
);

router.patch(
  '/:id', 
  requireRole('doctor'), 
  prescriptionValidator.validatePrescriptionIdParam, 
  prescriptionController.updateDraft
);

router.put(
  '/:id/status', 
  requireRole('pharmacist', 'admin'), 
  prescriptionValidator.validateUpdatePrescriptionStatus, 
  prescriptionController.updateExistingPrescriptionStatus
);

module.exports = router;
