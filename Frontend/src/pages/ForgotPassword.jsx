import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import DarkModeToggle from '../components/DarkModeToggle';
import { forgotPassword, getApiMessage } from '../api/pimsApi';
import useToast from '../hooks/useToast';
import '../styles/PatientLogin.css';

export default function ForgotPassword() {
  const { notifyError, notifySuccess } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const searchParams = new URLSearchParams(window.location.search);
  const fromPatient = searchParams.get('from') === 'patient';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      await forgotPassword({ email });
      const successMessage = 'If the account exists, a reset link has been sent to your clinical inbox.';
      setMessage(successMessage);
      notifySuccess('Request Sent', successMessage);
    } catch (error) {
      const errorMessage = getApiMessage(error, 'Failed to request password reset');
      notifyError('Request Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not from patient, we could use the old AuthLayout, but user wants it to be dedicated.
  // We'll use the premium pl- structure for both to maintain high fidelity.

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
            alt="PIMS Recovery" 
            className="pl-hero-img" 
          />
          <div className="pl-hero-overlay" />
          <div className="pl-hero-content">
            <h2 className="pl-hero-title">
              Secure <br/> 
              <span className="pl-hero-gradient">Recovery.</span>
            </h2>
            <p style={{ fontSize: '1.25rem', opacity: 0.9, lineHeight: 1.6 }}>
              Follow the instructions sent to your email to securely restore 
              access to your medical records and care plan.
            </p>
          </div>
        </section>

        {/* Right Side: Recovery Form */}
        <section className="pl-auth-side">
          <div className="pl-auth-card">
            <header className="pl-auth-header">
              <h1 className="pl-auth-title">{fromPatient ? 'Patient' : 'Staff'} Recovery</h1>
              <p className="pl-auth-subtitle">
                Enter your registered {fromPatient ? 'clinical' : 'work'} email to receive a secure reset link.
              </p>
            </header>

            <form className="pl-auth-form" onSubmit={handleSubmit}>
              <div className="pl-field">
                <label>Registered Email</label>
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

              {message && (
                <div className="pl-auth-error" style={{ background: 'rgba(27, 201, 154, 0.1)', color: '#10b981', borderColor: 'rgba(27, 201, 154, 0.2)' }}>
                  {message}
                </div>
              )}

              <button className="button-primary pl-auth-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Processing Request...' : 'Send Recovery Link'}
              </button>
            </form>

            <footer className="pl-auth-footer">
              <p>
                Remembered your password? {' '}
                <Link to={fromPatient ? '/patient/login' : '/login'}>
                  Go back to {fromPatient ? 'Patient' : 'Staff'} Login
                </Link>
              </p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}