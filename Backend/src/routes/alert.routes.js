const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const alertValidator = require('../validators/alert.validator');

router.use(verifyToken);
router.use(requireRole('pharmacist', 'admin'));

router.get('/', alertValidator.validateAlertQuery, alertController.getAllAlerts);
router.put('/:id/acknowledge', alertValidator.validateAlertIdParam, alertController.acknowledgeExistingAlert);
router.put('/:id/dismiss', alertValidator.validateAlertIdParam, alertController.dismissExistingAlert);

module.exports = router;
