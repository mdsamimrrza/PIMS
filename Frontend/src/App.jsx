import { useEffect, useRef, Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
const AppRoutes = lazy(() => import('./routes/AppRoutes'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
import { SESSION_EXPIRED_EVENT } from './api/pimsApi';
import { clearAuthState, hydrateAuthSession } from './store/slices/authSlice';
import { pushToast } from './store/slices/toastSlice';
import { setTheme } from './store/slices/themeSlice';
import ToastViewport from './components/ToastViewport';
import { getRoleAccessPath } from './utils/session';

const HospitalPortalSelection = lazy(() => import('./pages/HospitalPortalSelection'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const authStatus = useSelector((state) => state.auth.status);
  const themeMode = useSelector((state) => state.theme.mode);
  const lastSessionExpiredAt = useRef(0);

  // Initialize theme on app load
  useEffect(() => {
    dispatch(setTheme(themeMode));
  }, [dispatch, themeMode]);

  useEffect(() => {
    if (authStatus === 'idle') {
      dispatch(hydrateAuthSession());
    }
  }, [authStatus, dispatch]);

  useEffect(() => {
    const handleSessionExpired = (event) => {
      const now = Date.now();
      // Guard against burst 401 responses dispatching duplicate expiry events.
      if (now - lastSessionExpiredAt.current < 1200) {
        return;
      }
      lastSessionExpiredAt.current = now;

      const role = event?.detail?.role;
      const redirectPath = getRoleAccessPath(role);

      dispatch(clearAuthState());
      dispatch(pushToast({
        type: 'warning',
        title: 'Session expired',
        message: 'Please sign in again to continue.',
        duration: 4200
      }));

      if (location.pathname !== redirectPath) {
        navigate(redirectPath, { replace: true, state: { reason: 'session-expired' } });
      }
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [dispatch, location.pathname, navigate]);

  if (authStatus === 'checking') {
    return (
      <>
        <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
          <div className="helper-text">Verifying your session...</div>
        </div>
        <ToastViewport />
      </>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={(
          <Suspense fallback={<div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>Loading...</div>}>
            <LandingPage />
          </Suspense>
        )} />
        <Route path="/login" element={(
          <Suspense fallback={<div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>Loading...</div>}>
            <HospitalPortalSelection />
          </Suspense>
        )} />
        <Route path="/portal" element={(
          <Suspense fallback={<div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>Loading...</div>}>
            <HospitalPortalSelection />
          </Suspense>
        )} />
        <Route path="/forgot-password" element={(
          <Suspense fallback={<div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>Loading...</div>}>
            <ForgotPassword />
          </Suspense>
        )} />
        <Route path="/reset-password" element={(
          <Suspense fallback={<div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>Loading...</div>}>
            <ResetPassword />
          </Suspense>
        )} />
        <Route path="/*" element={(
          <Suspense fallback={<div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>Loading app...</div>}>
            <AppRoutes />
          </Suspense>
        )} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastViewport />
    </>
  );
}