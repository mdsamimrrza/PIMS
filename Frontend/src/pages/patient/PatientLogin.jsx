import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppIcon from '../../components/AppIcon';
import DarkModeToggle from '../../components/DarkModeToggle';
import { login as loginRequest, getApiMessage } from '../../api/pimsApi';
import { ROLES } from '../../constants/roles';
import { getRoleHomePath, getStoredRole, setAuthSession } from '../../utils/session';
import { setAuthenticatedSession } from '../../store/slices/authSlice';
import useToast from '../../hooks/useToast';
import '../../styles/PatientLogin.css';

const DEV_SEED_PASSWORD = 'test123';
const isDevelopment = Boolean(import.meta.env.DEV);

export default function PatientLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const storedRole = useSelector((state) => state.auth.role);
  const { notifyError, notifySuccess } = useToast();
  
  const [email, setEmail] = useState(() => (isDevelopment ? 'patient@pims.com' : ''));
  const [password, setPassword] = useState(() => (isDevelopment ? DEV_SEED_PASSWORD : ''));
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Only auto-redirect if we are CERTAIN this is a logged-in PATIENT
  if (user && (storedRole === ROLES.PATIENT || getStoredRole() === ROLES.PATIENT)) {
    return <Navigate replace to="/patient" />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const data = await loginRequest({ email, password, role: ROLES.PATIENT });

      setAuthSession({
        user: data.user,
        rememberDevice
      });
      dispatch(setAuthenticatedSession({ user: data.user }));
      notifySuccess('Welcome Back', `Hello ${data.user?.firstName || 'Patient'}, your health dashboard is ready.`, 2800);
      navigate('/patient');
    } catch (error) {
      const message = getApiMessage(error, 'Login failed');
      setErrorMessage(message);
      notifyError('Authentication Failed', message, 4200);
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
        {/* Left Side: Premium Visual */}
        <section className="pl-visual-col">
          <img 
            src="/hospital_hero.png" 
            alt="PIMS Health Environment" 
            className="pl-hero-img" 
          />
          <div className="pl-hero-overlay" />
          <div className="pl-hero-content">
            <h2 className="pl-hero-title">
              Your health, <br/> 
              <span className="pl-hero-gradient">elevated.</span>
            </h2>
            <p style={{ fontSize: '1.25rem', opacity: 0.9, lineHeight: 1.6 }}>
              A world-class digital experience designed to manage your medical history, 
              prescriptions, and recovery in one secure place.
            </p>
          </div>
        </section>

        {/* Right Side: Authentication */}
        <section className="pl-auth-side">
          <div className="pl-auth-card">
            <header className="pl-auth-header">
              <h1 className="pl-auth-title">Patient Sign In</h1>
              <p className="pl-auth-subtitle">Access your clinical record with end-to-end security.</p>
            </header>

            <form className="pl-auth-form" onSubmit={handleSubmit}>
              <div className="pl-field">
                <label>Clinical Email</label>
                <div className="pl-input-box">
                  <AppIcon name="users" size={20} />
                  <input
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                    required
                  />
                </div>
              </div>

              <div className="pl-field">
                <div className="pl-field-label-row">
                  <label>Password</label>
                  <Link to="/forgot-password?from=patient">Forgot password?</Link>
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

              <button className="button-primary pl-auth-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Verifying Identity...' : 'Access My Records'}
              </button>
            </form>

            <footer className="pl-auth-footer">
              <p>New patient at PIMS? <Link to="/">Back to Homepage</Link></p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
