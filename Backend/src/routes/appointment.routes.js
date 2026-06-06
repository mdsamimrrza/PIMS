const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(verifyToken);

router.post('/', requireRole('receptionist', 'admin'), appointmentController.createAppointment);
router.get('/', appointmentController.listAppointments);

module.exports = router;
