import { Router } from 'express';
import * as vitalsController from '../controllers/vitalsController.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validateRecordVitals, validateVoidVitals } from '../validators/vitalsValidator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// POST /api/vitals - Record new vitals
router.post(
  '/',
  verifyToken,
  requireRole(ROLES.NURSE, ROLES.DOCTOR),
  validateRecordVitals,
  vitalsController.recordVitals
);

// GET /api/vitals/admissions/:admissionId/timeline - Get history
router.get(
  '/admissions/:admissionId/timeline',
  verifyToken,
  requireRole(ROLES.NURSE, ROLES.DOCTOR, ROLES.ADMIN),
  vitalsController.getTimeline
);

// GET /api/vitals/admissions/:admissionId/latest - Get most recent
router.get(
  '/admissions/:admissionId/latest',
  verifyToken,
  requireRole(ROLES.NURSE, ROLES.DOCTOR, ROLES.PHARMACIST, ROLES.ADMIN),
  vitalsController.getLatest
);

// GET /api/vitals/critical - Get admissions with recent critical alerts
router.get(
  '/critical',
  verifyToken,
  requireRole(ROLES.NURSE, ROLES.DOCTOR, ROLES.ADMIN),
  vitalsController.getCriticalAdmissions
);

// PATCH /api/vitals/:id/void - Soft delete clinical record
router.patch(
  '/:id/void',
  verifyToken,
  requireRole(ROLES.DOCTOR, ROLES.ADMIN),
  validateVoidVitals,
  vitalsController.voidVitals
);

export default router;
