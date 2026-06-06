const express = require('express');
const router = express.Router();
const bedController = require('../controllers/bed.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

// GET /api/beds/layout - Protected for clinical and admin roles
router.get('/layout', 
  verifyToken, 
  requireRole('nurse', 'receptionist', 'doctor', 'admin'), 
  bedController.getBedLayout
);

// GET /api/beds/available - Protected for admission roles
router.get('/available', 
  verifyToken, 
  requireRole('nurse', 'receptionist', 'admin'), 
  bedController.getAvailable
);

// PATCH /api/beds/:id/status - Protected for nurse/admin
router.patch('/:id/status', 
  verifyToken, 
  requireRole('nurse', 'admin'), 
  bedController.updateStatus
);

// GET /api/beds/sanitize - Protected for nurse/admin/receptionist
router.get('/sanitize', 
  verifyToken, 
  requireRole('nurse', 'receptionist', 'admin'), 
  bedController.getSanitQueue
);

module.exports = router;
