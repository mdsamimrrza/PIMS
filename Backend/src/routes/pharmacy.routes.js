const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacy.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(verifyToken);

router.post('/', requireRole('pharmacist', 'admin'), pharmacyController.createOrder);
router.get('/:id', requireRole('pharmacist', 'admin', 'doctor', 'cashier'), pharmacyController.getOrder);

module.exports = router;
