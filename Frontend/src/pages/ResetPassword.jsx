import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import DarkModeToggle from '../components/DarkModeToggle';
import { getApiMessage, resetPassword } from '../api/pimsApi';
import useToast from '../hooks/useToast';
import '../styles/PatientLogin.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notifyError, notifySuccess } = useToast();
  
  const fromPatient = searchParams.get('from') === 'patient';
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const initialToken = useMemo(() => searchParams.get('token') || '', [searchParams]);
  
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      notifyError('Validation Error', 'The passwords you entered do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({
        email,
        token,
        newPassword,
        confirmPassword
      });

      notifySuccess('Access Restored', 'Your password has been reset successfully. You can now log in.');
      navigate(fromPatient ? '/patient/login' : '/login');
    } catch (error) {
      notifyError('Update Failed', getApiMessage(error, 'Failed to update your password.'));
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
            alt="PIMS Security" 
            className="pl-hero-img" 
          />
          <div className="pl-hero-overlay" />
          <div className="pl-hero-content">
            <h2 className="pl-hero-title">
              Finalize <br/> 
              <span className="pl-hero-gradient">Security.</span>
            </h2>
            <p style={{ fontSize: '1.25rem', opacity: 0.9, lineHeight: 1.6 }}>
              Choose a strong, unique password to ensure your medical records 
              and clinical data remain protected with end-to-end encryption.
            </p>
          </div>
        </section>

        {/* Right Side: Reset Form */}
        <section className="pl-auth-side">
          <div className="pl-auth-card">
            <header className="pl-auth-header">
              <h1 className="pl-auth-title">Set New Password</h1>
              <p className="pl-auth-subtitle">Final step to restore your {fromPatient ? 'patient' : 'staff'} access.</p>
            </header>

            <form className="pl-auth-form" onSubmit={handleSubmit}>
              <div className="pl-field">
                <label>Recovery Email</label>
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
                <label>Security Token</label>
                <div className="pl-input-box">
                  <AppIcon name="shield" size={20} />
                  <input
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="Paste token from email"
                    value={token}
                    required
                  />
                </div>
              </div>

              <div className="pl-field">
                <label>New Secure Password</label>
                <div className="pl-input-box">
                  <AppIcon name="shield" size={20} />
                  <input
                    onChange={(event) => setNewPassword(event.target.value)}
                    type="password"
                    value={newPassword}
                    required
                  />
                </div>
              </div>

              <div className="pl-field">
                <label>Confirm New Password</label>
                <div className="pl-input-box">
                  <AppIcon name="shield" size={20} />
                  <input
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type="password"
                    value={confirmPassword}
                    required
                  />
                </div>
              </div>

              <button className="button-primary pl-auth-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Updating Security...' : 'Save New Password'}
              </button>
            </form>

            <footer className="pl-auth-footer">
              <p>
                Changed your mind? {' '}
                <Link to={fromPatient ? '/patient/login' : '/login'}>
                  Back to {fromPatient ? 'Patient' : 'Staff'} Login
                </Link>
              </p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}