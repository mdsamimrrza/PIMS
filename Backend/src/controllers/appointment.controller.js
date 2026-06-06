const Appointment = require('../models/Appointment.model');

const createAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.create(req.body);
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

const listAppointments = async (req, res, next) => {
  try {
    const { status, doctorId, patientId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (doctorId) filter.doctorId = doctorId;
    if (patientId) filter.patientId = patientId;

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name patientId')
      .populate('doctorId', 'firstName lastName')
      .sort({ appointmentDate: 1 });

    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAppointment,
  listAppointments
};
