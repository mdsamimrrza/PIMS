const mongoose = require('mongoose');
const { Schema } = mongoose;

const invoiceItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['room_charge', 'medicine', 'service', 'consultation', 'lab', 'other'],
      default: 'other',
      required: true
    },
    amount:    { type: Number, required: true, min: 0 },
    gstRate:   { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    referenceId: { type: Schema.Types.ObjectId, default: null }
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    admissionId: { type: Schema.Types.ObjectId, ref: 'Admission', default: null },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', default: null },
    items: [invoiceItemSchema],
    subtotal: { type: Number, default: 0 },
    gst: {
      medicineRate:   { type: Number, default: 5 },
      serviceRate:    { type: Number, default: 12 },
      medicineAmount: { type: Number, default: 0 },
      serviceAmount:  { type: Number, default: 0 },
      totalGst:       { type: Number, default: 0 }
    },
    discount:   { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    
    // Partial Payments (Gap 2)
    payments: [{
      amount:      { type: Number, required: true, min: 0.01 },
      method:      { type: String, enum: ['cash', 'card', 'upi', 'insurance'], required: true },
      reference:   { type: String, default: null },
      processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      processedAt: { type: Date, default: Date.now },
      notes:       { type: String, default: null }
    }],
    amountPaid:    { type: Number, default: 0 },
    amountDue:     { type: Number, default: 0 },
    paymentStatus: { 
      type: String, 
      enum: ['pending', 'partial', 'paid', 'refunded'], 
      default: 'pending' 
    },

    // Insurance (Gap 3)
    insurance: {
      provider:       { type: String, default: null },
      policyNumber:   { type: String, default: null },
      approvalCode:   { type: String, default: null },
      coveredAmount:  { type: Number, default: 0 },
      patientCopay:   { type: Number, default: 0 },
      insuranceStatus: { 
        type: String, 
        enum: ['not_applicable', 'pending', 'approved', 'rejected', 'partial'], 
        default: 'not_applicable' 
      },
      submittedAt:    { type: Date, default: null },
      settledAt:      { type: Date, default: null }
    }
  },
  { timestamps: true }
);

invoiceSchema.index({ patientId: 1, createdAt: -1 });
invoiceSchema.index({ paymentStatus: 1 });

// PRE-SAVE HOOKS
invoiceSchema.pre('save', function(next) {
  // 1. Recalculate payments (Gap 2)
  this.amountPaid = parseFloat(this.payments.reduce((s, p) => s + p.amount, 0).toFixed(2));
  this.amountDue = parseFloat((this.grandTotal - this.amountPaid).toFixed(2));
  
  if (this.amountPaid <= 0) {
    this.paymentStatus = 'pending';
  } else if (this.amountPaid < this.grandTotal - 0.01) {
    this.paymentStatus = 'partial';
  } else {
    this.paymentStatus = 'paid';
  }

  // 2. Validate Consistency (Gap 1)
  if (Math.abs(this.grandTotal - (this.subtotal + this.gst.totalGst - this.discount)) > 0.01) {
    return next(new Error(`Invoice grandTotal (${this.grandTotal}) inconsistent with subtotal (${this.subtotal}) + GST (${this.gst.totalGst}) - Discount (${this.discount}).`));
  }

  // 3. Validate Insurance (Gap 3)
  if (this.insurance.coveredAmount + this.insurance.patientCopay > this.grandTotal + 0.01) {
    return next(new Error('Insurance amounts exceed grandTotal.'));
  }

  next();
});

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;
