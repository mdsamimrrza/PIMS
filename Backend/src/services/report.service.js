const Alert = require('../models/Alert.model');
const Inventory = require('../models/Inventory.model');
const Patient = require('../models/Patient.model');
const Prescription = require('../models/Prescription.model');
const User = require('../models/User.model');

const buildDateFilter = (filters = {}) => {
  const range = {};
  const from = filters.from ?? filters.dateFrom;
  const to = filters.to ?? filters.dateTo;

  if (from) {
    const fromDate = new Date(from);
    if (!Number.isNaN(fromDate.getTime())) {
      range.$gte = fromDate;
    }
  }

  if (to) {
    const toDate = new Date(to);
    if (!Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      range.$lte = toDate;
    }
  }

  return Object.keys(range).length > 0 ? { createdAt: range } : {};
};

const getUsageLimit = (filters = {}) => {
  const value = Number(filters.limit ?? 10);

  if (!Number.isFinite(value) || value < 1) {
    return 10;
  }

  return Math.min(Math.trunc(value), 50);
};

const getSummaryReport = async (filters = {}) => {
  const prescriptionDateFilter = buildDateFilter(filters);

  const [
    activeUsers,
    totalUsers,
    unacknowledgedAlerts,
    prescriptionsByStatus,
    totalPrescriptions,
    inventoryItems,
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    User.countDocuments(),
    Alert.countDocuments({ isAcknowledged: false }),
    Prescription.aggregate([
      { $match: prescriptionDateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Prescription.countDocuments(prescriptionDateFilter),
    Inventory.find().populate('medicineId', 'mrp').lean(),
  ]);

  const statusCounts = prescriptionsByStatus.reduce((accumulator, item) => {
    accumulator[item._id] = item.count;
    return accumulator;
  }, {});

  const inventorySnapshot = inventoryItems.reduce(
    (summary, item) => {
      summary.totalItems += 1;
      summary.totalUnits += Number(item.currentStock || 0);
      summary.inventoryValue += Number(item.currentStock || 0) * Number(item.medicineId?.mrp || 0);
      return summary;
    },
    { totalItems: 0, totalUnits: 0, inventoryValue: 0 }
  );

  return {
    filters: {
      from: filters.from ?? filters.dateFrom ?? null,
      to: filters.to ?? filters.dateTo ?? null,
    },
    overview: {
      activeUsers,
      totalUsers,
      totalPrescriptions,
      unacknowledgedAlerts,
      inventoryItems: inventorySnapshot.totalItems,
      inventoryUnits: inventorySnapshot.totalUnits,
      inventoryValue: inventorySnapshot.inventoryValue,
      uptimeSeconds: Math.round(process.uptime()),
    },
    prescriptionStatusCounts: {
      Pending: statusCounts.Pending || 0,
      Processing: statusCounts.Processing || 0,
      Filled: statusCounts.Filled || 0,
      Cancelled: statusCounts.Cancelled || 0,
    },
  };
};

const getAtcUsageReport = async (filters = {}) => {
  const dateFilter = buildDateFilter(filters);
  const limit = getUsageLimit(filters);

  const usage = await Prescription.aggregate([
    { $match: dateFilter },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.atcCode',
        prescriptions: { $sum: 1 },
        urgentCount: {
          $sum: {
            $cond: ['$isUrgent', 1, 0],
          },
        },
      },
    },
    { $sort: { prescriptions: -1, _id: 1 } },
    { $limit: limit },
  ]);

  return {
    filters: {
      from: filters.from ?? filters.dateFrom ?? null,
      to: filters.to ?? filters.dateTo ?? null,
      limit,
    },
    usage: usage.map((item) => ({
      atcCode: item._id,
      prescriptions: item.prescriptions,
      urgentCount: item.urgentCount,
    })),
  };
};

const getFulfillmentReport = async (filters = {}) => {
  const dateFilter = buildDateFilter(filters);

  const [statusCounts, filledMetrics, dailyVolume] = await Promise.all([
    Prescription.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Prescription.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 'Filled',
        },
      },
      {
        $group: {
          _id: null,
          filledCount: { $sum: 1 },
          averageFulfillmentHours: {
            $avg: {
              $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60],
            },
          },
        },
      },
    ]),
    Prescription.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]),
  ]);

  const mappedStatusCounts = statusCounts.reduce((accumulator, item) => {
    accumulator[item._id] = item.count;
    return accumulator;
  }, {});

  const filled = filledMetrics[0] || {
    filledCount: 0,
    averageFulfillmentHours: 0,
  };

  return {
    filters: {
      from: filters.from ?? filters.dateFrom ?? null,
      to: filters.to ?? filters.dateTo ?? null,
    },
    statusCounts: {
      Pending: mappedStatusCounts.Pending || 0,
      Processing: mappedStatusCounts.Processing || 0,
      Filled: mappedStatusCounts.Filled || 0,
      Cancelled: mappedStatusCounts.Cancelled || 0,
    },
    fulfillment: {
      filledCount: filled.filledCount,
      averageFulfillmentHours: Number((filled.averageFulfillmentHours || 0).toFixed(2)),
    },
    dailyVolume: dailyVolume.map((item) => ({
      date: item._id,
      count: item.count,
    })),
  };
};

const getPatientForActor = async (actor) => {
  const userId = actor?.id || actor?._id;

  if (!userId) {
    const error = new Error('Patient account is not linked to a patient record');
    error.statusCode = 403;
    throw error;
  }

  const patient = await Patient.findOne({ userId });

  if (!patient) {
    const error = new Error('Patient account is not linked to a patient record');
    error.statusCode = 403;
    throw error;
  }

  return patient;
};

const getPatientSummaryReport = async (actor, filters = {}) => {
  const patient = await getPatientForActor(actor);
  const dateFilter = buildDateFilter(filters);
  const match = {
    ...dateFilter,
    patientId: patient._id,
  };

  const [statusCounts, latestPrescription] = await Promise.all([
    Prescription.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Prescription.findOne(match).sort({ createdAt: -1 }).select('rxId status createdAt isUrgent').lean(),
  ]);

  const mappedStatusCounts = statusCounts.reduce((accumulator, item) => {
    accumulator[item._id] = item.count;
    return accumulator;
  }, {});

  const totalPrescriptions = Object.values(mappedStatusCounts).reduce((sum, value) => sum + value, 0);

  return {
    filters: {
      from: filters.from ?? filters.dateFrom ?? null,
      to: filters.to ?? filters.dateTo ?? null,
    },
    patient: {
      id: patient._id,
      patientId: patient.patientId,
      name: patient.name,
    },
    overview: {
      totalPrescriptions,
      pending: mappedStatusCounts.Pending || 0,
      processing: mappedStatusCounts.Processing || 0,
      filled: mappedStatusCounts.Filled || 0,
      cancelled: mappedStatusCounts.Cancelled || 0,
      urgent: latestPrescription?.isUrgent ? 1 : 0,
      latestPrescriptionDate: latestPrescription?.createdAt || null,
      latestPrescriptionId: latestPrescription?.rxId || null,
    },
  };
};

module.exports = {
  getSummaryReport,
  getAtcUsageReport,
  getFulfillmentReport,
  getPatientSummaryReport
};
