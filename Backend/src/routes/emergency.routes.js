const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergency.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.post(
  '/visit',
  verifyToken,
  requireRole('nurse', 'receptionist', 'doctor'),
  emergencyController.createVisit
);

router.patch(
  '/visit/:id/triage',
  verifyToken,
  requireRole('nurse', 'doctor'),
  emergencyController.assignTriage
);

router.get(
  '/queue',
  verifyToken,
  requireRole('doctor', 'nurse', 'pharmacist', 'admin'),
  emergencyController.getQueue
);

router.get(
  '/stream',
  verifyToken,
  emergencyController.streamQueue
);

router.post(
  '/dispense-override',
  verifyToken,
  requireRole('pharmacist'),
  emergencyController.dispenseOverride
);

router.patch(
  '/override/:visitId/:index/sign',
  verifyToken,
  requireRole('doctor'),
  emergencyController.signOverride
);

module.exports = router;
