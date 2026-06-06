const billingService = require('../services/billing.service');
const Invoice = require('../models/Invoice.model');
const Patient = require('../models/Patient.model');
const { extractActor } = require('../utils/auditLogger');
const { generateReceiptPdf } = require('../utils/generateReceiptPdf');

const createInvoice = async (req, res, next) => {
  try {
    const { patientId } = req.body;
    const actor = extractActor(req);
    const invoice = await billingService.createConsolidatedInvoice(patientId, req.body, actor);
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

const payInvoice = async (req, res, next) => {
  try {
    const actor = extractActor(req);
    const invoice = await billingService.processPayment(req.params.id, req.body, actor.userId);
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

const listInvoices = async (req, res, next) => {
  try {
    const { patientId, paymentStatus } = req.query;
    // Simple find for now, can be scoped later
    const query = {};
    if (patientId) query.patientId = patientId;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
    const invoices = await Invoice.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
};

const getInvoicePayments = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('payments.processedBy', 'firstName lastName role')
      .lean();
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.status(200).json({ success: true, data: invoice.payments });
  } catch (error) {
    next(error);
  }
};

const applyInsurance = async (req, res, next) => {
  try {
    const actor = extractActor(req);
    const invoice = await billingService.applyInsurance(req.params.id, req.body, actor.userId);
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

const updateInsuranceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { 'insurance.insuranceStatus': status },
      { new: true }
    );
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

const downloadReceipt = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('patientId').populate('payments.processedBy').lean();
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    // Patient Guard
    if (req.session.user.role === 'patient' && invoice.patientId._id.toString() !== req.session.user.patientRef) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const patient = invoice.patientId;
    const cashierName = req.session.user.name || 'Staff';
    
    const buffer = await generateReceiptPdf(invoice, patient, cashierName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${invoice._id.toString().slice(-8)}.pdf"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInvoice,
  payInvoice,
  listInvoices,
  getInvoicePayments,
  applyInsurance,
  updateInsuranceStatus,
  downloadReceipt
};
