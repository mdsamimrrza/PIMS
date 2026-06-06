const { 
  createMedicine, 
  getMedicineById, 
  listMedicines, 
  updateMedicine, 
  checkDrugInteractions, 
  removeMedicine 
} = require('../services/medicine.service');
const { sendError, sendSuccess } = require('../utils/responseHandler');

const getAllMedicines = async (_req, res) => {
  try {
    const { medicines, pagination } = await listMedicines(_req.query || {});
    return sendSuccess(res, { medicines, pagination }, 'Medicines loaded');
  } catch (error) {
    return sendError(res, error.message || 'Failed to load medicines', error.statusCode || 500);
  }
};

const getMedicine = async (req, res) => {
  try {
    const medicine = await getMedicineById(req.params.id);
    return sendSuccess(res, { medicine }, 'Medicine loaded');
  } catch (error) {
    return sendError(res, error.message || 'Failed to load medicine', error.statusCode || 500);
  }
};

const createNewMedicine = async (req, res) => {
  try {
    const { name, genericName, atcCode } = req.body || {};

    if (!name || !genericName || !atcCode) {
      return sendError(res, 'name, genericName, and atcCode are required', 400);
    }

    const medicine = await createMedicine(req.body || {});
    return sendSuccess(res, { medicine }, 'Medicine created', 201);
  } catch (error) {
    return sendError(res, error.message || 'Failed to create medicine', error.statusCode || 500);
  }
};

const updateExistingMedicine = async (req, res) => {
  try {
    const medicine = await updateMedicine(req.params.id, req.body || {});
    return sendSuccess(res, { medicine }, 'Medicine updated');
  } catch (error) {
    return sendError(res, error.message || 'Failed to update medicine', error.statusCode || 500);
  }
};

const removeExistingMedicine = async (req, res) => {
  try {
    const medicine = await removeMedicine(req.params.id);
    return sendSuccess(res, { medicine }, 'Medicine deleted');
  } catch (error) {
    return sendError(res, error.message || 'Failed to delete medicine', error.statusCode || 500);
  }
};

const checkInteractions = async (req, res) => {
  try {
    const { newDrugAtc, existingAtcCodes } = req.body || {};
    
    if (!newDrugAtc) {
      return sendError(res, 'newDrugAtc is required', 400);
    }

    const result = await checkDrugInteractions(newDrugAtc, existingAtcCodes || []);
    return sendSuccess(res, result, 'Drug interactions checked');
  } catch (error) {
    return sendError(res, error.message || 'Failed to check drug interactions', error.statusCode || 500);
  }
};

module.exports = {
  getAllMedicines,
  getMedicine,
  createNewMedicine,
  updateExistingMedicine,
  removeExistingMedicine,
  checkInteractions
};
