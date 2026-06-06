import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
/* Cache-buster: Redesign Phase 5 - Clarity Update */
import Topbar from '../components/Topbar';
import AppIcon from '../components/AppIcon';
import { getStoredUser } from '../utils/session';
import '../styles/PatientPortal.css';

const sidebarPages = [
  { to: '/patient', label: 'Dashboard', icon: 'dashboard' },
  { to: '/patient/profile', label: 'Health Record', icon: 'users' },
  { to: '/patient/prescriptions', label: 'Prescriptions', icon: 'prescription' },
  { to: '/patient/change-password', label: 'Security', icon: 'shield' }
];

const pageMeta = {
  '/patient': {
    kicker: 'Portal Dashboard',
    description: 'A calm patient home page with quick summaries, care status, and shortcuts into the full record and prescription center.',
    chips: [
      { icon: 'checkCircle', label: 'Organized overview' },
      { icon: 'clock', label: 'Live prescription status' },
      { icon: 'prescription', label: 'Fast route to history' }
    ],
    primaryAction: { to: '/patient/prescriptions', icon: 'prescription', label: 'Open Prescriptions' }
  },
  '/patient/profile': {
    kicker: 'Health Record',
    description: 'A dedicated patient-record page for identity details, allergies, medical history, and recent care context.',
    chips: [
      { icon: 'users', label: 'Patient profile' },
      { icon: 'alert', label: 'Safety notes' },
      { icon: 'note', label: 'Medical background' }
    ],
    primaryAction: { to: '/patient/prescriptions', icon: 'prescription', label: 'Review Prescriptions' }
  },
  '/patient/prescriptions': {
    kicker: 'Prescription Center',
    description: 'A focused prescription workspace with full history, detail review, medication plans, and PDF downloads.',
    chips: [
      { icon: 'prescription', label: 'Full history' },
      { icon: 'download', label: 'Official PDFs' },
      { icon: 'pill', label: 'Medication details' }
    ],
    primaryAction: { to: '/patient/profile', icon: 'users', label: 'Open Health Record' }
  },
  '/patient/change-password': {
    kicker: 'Account Security',
    description: 'Manage your patient portal credentials while keeping access private, secure, and easy to review.',
    chips: [
      { icon: 'shield', label: 'Protected access' },
      { icon: 'settings', label: 'Password controls' },
      { icon: 'checkCircle', label: 'Account safety' }
    ],
    primaryAction: { to: '/patient', icon: 'dashboard', label: 'Back to Dashboard' }
  }
};

const portalModules = [
  { label: 'Dashboard', icon: 'dashboard', state: 'Live' },
  { label: 'Health Record', icon: 'users', state: 'Live' },
  { label: 'Prescriptions', icon: 'prescription', state: 'Live' }
];

const PATIENT_SIDEBAR_KEY = 'pims_patient_sidebar_open';

