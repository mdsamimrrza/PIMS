import { ROLES } from '../constants/roles';

const VALID_ROLES = Object.values(ROLES);

const ROLE_KEY = 'pims_role';
const USER_KEY = 'pims_user';
const REMEMBER_KEY = 'pims_remember';
const LOGIN_TIME_KEY = 'pims_login_at';

function parseStoredJson(key) {
  const value = localStorage.getItem(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

export function getStoredLoginTime() {
  return localStorage.getItem(LOGIN_TIME_KEY);
}

export function getStoredUser() {
  return parseStoredJson(USER_KEY);
}

export function getStoredRole() {
  const role = localStorage.getItem(ROLE_KEY) || getStoredUser()?.role || '';
  return VALID_ROLES.includes(role) ? role : '';
}

export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

export function getStoredDisplayName() {
  const user = getStoredUser();

  if (!user) {
    return '';
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.name || user.email || '';
}

export function getRoleHomePath(role) {
  if (!isValidRole(role)) {
    return '/login';
  }

  switch (role) {
    case ROLES.PATIENT:
      return '/patient';
    case ROLES.PHARMACIST:
      return '/pharmacist';
    case ROLES.ADMIN:
      return '/admin';
    case ROLES.RECEPTIONIST:
      return '/receptionist';
    case ROLES.CASHIER:
      return '/billing';
    case ROLES.NURSE:
      return '/nurse';
    case ROLES.LAB_TECH:
      return '/lab';
    case ROLES.DOCTOR:
    default:
      return '/dashboard';
  }
}

export function getRoleAccessPath(role) {
  if (role === ROLES.PATIENT) {
    return '/';
  }

  if (isValidRole(role)) {
    return '/portals';
  }

  return '/';
}

export function setAuthSession({ user, rememberDevice = false, loggedInAt = new Date().toISOString() }) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (isValidRole(user.role)) {
      localStorage.setItem(ROLE_KEY, user.role);
    } else {
      localStorage.removeItem(ROLE_KEY);
    }
  }

  localStorage.setItem(LOGIN_TIME_KEY, loggedInAt);

  if (rememberDevice) {
    localStorage.setItem(REMEMBER_KEY, 'true');
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

export function updateStoredUser(user) {
  if (!user) {
    return;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (isValidRole(user.role)) {
    localStorage.setItem(ROLE_KEY, user.role);
  } else {
    localStorage.removeItem(ROLE_KEY);
  }
}

export function clearSession() {
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem(LOGIN_TIME_KEY);
}
