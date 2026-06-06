const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    atcCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    batchId: {
      type: String,
      required: true,
      trim: true,
    },
    currentStock: {
      type: Number,
      required: true,
      min: 0,
    },
    threshold: {
      type: Number,
      required: true,
      min: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    storage: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['STABLE', 'LOW STOCK', 'NEAR EXPIRY', 'EXPIRED'],
      default: 'STABLE',
    },
  },
  {
    timestamps: true,
  }
);

inventorySchema.index({ medicineId: 1, batchId: 1 }, { unique: true });
inventorySchema.index({ atcCode: 1, createdAt: -1 });
inventorySchema.index({ status: 1, createdAt: -1 });
inventorySchema.index({ expiryDate: 1 });

inventorySchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
