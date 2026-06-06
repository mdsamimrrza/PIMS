const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const userValidator = require('../validators/user.validator');

router.use(verifyToken);

router.get('/', requireRole('admin', 'receptionist', 'doctor', 'nurse'), userValidator.validateUserQuery, userController.getAllUsers);
router.get('/:id', requireRole('admin', 'receptionist', 'doctor', 'nurse'), userValidator.validateUserIdParam, userController.getSingleUser);

// Restricted to admin only
router.post('/', requireRole('admin'), userValidator.validateCreateUser, userController.createNewUser);
router.delete('/:id/permanent', requireRole('admin'), userValidator.validateUserIdParam, userController.removeUserPermanently);
router.put('/:id', requireRole('admin'), userValidator.validateUpdateUser, userController.updateExistingUser);
router.delete('/:id', requireRole('admin'), userValidator.validateUserIdParam, userController.removeUser);

module.exports = router;
