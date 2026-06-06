import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROLES } from '../constants/roles';
import { getRoleHomePath, getStoredRole, isValidRole } from '../utils/session';

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = useSelector((state) => state.auth.user);
  const role = useSelector((state) => state.auth.role) || getStoredRole();
  const authStatus = useSelector((state) => state.auth.status);
  const isAuthenticated = authStatus === 'authenticated' && Boolean(user);

  if (authStatus === 'checking') {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  if (!isValidRole(role)) {
    return <Navigate replace to="/login" />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate replace to={getRoleHomePath(role)} />;
  }

  return children;
}

export function isAuthenticatedRole(role) {
  return Object.values(ROLES).includes(role);
}