export default function PatientLayout({ children }) {
  const location = useLocation();
  const authUser = useSelector((state) => state.auth.user);
  const storedUser = authUser || getStoredUser();
  const patientDisplayName = String(storedUser?.patient?.name || '').trim();
  const firstName = patientDisplayName.split(/\s+/).filter(Boolean)[0] || storedUser?.firstName || 'Patient';
  const activePage = pageMeta[location.pathname] || pageMeta['/patient'];
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() => {
    const stored = localStorage.getItem(PATIENT_SIDEBAR_KEY);
    return stored !== 'false';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1100px)');

    const handleViewportChange = () => {
      const mobile = mediaQuery.matches;
      setIsMobileViewport(mobile);

      if (!mobile) {
        setIsMobileSidebarOpen(false);
      }
    };

    handleViewportChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(PATIENT_SIDEBAR_KEY, isDesktopSidebarOpen ? 'true' : 'false');
  }, [isDesktopSidebarOpen]);

  useEffect(() => {
    if (isMobileViewport) {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobileViewport, location.pathname]);

  useEffect(() => {
    if (!isMobileViewport) {
      document.body.style.overflow = '';
      return undefined;
    }

    document.body.style.overflow = isMobileSidebarOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen, isMobileViewport]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSidebarOpen]);

  const isSidebarOpen = isMobileViewport ? isMobileSidebarOpen : isDesktopSidebarOpen;

  const toggleSidebar = () => {
    if (isMobileViewport) {
      setIsMobileSidebarOpen((current) => !current);
      return;
    }
    setIsDesktopSidebarOpen((current) => !current);
  };

  const closeMobileSidebar = () => {
    if (isMobileViewport) {
      setIsMobileSidebarOpen(false);
    }
  };

  return (
    <div className={`patient-shell ${location.pathname === '/patient' ? 'patient-shell-dashboard' : 'patient-shell-subpage'} ${isMobileViewport ? 'patient-shell-mobile-layout' : ''}`.trim()}>
      {/* Cinematic Background Elements */}
      <div className="pt-orb pt-orb-1" />
      <div className="pt-orb pt-orb-2" />
      <div className="pt-orb pt-orb-3" />

      <Topbar isSidebarOpen={isSidebarOpen} onMenuToggle={toggleSidebar} showMenuToggle />

      <main className="page-content patient-page-content">
        <div className={`patient-portal-shell ${!isSidebarOpen && !isMobileViewport ? 'sidebar-collapsed' : ''}`.trim()}>
          
          {isMobileViewport && isSidebarOpen ? (
            <button
              aria-label="Close patient navigation drawer"
              className="sidebar-overlay"
              onClick={closeMobileSidebar}
              type="button"
            />
          ) : null}

          <aside className={`patient-sidebar-wrap ${isSidebarOpen ? 'is-open' : 'is-closed'}`.trim()}>
            <div className="patient-sidebar-glass">
              <div className="patient-sidebar-card">
                <div className="patient-sidebar-top">
                  <div className="patient-sidebar-brand">
                    <span className="patient-sidebar-mark">
                      <AppIcon name="shield" size={18} />
                    </span>
                    <div>
                      <strong>{firstName}&apos;s Space</strong>
                      <div className="helper-text">Patient navigation</div>
                    </div>
                  </div>
                </div>

                <div className="patient-sidebar-section">
                  <span className="caption">Available now</span>
                  <nav aria-label="Patient pages" className="patient-sidebar-nav">
                    {sidebarPages.map((item) => (
                      <NavLink
                        key={item.to}
                        className={({ isActive }) => `patient-sidebar-link ${isActive ? 'active' : ''}`.trim()}
                        end={item.to === '/patient'}
                        onClick={closeMobileSidebar}
                        to={item.to}
                      >
                        <AppIcon name={item.icon} size={17} />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          </aside>

          <div className="patient-portal-main">
            {location.pathname !== '/patient' && (
              <section className="patient-layout-banner">
                <div className="patient-layout-copy">
                  <span className="patient-layout-kicker">{activePage.kicker}</span>
                  <div className="section-title">
                    <AppIcon name="shield" size={20} />
                    <strong>{firstName}&apos;s Patient Portal</strong>
                  </div>
                  <p className="helper-text">{activePage.description}</p>
                </div>

                <div className="patient-layout-highlights">
                  {activePage.chips.map((item) => (
                    <span className="patient-layout-chip" key={item.label}>
                      <AppIcon name="checkCircle" size={16} />
                      {item.label}
                    </span>
                  ))}
                </div>

                <div className="toolbar-group patient-layout-actions">
                  <Link className="button-secondary" to="/patient/prescriptions">
                    <AppIcon name="prescription" size={16} />
                    Open Prescriptions
                  </Link>
                </div>
              </section>
            )}

            {children}
          </div>
        </div>
      </main>
      <footer className="app-footer patient-footer">
        <span>(c) 2026 PIMS | Patient Portal Experience</span>
        <span>Private, secure, and read-only by design</span>
      </footer>
    </div>
  );
}
