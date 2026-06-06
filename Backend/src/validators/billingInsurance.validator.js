const { body } = require('express-validator');

const validateInsurance = [
  body('coveredAmount').isFloat({ min: 0 }).withMessage('Covered amount must be a positive number'),
  body('patientCopay').isFloat({ min: 0 }).withMessage('Patient copay must be a positive number'),
  body('provider').isString().notEmpty().withMessage('Insurance provider is required'),
  body('policyNumber').isString().notEmpty().withMessage('Policy number is required'),
  body('approvalCode').isString().notEmpty().withMessage('Approval code is required')
];

module.exports = {
  validateInsurance
};
