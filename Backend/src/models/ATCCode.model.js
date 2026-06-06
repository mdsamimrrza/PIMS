const mongoose = require('mongoose');

const atcCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    parentCode: {
      type: String,
      default: null,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const ATCCode = mongoose.models.ATCCode || mongoose.model('ATCCode', atcCodeSchema);

module.exports = ATCCode;
