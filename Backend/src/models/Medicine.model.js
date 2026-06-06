const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    genericName: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      default: '',
      trim: true,
    },
    atcCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    strength: {
      type: String,
      default: '',
      trim: true,
    },
    dosageForm: {
      type: String,
      enum: ['Tablet', 'Capsule', 'Injection', 'Syrup', 'Cream', 'Inhaler'],
      default: 'Tablet',
    },
    manufacturer: {
      type: String,
      default: '',
      trim: true,
    },
    mrp: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

medicineSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema);

module.exports = Medicine;
