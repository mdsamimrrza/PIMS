const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const reportValidator = require('../validators/report.validator');

router.use(verifyToken);

router.get('/summary', requireRole('admin'), reportValidator.validateReportQuery, reportController.getSummary);
router.get('/atcUsage', requireRole('admin'), reportValidator.validateReportQuery, reportController.getAtcUsage);
router.get('/fulfillment', requireRole('admin'), reportValidator.validateReportQuery, reportController.getFulfillment);
router.get('/patient-summary', requireRole('patient'), reportValidator.validateReportQuery, reportController.getPatientSummary);

module.exports = router;
