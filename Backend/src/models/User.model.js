const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'doctor', 'pharmacist', 'patient', 'nurse', 'receptionist', 'cashier', 'lab_tech'],
      required: true,
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString?.() || ret.id;
    delete ret.passwordHash;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetTokenExpiresAt;
    delete ret.passwordChangedAt;
    delete ret.__v;
    return ret;
  },
});

userSchema.methods.toSafeObject = function toSafeObject() {
  return this.toJSON();
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
