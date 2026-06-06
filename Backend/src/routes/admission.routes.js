const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admission.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

// POST /api/admissions - Admission creation (receptionist/admin)
router.post('/', 
  verifyToken, 
  requireRole('receptionist', 'admin'), 
  admissionController.create
);

// GET /api/admissions - List active admissions
router.get('/', 
  verifyToken, 
  requireRole('nurse', 'doctor', 'receptionist', 'admin'), 
  admissionController.getActive
);

// GET /api/admissions/:id - Get specific admission
router.get('/:id', 
  verifyToken, 
  requireRole('nurse', 'doctor', 'receptionist', 'admin'), 
  admissionController.getOne
);

// PATCH /api/admissions/:id/discharge - Discharge process
router.patch('/:id/discharge', 
  verifyToken, 
  requireRole('nurse', 'doctor', 'admin'), 
  admissionController.discharge
);

// GET /api/admissions/patient/:pid - History for patient
router.get('/patient/:pid', 
  verifyToken, 
  requireRole('nurse', 'doctor', 'receptionist', 'admin'), 
  admissionController.byPatient
);

module.exports = router;
