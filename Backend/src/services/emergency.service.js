const EmergencyVisit = require('../models/EmergencyVisit.model');
const Alert = require('../models/Alert.model');
const Prescription = require('../models/Prescription.model');
const Medicine = require('../models/Medicine.model');
const Patient = require('../models/Patient.model');
const inventoryService = require('./inventory.service');

const createVisit = async (actorId, payload) => {
  const { patientRef, walkInData, chiefComplaint, arrivalMode, triageScore, vitalsOnArrival } = payload;

  if (!chiefComplaint || !arrivalMode || triageScore === undefined) {
    const err = new Error('Missing required fields: chiefComplaint, arrivalMode, triageScore');
    err.status = 400;
    throw err;
  }

  if (patientRef) {
    const patient = await Patient.findById(patientRef);
    if (!patient) throw new Error('Patient not found');
  } else if (!walkInData || !walkInData.name) {
    const err = new Error('Walk-in data (name) or patientRef is required');
    err.status = 400;
    throw err;
  }

  const visit = await EmergencyVisit.create({
    patientRef,
    walkInData,
    chiefComplaint,
    arrivalMode,
    triageScore,
    vitalsOnArrival,
    triageNurse: actorId,
    status: 'waiting',
    timestamps: { arrivedAt: new Date() }
  });

  return visit;
};

const assignTriage = async (visitId, actorId, payload) => {
  const { triageScore, triageCategory, vitalsOnArrival, assignedDoctor } = payload;
  const visit = await EmergencyVisit.findById(visitId);
  if (!visit) throw new Error('Emergency visit not found');

  visit.triageScore = triageScore;
  visit.triageCategory = triageCategory;
  if (vitalsOnArrival) visit.vitalsOnArrival = { ...visit.vitalsOnArrival, ...vitalsOnArrival };
  if (assignedDoctor) visit.assignedDoctor = assignedDoctor;
  
  visit.triageNurse = actorId;
  visit.timestamps.triageAt = new Date();
  visit.status = 'in_triage';

  if (triageScore === 1) {
    await Alert.create({
      type: 'critical_vitals',
      message: 'CODE BLUE — ESI 1 patient arrived',
      targetRole: 'doctor',
      patientRef: visit.patientRef
    });
  }

  await visit.save();
  return await visit.populate('assignedDoctor', 'firstName lastName');
};

const getQueue = async () => {
  return await EmergencyVisit.find({
    status: { $in: ['waiting', 'in_triage', 'being_treated'] }
  })
  .sort({ triageScore: 1, 'timestamps.arrivedAt': 1 })
  .populate('assignedDoctor', 'firstName lastName')
  .populate('patientRef', 'firstName lastName uhid');
};

const dispenseOverride = async (visitId, actorId, payload) => {
  const { drugRef, qty } = payload;
  const visit = await EmergencyVisit.findById(visitId);
  if (!visit) throw new Error('Emergency visit not found');

  if (['discharged', 'absconded'].includes(visit.status)) {
    throw new Error('Cannot dispense for a closed visit');
  }

  // Reuse existing inventory deduction logic
  await inventoryService.consumeInventoryForPrescriptionItems([{
    medicineId: drugRef,
    quantity: qty
  }]);

  visit.overrideDispenses.push({
    drugRef,
    qty,
    dispensedBy: actorId,
    dispensedAt: new Date()
  });

  // Check for existing emergency prescription
  const existingRx = await Prescription.findOne({
    episode: visit._id,
    prescriptionType: 'emergency'
  });

  if (!existingRx) {
    await Prescription.create({
      rxId: `EMG-${Date.now()}`,
      patientId: visit.patientRef || null, // Might be null for walk-ins
      doctorId: visit.assignedDoctor || null,
      prescriptionType: 'emergency',
      priority: 'emergency',
      status: 'Emergency_Draft',
      episode: visit._id,
      items: [{
        medicineId: drugRef,
        atcCode: 'EMERGENCY',
        dose: 'AS DIRECTED',
        quantity: qty,
        frequency: 'STAT'
      }]
    });
  }

  await visit.save();
  return visit;
};

const signOverride = async (visitId, overrideIndex, actorId) => {
  const visit = await EmergencyVisit.findById(visitId);
  if (!visit) throw new Error('Emergency visit not found');

  const override = visit.overrideDispenses[overrideIndex];
  if (!override) throw new Error('Override dispense entry not found');
  if (override.signedBy) throw new Error('Override already signed');

  override.signedBy = actorId;
  override.signedAt = new Date();

  const hoursSinceDispensed = (new Date() - new Date(override.dispensedAt)) / (1000 * 60 * 60);
  let warning = null;
  if (hoursSinceDispensed > 2) {
    warning = 'This override was signed more than 2 hours after dispensing.';
  }

  await visit.save();
  return { data: visit, warning };
};

const getStreamData = async () => {
  return await getQueue();
};

module.exports = {
  createVisit,
  assignTriage,
  getQueue,
  dispenseOverride,
  signOverride,
  getStreamData
};
