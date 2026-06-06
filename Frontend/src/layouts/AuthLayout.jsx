import { Link } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import DarkModeToggle from '../components/DarkModeToggle';

export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <div className="auth-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="helper-text">PIMS secure access</span>
          <DarkModeToggle />
        </div>
        <Link className="button-ghost" to="/forgot-password">
          <AppIcon name="info" size={16} />
          Password Help
        </Link>
      </div>
      <main className="login-page">{children}</main>
      <footer className="auth-footer" style={{ justifyContent: 'center' }}>
        <span>&copy; 2026 PIMS Medical Informatics Inc. | Operational</span>
      </footer>
    </div>
  );
}
