const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

// All audit routes require authentication
router.use(verifyToken);

// Admin-only global logs and stats
router.get('/', requireRole('admin'), auditController.getAuditLogs);
router.get('/stats', requireRole('admin'), auditController.getAuditStats);

// Record-specific history (accessible by Admin, Staff/Doctor roles involved)
router.get('/resource/:collection/:docId', requireRole('admin', 'doctor', 'nurse', 'pharmacist', 'cashier'), auditController.getResourceHistory);

module.exports = router;
