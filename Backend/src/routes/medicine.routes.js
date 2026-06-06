const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicine.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const medicineValidator = require('../validators/medicine.validator');

router.use(verifyToken);

router.get('/', medicineValidator.validateMedicineQuery, medicineController.getAllMedicines);
router.post('/interactions', requireRole('doctor', 'pharmacist', 'admin'), medicineController.checkInteractions);
router.get('/:id', medicineValidator.validateMedicineIdParam, medicineController.getMedicine);
router.post('/', requireRole('admin', 'pharmacist'), medicineValidator.validateCreateMedicine, medicineController.createNewMedicine);
router.put('/:id', requireRole('admin'), medicineValidator.validateUpdateMedicine, medicineController.updateExistingMedicine);
router.delete('/:id', requireRole('admin'), medicineValidator.validateMedicineIdParam, medicineController.removeExistingMedicine);

module.exports = router;
