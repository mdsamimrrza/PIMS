import { 
  createValidator, 
  requireObjectId, 
  optionalNumberRange, 
  optionalString, 
  optionalDate,
  isProvided,
  addError
} from './validate.js';

export const validateRecordVitals = createValidator((req) => {
  const errors = [];
  const body = req.body || {};
  const v = body.vitals || {};

  requireObjectId(errors, 'patientRef', body.patientRef);
  requireObjectId(errors, 'admissionRef', body.admissionRef);

  if (!isProvided(body.vitals) || typeof body.vitals !== 'object') {
    addError(errors, 'vitals', 'vitals object is required');
  } else {
    // Check at least one vitals subfield
    const vitalsFields = ['bp', 'hr', 'spo2', 'temp', 'rr', 'gcs'];
    const hasAny = vitalsFields.some(f => isProvided(v[f]));
    if (!hasAny) {
      addError(errors, 'vitals', 'At least one vitals measurement must be present');
    }

    // BP specific logic
    if (isProvided(v.bp)) {
      const bp = v.bp;
      optionalNumberRange(errors, 'vitals.bp.systolic', bp.systolic, 40, 300);
      optionalNumberRange(errors, 'vitals.bp.diastolic', bp.diastolic, 20, 200);

      if (isProvided(bp.systolic) && !isProvided(bp.diastolic)) {
        addError(errors, 'vitals.bp.diastolic', 'Diastolic is required when systolic is provided');
      }
      if (!isProvided(bp.systolic) && isProvided(bp.diastolic)) {
        addError(errors, 'vitals.bp.systolic', 'Systolic is required when diastolic is provided');
      }
      if (isProvided(bp.systolic) && isProvided(bp.diastolic) && bp.systolic <= bp.diastolic) {
        addError(errors, 'vitals.bp.systolic', 'Systolic must be greater than diastolic');
      }
    }

    optionalNumberRange(errors, 'vitals.hr', v.hr, 0, 300);
    optionalNumberRange(errors, 'vitals.spo2', v.spo2, 0, 100);
    optionalNumberRange(errors, 'vitals.temp', v.temp, 25, 45);
    optionalNumberRange(errors, 'vitals.rr', v.rr, 0, 100);
    optionalNumberRange(errors, 'vitals.gcs', v.gcs, 3, 15);
  }

  optionalString(errors, 'notes', body.notes);
  if (isProvided(body.notes) && body.notes.length > 500) {
    addError(errors, 'notes', 'Notes cannot exceed 500 characters');
  }

  if (isProvided(body.recordedAt)) {
    optionalDate(errors, 'recordedAt', body.recordedAt);
    const date = new Date(body.recordedAt);
    const now = Date.now();
    
    if (!isNaN(date.getTime())) {
      if (date.getTime() > now + 10 * 60 * 1000) {
        addError(errors, 'recordedAt', 'recordedAt cannot be more than 10 minutes in the future');
      }
      if (date.getTime() < now - 24 * 60 * 60 * 1000) {
        addError(errors, 'recordedAt', 'recordedAt cannot be more than 24 hours in the past');
      }
    }
  }

  return errors;
});

export const validateVoidVitals = createValidator((req) => {
  const errors = [];
  const body = req.body || {};

  if (!isProvided(body.voidReason) || typeof body.voidReason !== 'string' || body.voidReason.trim().length < 10) {
    addError(errors, 'voidReason', 'voidReason is required and must be at least 10 characters long');
  }

  return errors;
});
