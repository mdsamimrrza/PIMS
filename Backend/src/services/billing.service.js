const mongoose = require('mongoose');
const Invoice = require('../models/Invoice.model');
const PharmacyOrder = require('../models/PharmacyOrder.model');
const { Sequence } = require('../models/Sequence.model');
const Bed = require('../models/Bed.model');
const { logAudit } = require('../utils/auditLogger');
const { BILLING } = require('../constants/auditActions');

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const sequence = await Sequence.findOneAndUpdate(
    { name: 'invoice_number' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return `INV-${year}-${String(sequence.value).padStart(6, '0')}`;
};

// Gap 1: GST Calculation
const calculateGst = (lineItems) => {
  let medicineGst = 0, serviceGst = 0, subtotal = 0;
  for (const item of lineItems) {
    subtotal += item.amount;
    if (item.category === 'medicine') {
      item.gstRate = 5;
      item.gstAmount = parseFloat((item.amount * 0.05).toFixed(2));
      medicineGst += item.gstAmount;
    } else if (['room_charge', 'service'].includes(item.category)) {
      item.gstRate = 12;
      item.gstAmount = parseFloat((item.amount * 0.12).toFixed(2));
      serviceGst += item.gstAmount;
    } else {
      item.gstRate = 0;
      item.gstAmount = 0;
    }
  }
  const totalGst = parseFloat((medicineGst + serviceGst).toFixed(2));
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    gst: {
      medicineRate: 5,
      serviceRate: 12,
      medicineAmount: parseFloat(medicineGst.toFixed(2)),
      serviceAmount: parseFloat(serviceGst.toFixed(2)),
      totalGst
    },
    grandTotal: parseFloat((subtotal + totalGst).toFixed(2))
  };
};

const createConsolidatedInvoice = async (patientId, payload, actor = null) => {
  const { admissionId, appointmentId, pharmacyOrderIds = [], customItems = [] } = payload;
  const invoiceItems = [];

  // Pharmacy Orders
  for (const orderId of pharmacyOrderIds) {
    const order = await PharmacyOrder.findById(orderId);
    if (!order) continue;
    invoiceItems.push({
      description: `Pharmacy Order ${order.orderId || order._id}`,
      category: 'medicine',
      amount: order.totalAmount,
      referenceId: order._id,
    });
  }

  // Custom Items
  for (const item of customItems) {
    invoiceItems.push({
      description: item.description,
      category: item.category || 'other',
      amount: item.amount,
    });
  }

  const { subtotal, gst, grandTotal } = calculateGst(invoiceItems);
  const discount = payload.discount || 0;
  const finalGrandTotal = parseFloat((grandTotal - discount).toFixed(2));

  const invoiceNumber = await generateInvoiceNumber();
  const invoice = await Invoice.create({
    invoiceNumber,
    patientId,
    admissionId: admissionId || null,
    appointmentId: appointmentId || null,
    items: invoiceItems,
    subtotal,
    gst,
    discount,
    grandTotal: finalGrandTotal,
    amountDue: finalGrandTotal
  });

  if (actor) {
    logAudit({
      actor,
      action: BILLING.INVOICE_CREATED,
      module: 'billing',
      resource: { collection: 'Invoice', docId: invoice._id },
      diff: { after: { grandTotal: finalGrandTotal, subtotal, items: invoiceItems.length } }
    });
  }

  return invoice;
};

// Gap 2: Partial Payments
const processPayment = async (invoiceId, paymentData, actorId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw validationError('Invoice not found');

  if (['paid', 'refunded'].includes(invoice.paymentStatus)) {
    throw validationError(`Cannot process payment for an invoice that is already ${invoice.paymentStatus}`);
  }

  const amount = parseFloat(paymentData.amount);
  if (isNaN(amount) || amount <= 0) throw validationError('Invalid payment amount');
  if (amount > invoice.amountDue + 0.01) throw validationError(`Payment amount ₹${amount} exceeds amount due ₹${invoice.amountDue}`);

  invoice.payments.push({
    amount,
    method: paymentData.method,
    reference: paymentData.reference,
    notes: paymentData.notes,
    processedBy: actorId,
    processedAt: new Date()
  });

  await invoice.save();

  // Mark pharmacy orders paid if fully paid
  if (invoice.paymentStatus === 'paid') {
    const pharmacyOrderIds = invoice.items
      .filter(item => item.category === 'medicine' && item.referenceId)
      .map(item => item.referenceId);
    
    if (pharmacyOrderIds.length > 0) {
      await PharmacyOrder.updateMany(
        { _id: { $in: pharmacyOrderIds } },
        { $set: { paymentStatus: 'Paid' } }
      );
    }
  }

  return invoice;
};

// Gap 3: Insurance
const applyInsurance = async (invoiceId, insuranceData, actorId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw validationError('Invoice not found');

  if (['paid', 'refunded'].includes(invoice.paymentStatus)) {
    throw validationError('Cannot apply insurance to a paid/refunded invoice');
  }

  const covered = parseFloat(insuranceData.coveredAmount);
  const copay = parseFloat(insuranceData.patientCopay);

  if (covered + copay > invoice.grandTotal + 0.01) {
    throw validationError('Total insurance + copay exceeds grand total');
  }

  invoice.insurance = {
    provider: insuranceData.provider,
    policyNumber: insuranceData.policyNumber,
    approvalCode: insuranceData.approvalCode,
    coveredAmount: covered,
    patientCopay: copay,
    insuranceStatus: 'approved',
    submittedAt: new Date()
  };

  // Auto-push insurance payment
  if (covered > 0) {
    invoice.payments.push({
      amount: covered,
      method: 'insurance',
      reference: insuranceData.approvalCode,
      notes: 'Insurance settlement',
      processedBy: actorId,
      processedAt: new Date()
    });
  }

  await invoice.save();
  return invoice;
};

const createAdmissionInvoice = async (admission, actor) => {
  const stayDuration = Math.ceil((new Date() - new Date(admission.admittedAt)) / (1000 * 60 * 60 * 24)) || 1;
  const bed = await Bed.findById(admission.bedRef);
  const bedRate = bed?.pricePerDay || 500;
  const roomTotal = stayDuration * bedRate;
  
  const invoiceItems = [{ 
    description: `Room Charges (${stayDuration} days @ ${bedRate}/day)`, 
    category: 'room_charge', 
    amount: roomTotal, 
    referenceId: admission._id 
  }];
  
  return await createConsolidatedInvoice(admission.patientRef, { admissionId: admission._id, customItems: invoiceItems }, actor);
};

module.exports = {
  generateInvoiceNumber,
  calculateGst,
  createConsolidatedInvoice,
  processPayment,
  applyInsurance,
  createAdmissionInvoice
};
