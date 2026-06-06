const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { validateInsurance } = require('../validators/billingInsurance.validator');

router.use(verifyToken);

router.post('/', requireRole('cashier', 'admin'), billingController.createInvoice);
router.get('/', requireRole('cashier', 'admin', 'doctor', 'patient'), billingController.listInvoices);

router.post('/:id/pay', requireRole('cashier', 'admin'), billingController.payInvoice);
router.get('/:id/payments', requireRole('cashier', 'admin'), billingController.getInvoicePayments);

router.post('/:id/insurance', requireRole('cashier', 'admin'), validateInsurance, billingController.applyInsurance);
router.patch('/:id/insurance/status', requireRole('admin'), billingController.updateInsuranceStatus);

router.get('/:id/receipt', requireRole('cashier', 'admin', 'patient'), billingController.downloadReceipt);

module.exports = router;
