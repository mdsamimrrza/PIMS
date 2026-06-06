const { AuditLog } = require('../models/AuditLog');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { buildPagination, getPagination } = require('../utils/pagination');
const { canAccessAuditResource } = require('../utils/authorization');

const getAuditLogs = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { module, action, actorId, startDate, endDate, q } = req.query;

    const query = {};

    if (module) query.module = module;
    if (action) query.action = action;
    if (actorId) query.actor.userId = actorId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (q) {
      const regex = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { 'actor.name': regex },
        { 'resource.docId': q },
        { 'metadata.email': regex }
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query)
    ]);

    return sendSuccess(res, {
      logs,
      pagination: buildPagination({ page, limit, total })
    }, 'Audit logs retrieved successfully');
  } catch (error) {
    return sendError(res, error.message || 'Failed to retrieve audit logs', 500);
  }
};

const getAuditStats = async (req, res) => {
  try {
    const stats = await AuditLog.aggregate([
      {
        $facet: {
          byModule: [
            { $group: { _id: '$module', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          byAction: [
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          recentActivity: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    return sendSuccess(res, stats[0], 'Audit statistics retrieved successfully');
  } catch (error) {
    return sendError(res, error.message || 'Failed to retrieve audit statistics', 500);
  }
};

const getResourceHistory = async (req, res) => {
  try {
    const { collection, docId } = req.params;
    const allowed = await canAccessAuditResource(req.user, collection, docId);

    if (!allowed) {
      return sendError(res, 'Forbidden', 403);
    }
    
    const logs = await AuditLog.find({
      'resource.collection': collection,
      'resource.docId': docId
    }).sort({ createdAt: -1 }).lean();

    return sendSuccess(res, logs, 'Resource history retrieved successfully');
  } catch (error) {
    return sendError(res, error.message || 'Failed to retrieve resource history', 500);
  }
};

module.exports = {
  getAuditLogs,
  getAuditStats,
  getResourceHistory
};
