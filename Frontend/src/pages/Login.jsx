import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import RolePicker from '../components/RolePicker';
import AppIcon from '../components/AppIcon';
import DarkModeToggle from '../components/DarkModeToggle';
import { login as loginRequest, getApiMessage } from '../api/pimsApi';
import { ROLES, ROLE_LABELS } from '../constants/roles';
import { getRoleHomePath, getStoredRole, isValidRole, setAuthSession } from '../utils/session';
import { setAuthenticatedSession } from '../store/slices/authSlice';
import useToast from '../hooks/useToast';
import '../styles/PatientLogin.css';

const ROLE_HELPER_COPY = {
  [ROLES.DOCTOR]: 'Clinical access for prescribers and review workflows.',
  [ROLES.PHARMACIST]: 'Dispensing, inventory, and medication control access.',
  [ROLES.ADMIN]: 'Administrative access for user and system management.',
  [ROLES.NURSE]: 'Ward management, patient vitals, and bed tracking.',
  [ROLES.RECEPTIONIST]: 'Patient registration and admission desk.',
  [ROLES.CASHIER]: 'Billing, invoicing, and POS management.',
};

const ROLE_EMAIL_DEFAULTS = {
  [ROLES.DOCTOR]: 'doctor@pims.com',
  [ROLES.PHARMACIST]: 'pharma@pims.com',
  [ROLES.ADMIN]: 'admin@pims.com',
  [ROLES.NURSE]: 'nurse@pims.com',
  [ROLES.RECEPTIONIST]: 'recep@pims.com',
  [ROLES.CASHIER]: 'cashier@pims.com',
};

const AUTH_RATE_LIMIT_KEY = 'pims_auth_rate_limit_until';
const DEV_SEED_PASSWORD = 'test123';
const isDevelopment = Boolean(import.meta.env.DEV);

function parseStoredLockoutUntil() {
  const rawValue = localStorage.getItem(AUTH_RATE_LIMIT_KEY);
  const timestamp = Number(rawValue);
  return Number.isFinite(timestamp) && timestamp > Date.now() ? timestamp : 0;
}

function formatCountdown(msRemaining) {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getRateLimitResetAt(error) {
  const headers = error?.response?.headers || {};
  const retryAfter = Number(headers['retry-after']);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Date.now() + (retryAfter * 1000);
  }
  return Date.now() + (15 * 60 * 1000);
}

