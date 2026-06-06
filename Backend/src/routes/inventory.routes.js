const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const inventoryValidator = require('../validators/inventory.validator');

router.use(verifyToken);

router.get('/audit', requireRole('admin'), inventoryValidator.validateInventoryQuery, inventoryController.getInventoryAuditReport);
router.get('/', requireRole('pharmacist', 'admin'), inventoryValidator.validateInventoryQuery, inventoryController.getAllInventory);
router.post('/', requireRole('pharmacist'), inventoryValidator.validateCreateInventoryItem, inventoryController.createNewInventoryItem);
router.put('/:id', requireRole('pharmacist'), inventoryValidator.validateUpdateInventoryItem, inventoryController.updateExistingInventoryItem);
router.delete('/:id', requireRole('pharmacist'), inventoryValidator.validateInventoryIdParam, inventoryController.deleteExistingInventoryItem);

module.exports = router;
