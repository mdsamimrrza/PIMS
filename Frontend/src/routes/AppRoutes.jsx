import { Navigate, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './ProtectedRoute';
import { ROLES } from '../constants/roles';

// Lazy-load pages and layouts to enable route-based code-splitting
const Login = lazy(() => import('../pages/Login'));
const MainLayout = lazy(() => import('../layouts/MainLayout'));
const Dashboard = lazy(() => import('../pages/doctor/Dashboard'));
const PharmacistDashboard = lazy(() => import('../pages/pharmacist/PharmacistDashboard'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const ATCClassification = lazy(() => import('../pages/admin/ATCClassification'));
const Prescription = lazy(() => import('../pages/doctor/Prescription'));
const Prescriptions = lazy(() => import('../pages/doctor/Prescriptions'));
const Inventory = lazy(() => import('../pages/pharmacist/Inventory'));
const Alerts = lazy(() => import('../pages/pharmacist/Alerts'));
const Reports = lazy(() => import('../pages/admin/Reports'));
const Admin = lazy(() => import('../pages/admin/Admin'));
const ChangePassword = lazy(() => import('../pages/ChangePassword'));
const InventoryAudit = lazy(() => import('../pages/pharmacist/InventoryAudit'));
const PatientRecordDetails = lazy(() => import('../pages/doctor/PatientRecordDetails'));
const PatientDashboard = lazy(() => import('../pages/patient/PatientDashboard'));
const PatientProfile = lazy(() => import('../pages/patient/PatientProfile'));
const PatientPrescriptions = lazy(() => import('../pages/patient/PatientPrescriptions'));
const PatientLogin = lazy(() => import('../pages/patient/PatientLogin'));
const PatientLayout = lazy(() => import('../layouts/PatientLayout'));
const CashierDashboard = lazy(() => import('../pages/cashier/CashierDashboard'));
const Wards = lazy(() => import('../pages/wards/Wards'));
const Receptionist = lazy(() => import('../pages/receptionist/Receptionist'));
const AuditLog = lazy(() => import('../pages/admin/AuditLog'));
const WardManagement = lazy(() => import('../pages/admin/WardManagement'));
const ReceptionistDashboard = lazy(() => import('../pages/receptionist/ReceptionistDashboard'));
const EmergencyQueue = lazy(() => import('../pages/emergency/EmergencyQueue'));
const EmergencyCheckIn = lazy(() => import('../pages/emergency/EmergencyCheckIn'));

import { getRoleHomePath, getStoredRole, isValidRole } from '../utils/session';

function AppHomeRedirect() {
  const authStatus = useSelector((state) => state.auth.status);
  const reduxUser = useSelector((state) => state.auth.user);
  const reduxRole = useSelector((state) => state.auth.role);
  const role = reduxRole || getStoredRole();

  if (authStatus === 'checking') {
    return null;
  }

  if (!reduxUser) {
    return <Navigate replace to="/login" />;
  }

  if (!isValidRole(role)) {
    return <Navigate replace to="/login" />;
  }

  return <Navigate replace to={getRoleHomePath(role)} />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>Loading...</div>}>
      <Routes>
        <Route path="/admin/access" element={<Navigate replace to="/admin/login" />} />
        <Route path="/admin/login" element={<Login forcedRole={ROLES.ADMIN} showRolePicker={false} pageTitle="Admin Sign In" pageSubtitle="Administrative access for users, settings, and reporting." />} />
        <Route path="/doctor/access" element={<Navigate replace to="/login?role=doctor" />} />
        <Route path="/doctor/login" element={<Login forcedRole={ROLES.DOCTOR} showRolePicker={false} pageTitle="Doctor Sign In" pageSubtitle="Clinical access for prescriptions and review workflows." />} />
        <Route path="/pharmacist/access" element={<Navigate replace to="/login?role=pharmacist" />} />
        <Route path="/pharmacist/login" element={<Login forcedRole={ROLES.PHARMACIST} showRolePicker={false} pageTitle="Pharmacist Sign In" pageSubtitle="Dispensing, inventory, and medication control access." />} />
        <Route path="/patient/access" element={<Navigate replace to="/patient/login" />} />
        <Route path="/patient/login" element={<PatientLogin />} />
        <Route path="/receptionist/access" element={<Navigate replace to="/login?role=receptionist" />} />
        <Route path="/receptionist/login" element={<Login forcedRole={ROLES.RECEPTIONIST} showRolePicker={false} pageTitle="Receptionist Sign In" pageSubtitle="Access patient registration and emergency triage." />} />
        <Route path="/billing/access" element={<Navigate replace to="/login?role=cashier" />} />
        <Route path="/billing/login" element={<Login forcedRole={ROLES.CASHIER} showRolePicker={false} pageTitle="Cashier Sign In" pageSubtitle="Access billing, invoices and payment processing." />} />
        
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/pharmacist"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.PHARMACIST]}>
              <MainLayout>
                <PharmacistDashboard />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <MainLayout>
                <AdminDashboard />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/atc"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.ADMIN]}>
              <MainLayout>
                <ATCClassification />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/prescription/new"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
              <MainLayout>
                <Prescription />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/prescription/edit/:id"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
              <MainLayout>
                <Prescription />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/prescriptions"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.PHARMACIST]}>
              <MainLayout>
                <Prescriptions />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/patients/:id/details"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.ADMIN, ROLES.PHARMACIST]}>
              <MainLayout>
                <PatientRecordDetails />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/inventory"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.PHARMACIST]}>
              <MainLayout>
                <Inventory />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/alerts"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.PHARMACIST]}>
              <MainLayout>
                <Alerts />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/reports"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <MainLayout>
                <Reports />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/users"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <MainLayout>
                <Admin />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/inventory/audit"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <MainLayout>
                <InventoryAudit />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/audit"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <MainLayout>
                <AuditLog />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/change-password"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.PHARMACIST, ROLES.ADMIN]}>
              <MainLayout>
                <ChangePassword />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/patient"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout>
                <PatientDashboard />
              </PatientLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/patient/profile"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout>
                <PatientProfile />
              </PatientLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/patient/prescriptions"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout>
                <PatientPrescriptions />
              </PatientLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/patient/change-password"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout>
                <ChangePassword />
              </PatientLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/nurse"
          element={<Navigate replace to="/wards" />}
        />
        <Route
          path="/receptionist"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.ADMIN]}>
              <Receptionist />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/billing"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ADMIN]}>
              <MainLayout>
                <CashierDashboard />
              </MainLayout>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/wards"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.ADMIN]}>
              <Wards />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/emergency/queue"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE, ROLES.PHARMACIST, ROLES.ADMIN]}>
              <EmergencyQueue />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/emergency/checkin"
          element={(
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST]}>
              <EmergencyCheckIn />
            </ProtectedRoute>
          )}
        />
        <Route path="/" element={<AppHomeRedirect />} />
        <Route path="*" element={<AppHomeRedirect />} />
      </Routes>
    </Suspense>
  );
}
