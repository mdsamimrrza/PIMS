const mongoose = require('mongoose');
const PharmacyOrder = require('../models/PharmacyOrder.model');
const Prescription = require('../models/Prescription.model');
const Inventory = require('../models/Inventory.model');
const Medicine = require('../models/Medicine.model');
const { getInventoryStatus, syncInventoryAlertsForItem } = require('./inventory.service');

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const createPharmacyOrder = async (pharmacistId, payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { prescriptionId, patientId, items } = payload;

    if (!items || items.length === 0) {
      throw validationError('Order must contain at least one item.');
    }

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const { medicineId, batchId, quantityDispensed } = item;

      if (!medicineId || !batchId || !quantityDispensed) {
        throw validationError('Each item must have medicineId, batchId, and quantityDispensed');
      }

      // Find the specific batch
      const batch = await Inventory.findOne({ medicineId, batchId }).session(session);
      if (!batch) {
        throw validationError(`Batch ${batchId} for medicine not found in inventory.`);
      }

      if (batch.currentStock < quantityDispensed) {
        throw validationError(`Insufficient stock in batch ${batchId}. Available: ${batch.currentStock}`);
      }

      // Deduct stock
      batch.currentStock -= quantityDispensed;
      batch.status = getInventoryStatus({
        currentStock: batch.currentStock,
        threshold: batch.threshold,
        expiryDate: batch.expiryDate,
      });
      await batch.save({ session });
      await syncInventoryAlertsForItem(batch); // Fire alerts if low stock now

      // Get medicine pricing
      const medicine = await Medicine.findById(medicineId).session(session);
      if (!medicine) {
        throw validationError(`Medicine ${medicineId} not found.`);
      }

      const unitPrice = medicine.mrp || 0;
      const total = unitPrice * quantityDispensed;
      totalAmount += total;

      processedItems.push({
        medicineId,
        batchId,
        quantityDispensed,
        unitPrice,
        total,
      });
    }

    const order = await PharmacyOrder.create(
      [
        {
          prescriptionId: prescriptionId || null,
          patientId: patientId || null,
          pharmacistId,
          items: processedItems,
          totalAmount,
          status: 'Completed',
          paymentStatus: 'Unpaid', // To be paid at Cashier
        },
      ],
      { session }
    );

    // Update Prescription status if linked
    if (prescriptionId) {
      const prescription = await Prescription.findById(prescriptionId).session(session);
      if (prescription) {
        prescription.pharmacyStatus = 'Dispensed';
        // If all items are dispensed, we could set status = 'Filled', but let's keep it simple
        prescription.status = 'Filled'; 
        await prescription.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return order[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getPharmacyOrderById = async (orderId) => {
  const order = await PharmacyOrder.findById(orderId)
    .populate('patientId', 'name patientId')
    .populate('pharmacistId', 'firstName lastName')
    .populate('items.medicineId', 'name genericName');
  
  if (!order) {
    const error = new Error('Pharmacy order not found');
    error.statusCode = 404;
    throw error;
  }
  return order;
};

module.exports = {
  createPharmacyOrder,
  getPharmacyOrderById
};
