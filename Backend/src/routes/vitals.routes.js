const express = require('express');
const router = express.Router();
const vitalsController = require('../controllers/vitals.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { validateRecordVitals, validateVoidVitals } = require('../validators/vitals.validator');

// POST /api/vitals - Record new vitals
router.post(
  '/',
  verifyToken,
  requireRole('nurse', 'doctor'),
  validateRecordVitals,
  vitalsController.recordVitals
);

// GET /api/vitals/admissions/:id/timeline - Get history
router.get(
  '/admissions/:id/timeline',
  verifyToken,
  requireRole('nurse', 'doctor', 'admin'),
  vitalsController.getVitalsTimeline
);

// GET /api/vitals/admissions/:id/latest - Get most recent
router.get(
  '/admissions/:id/latest',
  verifyToken,
  requireRole('nurse', 'doctor', 'pharmacist', 'admin'),
  vitalsController.getLatestVitals
);

// GET /api/vitals/critical - Get admissions with recent critical alerts
router.get(
  '/critical',
  verifyToken,
  requireRole('nurse', 'doctor', 'admin'),
  vitalsController.getCriticalAdmissions
);

// PATCH /api/vitals/:id/void - Soft delete clinical record
router.patch(
  '/:id/void',
  verifyToken,
  requireRole('doctor', 'admin'),
  validateVoidVitals,
  vitalsController.voidVitals
);

module.exports = router;
