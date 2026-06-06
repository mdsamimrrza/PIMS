const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const patientValidator = require('../validators/patient.validator');

router.use(verifyToken);

router.get('/me', requireRole('patient'), patientController.getMyPatientRecord);

router.get('/', requireRole('doctor', 'admin', 'receptionist'), patientValidator.validatePatientQuery, patientController.getAllPatients);
router.post('/', requireRole('doctor', 'receptionist'), patientValidator.validateCreatePatient, patientController.createNewPatient);
router.post(
  '/:id/portal-account',
  requireRole('admin'),
  patientValidator.validatePatientIdParam,
  patientValidator.validateCreatePatientPortalAccount,
  patientController.createPatientPortalUser
);
router.get('/:id', requireRole('doctor', 'admin', 'receptionist'), patientValidator.validatePatientIdParam, patientController.getSinglePatient);

module.exports = router;
