const { body } = require('express-validator');

const validateRecordVitals = [
  body('patientRef').isMongoId().withMessage('Invalid patient ID'),
  body('admissionRef').isMongoId().withMessage('Invalid admission ID'),
  body('vitals').isObject().withMessage('Vitals data is required'),
  
  // BP Validation
  body('vitals.bp').optional().isObject(),
  body('vitals.bp.systolic').if(body('vitals.bp.diastolic').exists()).notEmpty().withMessage('Systolic required if diastolic provided'),
  body('vitals.bp.diastolic').if(body('vitals.bp.systolic').exists()).notEmpty().withMessage('Diastolic required if systolic provided'),
  body('vitals.bp.systolic').optional().custom((val, { req }) => {
    if (val <= req.body.vitals.bp.diastolic) {
      throw new Error('Systolic must be greater than diastolic');
    }
    return true;
  }),

  // Range checks
  body('vitals.hr').optional().isInt({ min: 0, max: 300 }),
  body('vitals.spo2').optional().isInt({ min: 0, max: 100 }),
  body('vitals.temp').optional().isFloat({ min: 25, max: 45 }),
  body('vitals.rr').optional().isInt({ min: 0, max: 100 }),
  body('vitals.gcs').optional().isInt({ min: 3, max: 15 }),

  body('notes').optional().isString().trim().isLength({ max: 500 }),
  
  body('recordedAt').optional().isISO8601().custom(val => {
    const time = new Date(val).getTime();
    const now = Date.now();
    if (time > now + 10 * 60 * 1000) throw new Error('Time cannot be in the future');
    if (time < now - 24 * 60 * 60 * 1000) throw new Error('Time cannot be more than 24h in the past');
    return true;
  }),

  // At least one subfield
  body('vitals').custom(v => {
    const keys = Object.keys(v);
    if (keys.length === 0) throw new Error('At least one vital sign is required');
    return true;
  })
];

const validateVoidVitals = [
  body('voidReason')
    .notEmpty().withMessage('Void reason is required')
    .isString().isLength({ min: 10 }).withMessage('Void reason must be at least 10 characters long')
];

module.exports = {
  validateRecordVitals,
  validateVoidVitals
};
