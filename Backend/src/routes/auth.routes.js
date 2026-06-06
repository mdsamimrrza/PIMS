const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const authValidator = require('../validators/auth.validator');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');

router.post('/setup-admin', authLimiter, authValidator.validateSetupAdmin, authController.setupAdmin);
router.post('/login', authLimiter, authValidator.validateLogin, authController.login);
router.post('/forgot-password', authLimiter, authValidator.validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', authLimiter, authValidator.validateResetPassword, authController.resetPasswordFlow);
router.put('/change-password', verifyToken, authValidator.validateChangePassword, authController.changePasswordFlow);
router.post('/logout', authController.logout);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
