const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled', 'No-Show'],
      default: 'Scheduled',
    },
    queueNumber: {
      type: Number,
      default: null, // Useful for walk-ins
    },
    reasonForVisit: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ status: 1 });

appointmentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
