const Patient = require('../models/Patient.model');
const Medicine = require('../models/Medicine.model');

const allergyCheck = async (req, res, next) => {
  try {
    const patientId = req.body.patientRef || req.body.patientId;
    if (!patientId) return next();

    const patient = await Patient.findById(patientId);
    if (!patient || !patient.allergies || patient.allergies.length === 0) {
      return next();
    }

    const warnings = [];
    const items = req.body.items || [];

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicineId);
      if (!medicine) continue;

      for (const allergy of patient.allergies) {
        const substance = allergy.substance.toLowerCase();
        
        // Match against medicine name
        if (medicine.name.toLowerCase().includes(substance)) {
          warnings.push(`Patient is allergic to ${allergy.substance}. Conflict with ${medicine.name}.`);
        }
        
        // Match against generic name or ATC code if applicable
        if (medicine.genericName && medicine.genericName.toLowerCase().includes(substance)) {
          warnings.push(`Patient is allergic to ${allergy.substance}. Conflict with generic ${medicine.genericName}.`);
        }
      }
    }

    req.allergyWarnings = warnings;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = allergyCheck;
