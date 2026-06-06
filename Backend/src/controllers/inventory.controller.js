const {
  createInventoryItem,
  deleteInventoryItem,
  getInventoryAudit,
  listInventory,
  updateInventoryItem,
} = require('../services/inventory.service');
const { sendError, sendSuccess } = require('../utils/responseHandler');
const { extractActor } = require('../utils/auditLogger');

const getAllInventory = async (req, res) => {
  try {
    const { items, pagination } = await listInventory(req.query || {});
    return sendSuccess(res, { inventory: items, pagination }, 'Inventory loaded');
  } catch (error) {
    return sendError(res, error.message || 'Failed to load inventory', error.statusCode || 500);
  }
};

const getInventoryAuditReport = async (req, res) => {
  try {
    const audit = await getInventoryAudit(req.query || {});
    return sendSuccess(res, audit, 'Inventory audit loaded');
  } catch (error) {
    return sendError(res, error.message || 'Failed to load inventory audit', error.statusCode || 500);
  }
};

const createNewInventoryItem = async (req, res) => {
  try {
    const { medicineId, batchId, currentStock, threshold, expiryDate } = req.body || {};

    if (!medicineId || !batchId || currentStock === undefined || threshold === undefined || !expiryDate) {
      return sendError(
        res,
        'medicineId, batchId, currentStock, threshold, and expiryDate are required',
        400
      );
    }

    const actor = extractActor(req);
    const item = await createInventoryItem(req.body || {}, actor);
    return sendSuccess(res, { item }, 'Inventory item created', 201);
  } catch (error) {
    return sendError(res, error.message || 'Failed to create inventory item', error.statusCode || 500);
  }
};

const updateExistingInventoryItem = async (req, res) => {
  try {
    const actor = extractActor(req);
    const item = await updateInventoryItem(req.params.id, req.body || {}, actor);
    return sendSuccess(res, { item }, 'Inventory item updated');
  } catch (error) {
    return sendError(res, error.message || 'Failed to update inventory item', error.statusCode || 500);
  }
};

const deleteExistingInventoryItem = async (req, res) => {
  try {
    const actor = extractActor(req);
    const item = await deleteInventoryItem(req.params.id, actor);
    return sendSuccess(res, { item }, 'Inventory item deleted');
  } catch (error) {
    return sendError(res, error.message || 'Failed to delete inventory item', error.statusCode || 500);
  }
};

module.exports = {
  getAllInventory,
  getInventoryAuditReport,
  createNewInventoryItem,
  updateExistingInventoryItem,
  deleteExistingInventoryItem
};
