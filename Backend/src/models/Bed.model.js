const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema(
  {
    bedCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    ward: {
      type: String,
      required: true,
      enum: ['ICU', 'ER', 'General', 'HDU', 'Isolation'],
      trim: true,
    },
    floor: {
      type: Number,
      default: 1,
    },
    room: {
      type: String,
    },
    type: {
      type: String,
      enum: ['general', 'icu', 'hdu', 'emergency', 'isolation'],
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'cleaning', 'maintenance'],
      default: 'available',
      index: true,
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },
    currentAdmission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      default: null,
    },
    lastSanitizedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient searching of available beds in a ward
bedSchema.index({ ward: 1, status: 1 });

bedSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Bed = mongoose.models.Bed || mongoose.model('Bed', bedSchema);

module.exports = Bed;