export default function Login({ forcedRole = null, showRolePicker = true, pageTitle, pageSubtitle }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const storedRole = useSelector((state) => state.auth.role);
  const { notifyError, notifySuccess } = useToast();

  const queryParams = new URLSearchParams(location.search || '');
  const queryRoleRaw = queryParams.get('role');
  const queryRole = isValidRole(queryRoleRaw) ? queryRoleRaw : null;
  const initialRole = isValidRole(forcedRole) ? forcedRole : (queryRole || ROLES.DOCTOR);
  
  const [role, setRole] = useState(initialRole);
  const activeRole = isValidRole(forcedRole) ? forcedRole : role;
  
  const [email, setEmail] = useState(() => (isDevelopment ? ROLE_EMAIL_DEFAULTS[initialRole] || '' : ''));
  const [password, setPassword] = useState(() => (isDevelopment ? DEV_SEED_PASSWORD : ''));
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rateLimitResetAt, setRateLimitResetAt] = useState(() => parseStoredLockoutUntil());
  const [now, setNow] = useState(Date.now());

  const sessionExpiredReason = location.state?.reason === 'session-expired';
  const isRateLimited = rateLimitResetAt > now;
  const countdownLabel = isRateLimited ? formatCountdown(rateLimitResetAt - now) : '';

  useEffect(() => {
    if (isValidRole(forcedRole)) {
      setRole(forcedRole);
    } else if (queryRole) {
      setRole(queryRole);
    }
  }, [forcedRole, queryRole]);

  useEffect(() => {
    if (rateLimitResetAt > 0) {
      localStorage.setItem(AUTH_RATE_LIMIT_KEY, String(rateLimitResetAt));
      const timerId = window.setInterval(() => {
        setNow(Date.now());
        if (Date.now() >= rateLimitResetAt) setRateLimitResetAt(0);
      }, 1000);
      return () => window.clearInterval(timerId);
    }
    localStorage.removeItem(AUTH_RATE_LIMIT_KEY);
    return undefined;
  }, [rateLimitResetAt]);

  useEffect(() => {
    setEmail(isDevelopment ? (ROLE_EMAIL_DEFAULTS[activeRole] || '') : '');
    setPassword(isDevelopment ? DEV_SEED_PASSWORD : '');
  }, [activeRole]);

  if (user) {
    return <Navigate replace to={getRoleHomePath(storedRole || getStoredRole())} />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isRateLimited) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const data = await loginRequest({ email, password, role: activeRole });
      setAuthSession({ user: data.user, rememberDevice });
      dispatch(setAuthenticatedSession({ user: data.user }));
      notifySuccess('Signed in', `Welcome ${data.user?.firstName || 'back'}.`, 2800);
      navigate(getRoleHomePath(data.user.role));
    } catch (error) {
      const isTooManyRequests = error?.response?.status === 429;
      const message = isTooManyRequests ? `Locked until ${formatCountdown(getRateLimitResetAt(error) - Date.now())}` : getApiMessage(error, 'Login failed');
      if (isTooManyRequests) setRateLimitResetAt(getRateLimitResetAt(error));
      setErrorMessage(message);
      notifyError('Login failed', message, 4200);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pl-root">
      <header className="pl-top-nav">
        <Link to="/" className="pl-nav-brand">
          <AppIcon name="brand" size={24} color="#1bc99a" />
          <span>PIMS CLINICAL</span>
        </Link>
        <DarkModeToggle />
      </header>

      <main className="pl-main-content">
        <section className="pl-visual-col">
          <img src="/hospital_hero.png" alt="PIMS Staff" className="pl-hero-img" />
          <div className="pl-hero-overlay" />
          <div className="pl-hero-content">
            <h2 className="pl-hero-title">
              Precision <br/> 
              <span className="pl-hero-gradient">Care.</span>
            </h2>
            <p style={{ fontSize: '1.25rem', opacity: 0.9, lineHeight: 1.6 }}>
              The PIMS clinical engine provides real-time insights, 
              secure medication management, and seamless hospital-wide coordination.
            </p>
          </div>
        </section>

        <section className="pl-auth-side">
          <div className="pl-auth-card">
            <header className="pl-auth-header">
              <h1 className="pl-auth-title">{pageTitle || `Sign in as ${ROLE_LABELS[activeRole]}`}</h1>
              <p className="pl-auth-subtitle">{pageSubtitle || ROLE_HELPER_COPY[activeRole]}</p>
            </header>

            <form className="pl-auth-form" onSubmit={handleSubmit}>
              {sessionExpiredReason && (
                <div className="pl-auth-error" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderColor: 'transparent' }}>
                  Your session has expired. Please sign in again.
                </div>
              )}

              {showRolePicker && !isValidRole(forcedRole) && !queryRole && (
                <div className="pl-field">
                  <label>Authorized Role</label>
                  <RolePicker value={role} onChange={setRole} />
                </div>
              )}

              <div className="pl-field">
                <label>Work Email</label>
                <div className="pl-input-box">
                  <AppIcon name="users" size={20} />
                  <input
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@pims.com"
                    type="email"
                    value={email}
                    required
                  />
                </div>
              </div>

              <div className="pl-field">
                <div className="pl-field-label-row">
                  <label>Secure Password</label>
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>
                <div className="pl-input-box">
                  <AppIcon name="shield" size={20} />
                  <input 
                    onChange={(event) => setPassword(event.target.value)} 
                    type="password" 
                    value={password} 
                    required
                  />
                </div>
              </div>

              <label className="pl-remember">
                <input
                  checked={rememberDevice}
                  onChange={(event) => setRememberDevice(event.target.checked)}
                  type="checkbox"
                />
                <span>Stay signed in for 30 days</span>
              </label>

              {errorMessage && <div className="pl-auth-error">{errorMessage}</div>}

              <button className="button-primary pl-auth-submit" disabled={isSubmitting || isRateLimited} type="submit">
                {isSubmitting ? 'Verifying...' : isRateLimited ? `Locked (${countdownLabel})` : 'Access Dashboard'}
              </button>
            </form>

            <footer className="pl-auth-footer">
              <p>Institutional access governed by HIPAA & GDPR security protocols.</p>
              {isDevelopment && (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '0.75rem',
                  background: 'rgba(27, 201, 154, 0.08)',
                  border: '1px dashed rgba(27, 201, 154, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  textAlign: 'left'
                }}>
                  <strong style={{ color: '#1bc99a', display: 'block', marginBottom: '0.25rem' }}>Testing Credentials:</strong>
                  <span style={{ fontFamily: 'monospace' }}>{ROLE_EMAIL_DEFAULTS[activeRole]}</span> / <span style={{ fontFamily: 'monospace' }}>{DEV_SEED_PASSWORD}</span>
                </div>
              )}
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
