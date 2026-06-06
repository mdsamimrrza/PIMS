import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import DarkModeToggle from '../components/DarkModeToggle';
import '../styles/PortalSelection.css';

const PORTALS = [
  {
    id: 'clinical',
    name: 'Clinical Portal',
    desc: 'Medical records, prescriptions & triage.',
    icon: 'doctor',
    path: '/doctor/login',
    type: 'large',
    color: 'var(--accent-primary)'
  },
  {
    id: 'reception',
    name: 'Reception',
    desc: 'Registration & Queue.',
    icon: 'users',
    path: '/receptionist/login',
    type: 'normal',
    color: 'var(--accent-info)'
  },
  {
    id: 'nurse',
    name: 'Nurse Portal',
    desc: 'Ward & Vitals.',
    icon: 'shield',
    path: '/nurse/login',
    type: 'normal',
    color: 'var(--accent-success)'
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy POS',
    desc: 'Inventory & Dispensing.',
    icon: 'pharmacist',
    path: '/pharmacist/login',
    type: 'wide',
    color: 'var(--accent-secondary)'
  },
  {
    id: 'billing',
    name: 'Billing',
    desc: 'Invoicing & Payments.',
    icon: 'inventory',
    path: '/billing/login',
    type: 'normal',
    color: 'var(--accent-tertiary)'
  },
  {
    id: 'patient',
    name: 'Patient Portal',
    desc: 'View your health summary.',
    icon: 'users',
    path: '/patient/login',
    type: 'normal',
    color: '#ec4899'
  }
];

export default function HospitalPortalSelection() {
  const navigate = useNavigate();

  return (
    <div className="pg-root">
      <header className="pg-header">
        <div className="pg-brand">
          <div className="pg-brand-mark">
            <AppIcon name="brand" size={24} />
          </div>
          <div>
            <h1 className="pg-brand-title">PIMS Gateway</h1>
            <p className="pg-brand-sub">HOSPITAL OPERATING SYSTEM</p>
          </div>
        </div>
        <div className="pg-header-right">
          <DarkModeToggle />
        </div>
      </header>

      <main className="pg-main">
        <section className="pg-intro">
          <span className="pg-tag">Workspace Selector</span>
          <h2 className="pg-title">Choose your <br/> <span>department.</span></h2>
          <p className="pg-subtitle">
            Secure, role-based access to the clinical and administrative systems of PIMS 2.0.
          </p>
        </section>

        <section className="pg-bento">
          {PORTALS.map((portal) => (
            <Link 
              key={portal.id} 
              to={portal.path} 
              className={`pg-box pg-box-${portal.type}`}
              style={{ '--box-accent': portal.color }}
            >
              <div className="pg-box-icon">
                <AppIcon name={portal.icon} size={32} />
              </div>
              <div className="pg-box-content">
                <h3 className="pg-box-title">{portal.name}</h3>
                <p className="pg-box-desc">{portal.desc}</p>
              </div>
              <div className="pg-box-arrow">
                <AppIcon name="arrowRight" size={16} />
              </div>
            </Link>
          ))}
        </section>
      </main>

      <footer className="pg-footer">
        <span>© 2026 PIMS Medical Informatics</span>
        <div className="pg-footer-nodes">
          <span>SERVER: NODE_CENTRAL</span>
          <span>REGION: US_EAST_01</span>
        </div>
      </footer>
    </div>
  );
}
