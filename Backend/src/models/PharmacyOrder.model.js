const mongoose = require('mongoose');

const pharmacyOrderItemSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    batchId: {
      type: String,
      required: true,
      trim: true,
    },
    quantityDispensed: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const pharmacyOrderSchema = new mongoose.Schema(
  {
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null, // Null if it's a direct OTC sale
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null, // Null if anonymous walk-in for OTC
    },
    pharmacistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [pharmacyOrderItemSchema],
      required: true,
      validate: [v => v.length > 0, 'At least one item is required'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Partially Filled', 'Completed', 'Cancelled'],
      default: 'Completed',
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid'],
      default: 'Unpaid',
    },
  },
  {
    timestamps: true,
  }
);

pharmacyOrderSchema.index({ prescriptionId: 1 });
pharmacyOrderSchema.index({ patientId: 1 });
pharmacyOrderSchema.index({ createdAt: -1 });

pharmacyOrderSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const PharmacyOrder = mongoose.models.PharmacyOrder || mongoose.model('PharmacyOrder', pharmacyOrderSchema);

module.exports = PharmacyOrder;
