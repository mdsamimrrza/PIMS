import { ROLES } from './roles';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', roles: [ROLES.DOCTOR] },
  { to: '/pharmacist', label: 'Dashboard', icon: 'dashboard', roles: [ROLES.PHARMACIST] },
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', roles: [ROLES.ADMIN] },
  { to: '/atc', label: 'ATC Classification', icon: 'atc', roles: [ROLES.DOCTOR, ROLES.ADMIN] },
  { to: '/prescription/new', label: 'New Prescription', icon: 'plusCircle', roles: [ROLES.DOCTOR] },
  { to: '/prescriptions', label: 'Prescriptions', icon: 'prescription', roles: [ROLES.DOCTOR, ROLES.PHARMACIST] },
  { to: '/inventory', label: 'Inventory', icon: 'inventory', roles: [ROLES.PHARMACIST] },
  { to: '/alerts', label: 'Alerts', icon: 'alert', roles: [ROLES.PHARMACIST] },
  { to: '/reports', label: 'Reports', icon: 'reports', roles: [ROLES.ADMIN] },
  { to: '/inventory/audit', label: 'Inventory Audit', icon: 'inventory', roles: [ROLES.ADMIN] },
  { to: '/admin/audit', label: 'System Audit', icon: 'history', roles: [ROLES.ADMIN] },
  { to: '/admin/users', label: 'User Management', icon: 'users', roles: [ROLES.ADMIN] },
  { to: '/receptionist', label: 'Admissions', icon: 'user-plus', roles: [ROLES.RECEPTIONIST, ROLES.ADMIN] },
  { to: '/wards', label: 'Wards', icon: 'grid', roles: [ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.ADMIN] },
  { to: '/billing', label: 'Billing Desk', icon: 'inventory', roles: [ROLES.CASHIER] },
  { to: '/emergency/queue', label: 'Emergency', icon: 'alert', roles: [ROLES.DOCTOR, ROLES.NURSE, ROLES.PHARMACIST, ROLES.ADMIN] },
  { to: '/emergency/checkin', label: 'A&E Check-in', icon: 'plusCircle', roles: [ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST] }
];

export const PAGE_TITLES = {
  '/dashboard': 'Doctor Dashboard',
  '/pharmacist': 'Pharmacist Dashboard',
  '/admin': 'Admin Dashboard',
  '/atc': 'ATC Drug Classification',
  '/prescription/new': 'New Prescription',
  '/prescriptions': 'Prescription Management',
  '/inventory': 'Inventory Management',
  '/alerts': 'System Alerts',
  '/reports': 'Reports & Analytics',
  '/inventory/audit': 'Inventory Audit',
  '/admin/audit': 'System Audit Logs',
  '/admin/users': 'User Management',
  '/wards': 'Ward & Bed Management',
  '/receptionist': 'Reception Desk',
  '/billing': 'Billing & Cashier',
  '/patient': 'Patient Portal',
  '/patient/profile': 'Health Record',
  '/patient/prescriptions': 'Prescription Center',
  '/patient/change-password': 'Change Password',
  '/change-password': 'Change Password',
  '/emergency/queue': 'Emergency Queue',
  '/emergency/checkin': 'A&E Check-in'
};

export function getNavigationForRole(role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function getPageTitle(pathname) {
  const directMatch = PAGE_TITLES[pathname];
  if (directMatch) {
    return directMatch;
  }

  const partialMatch = Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key));
  return partialMatch?.[1] || 'PIMS';
}
