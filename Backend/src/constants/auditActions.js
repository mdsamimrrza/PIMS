export const ADMISSION = {
  CREATED:    'admission.created',
  DISCHARGED: 'admission.discharged',
  UPDATED:    'admission.updated',
  CANCELLED:  'admission.cancelled'
};

export const BED = {
  STATUS_CHANGED: 'bed.status_changed',
  ASSIGNED:       'bed.assigned',
  RELEASED:       'bed.released'
};

export const BILLING = {
  INVOICE_CREATED:    'billing.invoice_created',
  PAYMENT_PROCESSED:  'billing.payment_processed',
  INSURANCE_APPLIED:  'billing.insurance_applied',
  STATUS_CHANGED:     'billing.status_changed',
  RECEIPT_DOWNLOADED: 'billing.receipt_downloaded'
};

export const PRESCRIPTION = {
  CREATED:   'prescription.created',
  FILLED:    'prescription.filled',
  CANCELLED: 'prescription.cancelled',
  UPDATED:   'prescription.updated'
};

export const USER = {
  CREATED:         'user.created',
  DEACTIVATED:     'user.deactivated',
  REACTIVATED:     'user.reactivated',
  PASSWORD_CHANGED:'user.password_changed',
  ROLE_CHANGED:    'user.role_changed',
  DELETED:         'user.deleted'
};

export const PATIENT = {
  CREATED: 'patient.created',
  UPDATED: 'patient.updated'
};

export const VITALS = {
  RECORDED: 'vitals.recorded',
  VOIDED:   'vitals.voided'
};

export const EMERGENCY = {
  VISIT_CREATED:      'emergency.visit_created',
  TRIAGE_ASSIGNED:    'emergency.triage_assigned',
  OVERRIDE_DISPENSED: 'emergency.override_dispensed',
  OVERRIDE_SIGNED:    'emergency.override_signed'
};

export const INVENTORY = {
  ITEM_CREATED:   'inventory.item_created',
  ITEM_UPDATED:   'inventory.item_updated',
  ITEM_DELETED:   'inventory.item_deleted',
  STOCK_ADJUSTED: 'inventory.stock_adjusted'
};

export const SYSTEM = {
  LOGIN:         'system.login',
  LOGOUT:        'system.logout',
  LOGIN_FAILED:  'system.login_failed'
};
