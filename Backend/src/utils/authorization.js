const Patient = require('../models/Patient.model');
const Invoice = require('../models/Invoice.model');
const Prescription = require('../models/Prescription.model');
const PharmacyOrder = require('../models/PharmacyOrder.model');
const Admission = require('../models/Admission.model');
const Vitals = require('../models/Vitals.model');

const getActorId = (actor) => String(actor?.id || actor?._id || '');

const getPatientIdForActor = async (actor) => {
  const userId = getActorId(actor);

  if (!userId) {
    return null;
  }

  const patient = await Patient.findOne({ userId }).select('_id').lean();
  return patient?._id ? String(patient._id) : null;
};

const canAccessInvoice = async (actor, invoice) => {
  const role = actor?.role;
  const actorId = getActorId(actor);

  if (!invoice || !role) {
    return false;
  }

  if (role === 'ADMIN' || role === 'CASHIER') {
    return true;
  }

  if (role === 'PATIENT') {
    const patientId = await getPatientIdForActor(actor);
    return Boolean(patientId && patientId === String(invoice.patientId));
  }

  if (role === 'DOCTOR') {
    const hasPrescription = await Prescription.exists({ patientId: invoice.patientId, doctorId: actorId });
    return Boolean(hasPrescription);
  }

  if (role === 'PHARMACIST') {
    const hasOrder = await PharmacyOrder.exists({ patientId: invoice.patientId, pharmacistId: actorId });
    return Boolean(hasOrder);
  }

  return false;
};

const buildInvoiceScopeForActor = async (actor, filters = {}) => {
  const scope = {};
  const role = actor?.role;
  const actorId = getActorId(actor);

  if (filters.paymentStatus) {
    scope.paymentStatus = filters.paymentStatus;
  }

  if (role === 'ADMIN' || role === 'CASHIER') {
    if (filters.patientId) {
      scope.patientId = filters.patientId;
    }
    return scope;
  }

  if (role === 'PATIENT') {
    const patientId = await getPatientIdForActor(actor);
    if (!patientId) {
      return { _id: null };
    }
    scope.patientId = patientId;
    return scope;
  }

  if (role === 'DOCTOR') {
    const patientIds = await Prescription.distinct('patientId', { doctorId: actorId });
    scope.patientId = filters.patientId
      ? { $in: patientIds.filter((id) => String(id) === String(filters.patientId)) }
      : { $in: patientIds };
    return scope;
  }

  if (role === 'PHARMACIST') {
    const patientIds = await PharmacyOrder.distinct('patientId', { pharmacistId: actorId, patientId: { $ne: null } });
    scope.patientId = filters.patientId
      ? { $in: patientIds.filter((id) => String(id) === String(filters.patientId)) }
      : { $in: patientIds };
    return scope;
  }

  return { _id: null };
};

const canAccessAuditResource = async (actor, collection, docId) => {
  const normalizedCollection = String(collection || '').trim();
  const actorId = getActorId(actor);

  if (actor?.role === 'ADMIN') {
    return true;
  }

  if (!normalizedCollection || !docId) {
    return false;
  }

  if (actor?.role === 'CASHIER') {
    return normalizedCollection === 'Invoice' && Boolean(await Invoice.exists({ _id: docId }));
  }

  if (actor?.role === 'DOCTOR') {
    if (normalizedCollection === 'Prescription') {
      return Boolean(await Prescription.exists({ _id: docId, doctorId: actorId }));
    }

    if (normalizedCollection === 'Patient') {
      return Boolean(await Prescription.exists({ patientId: docId, doctorId: actorId }));
    }

    return false;
  }

  if (actor?.role === 'PHARMACIST') {
    if (normalizedCollection === 'Prescription') {
      return Boolean(await Prescription.exists({ _id: docId }));
    }

    if (normalizedCollection === 'Patient') {
      return Boolean(await PharmacyOrder.exists({ patientId: docId }));
    }

    if (normalizedCollection === 'Inventory' || normalizedCollection === 'Medicine' || normalizedCollection === 'PharmacyOrder') {
      return true;
    }

    return false;
  }

  if (actor?.role === 'NURSE') {
    if (normalizedCollection === 'Admission') {
      return Boolean(await Admission.exists({ _id: docId }));
    }

    if (normalizedCollection === 'Vitals') {
      return Boolean(await Vitals.exists({ _id: docId }));
    }
  }

  return false;
};

module.exports = {
  getPatientIdForActor,
  canAccessInvoice,
  buildInvoiceScopeForActor,
  canAccessAuditResource
};
