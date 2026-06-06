import { validationResult } from 'express-validator'
import { sendError } from '../utils/responseHandler.js'

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array())
  }
  next()
}
