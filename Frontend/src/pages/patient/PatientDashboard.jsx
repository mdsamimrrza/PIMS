import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../components/AppIcon';
import usePatientPortalData from '../../hooks/usePatientPortalData';
import {
  buildProgressWidth,
  formatDate,
  getAgeFromDob,
  getDoctorName,
  getMedicationName,
  getStatusNarrative,
  statusClass
} from '../../utils/patientPortal';

export default function PatientDashboard() {
  const profileSnapshotRef = useRef(null);
  const careStatusRef = useRef(null);
  const recentPrescriptionsRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const [highlightedSection, setHighlightedSection] = useState('');
  const [visibleSections, setVisibleSections] = useState({});
  const {
    patient,
    prescriptions,
    summary,
    latestPrescription,
    allergyCount,
    historyCount,
    lastUpdateDate,
    isLoading,
    errorMessage
  } = usePatientPortalData({ prescriptionLimit: 8 });

  const summaryCards = [
    {
      icon: 'prescription',
      label: 'Total prescriptions',
      value: summary.total,
      note: 'Across your linked care history',
      sectionRef: recentPrescriptionsRef,
      sectionKey: 'recent-prescriptions'
    },
    {
      icon: 'clock',
      label: 'Awaiting progress',
      value: summary.pending,
      note: 'Pending review or in active processing',
      sectionRef: careStatusRef,
      sectionKey: 'care-status'
    },
    {
      icon: 'checkCircle',
      label: 'Completed fills',
      value: summary.filled,
      note: 'Successfully dispensed prescriptions',
      sectionRef: recentPrescriptionsRef,
      sectionKey: 'recent-prescriptions'
    },
    {
      icon: 'alert',
      label: 'Allergy alerts',
      value: allergyCount,
      note: allergyCount ? 'Important sensitivities are recorded' : 'No allergies recorded right now',
      sectionRef: profileSnapshotRef,
      sectionKey: 'profile-snapshot'
    }
  ];

  const statusBreakdown = [
    { label: 'Pending review', value: summary.pending - summary.processing },
    { label: 'In processing', value: summary.processing },
    { label: 'Filled', value: summary.filled },
    { label: 'Cancelled', value: summary.cancelled }
  ];

  const recordFacts = [
    { label: 'Patient ID', value: patient?.patientId || 'Not linked' },
    { label: 'Email', value: patient?.userId?.email || 'No portal email' },
    { label: 'Date of birth', value: formatDate(patient?.dob) },
    { label: 'Age', value: getAgeFromDob(patient?.dob) },
    { label: 'Latest update', value: formatDate(lastUpdateDate) }
  ];

  const portalShortcuts = [
    {
      to: '/patient/profile',
      icon: 'users',
      label: 'Open Health Record',
      note: 'Review profile, allergies, and medical history.'
    },
    {
      to: '/patient/prescriptions',
      icon: 'prescription',
      label: 'Go To Prescriptions',
      note: 'Browse every prescription with a focused detail panel.'
    },
    {
      to: '/patient/change-password',
      icon: 'shield',
      label: 'Security Settings',
      note: 'Update your password and keep portal access protected.'
    }
  ];

  const recentPrescriptions = prescriptions.slice(0, 3);

  useEffect(() => () => {
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll('[data-scroll-reveal]'));
    if (!revealElements.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const sectionKey = entry.target.getAttribute('data-scroll-reveal');
          if (!sectionKey) {
            return;
          }

          setVisibleSections((current) => {
            if (current[sectionKey]) {
              return current;
            }

            return { ...current, [sectionKey]: true };
          });

          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionRef, sectionKey) => {
    const sectionElement = sectionRef?.current;
    if (!sectionElement) {
      return;
    }

    const stickyOffset = 108;
    const nextTop = sectionElement.getBoundingClientRect().top + window.scrollY - stickyOffset;

    window.scrollTo({
      top: Math.max(nextTop, 0),
      behavior: 'smooth'
    });

    setHighlightedSection(sectionKey);

    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedSection('');
    }, 1400);
  };

  const revealClassName = (sectionKey) => `scroll-reveal ${visibleSections[sectionKey] ? 'is-visible' : ''}`.trim();

  return (
    <section className="page patient-dashboard-shell">
      {errorMessage ? (
        <div className="notice-banner patient-dashboard-notice" role="alert">
          <div>
            <strong>Patient portal issue</strong>
            <div className="helper-text">{errorMessage}</div>
          </div>
        </div>
      ) : null}

      {/* ── Phase 1: Cinematic Hero & Quick Summary ── */}
      <section className={`patient-dashboard-hero-group ${revealClassName('hero')}`.trim()} data-scroll-reveal="hero">
        <div className="patient-dashboard-hero">
          <div className="patient-dashboard-hero-copy">
            <span className="patient-dashboard-kicker">Welcome Back</span>
            <h2>
              {patient?.name
                ? `Hello, ${patient.name.split(' ')[0]}. Your health records are organized and ready.`
                : 'Your patient portal is organized and ready.'}
            </h2>
            <p>
              Review your care progress, medical history, and prescriptions from this unified dashboard.
            </p>

            <div className="toolbar-group patient-layout-actions">
              <Link className="button-primary" to="/patient/prescriptions">
                <AppIcon name="prescription" size={16} />
                Open Prescriptions
              </Link>
              <Link className="button-secondary" to="/patient/profile">
                <AppIcon name="users" size={16} />
                View Health Record
              </Link>
            </div>
          </div>

          <aside className="patient-hero-stat-grid">
            <div className="patient-hero-stat-card">
              <span className="stat-icon"><AppIcon name="prescription" size={20} /></span>
              <div className="stat-copy">
                <strong>{summary.total}</strong>
                <span>Total RX</span>
              </div>
            </div>
            <div className="patient-hero-stat-card">
              <span className="stat-icon"><AppIcon name="clock" size={20} /></span>
              <div className="stat-copy">
                <strong>{summary.pending}</strong>
                <span>Pending</span>
              </div>
            </div>
            <div className="patient-hero-stat-card">
              <span className="stat-icon"><AppIcon name="alert" size={20} /></span>
              <div className="stat-copy">
                <strong>{allergyCount}</strong>
                <span>Allergies</span>
              </div>
            </div>
            <div className="patient-hero-stat-card">
              <span className="stat-icon"><AppIcon name="checkCircle" size={20} /></span>
              <div className="stat-copy">
                <strong>{summary.filled}</strong>
                <span>Completed</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Phase 2: Bento Grid Layout ── */}
      <div className="patient-bento-grid">
        {/* Bento: Latest Care (Large) */}
        <section
          className={`patient-bento-item patient-bento-primary ${revealClassName('care-status')}`.trim()}
          data-scroll-reveal="care-status"
          ref={careStatusRef}
        >
          <div className="bento-head">
            <div className="bento-title">
              <AppIcon name="reports" size={22} />
              <h3>Active Care Status</h3>
            </div>
            {latestPrescription && (
              <span className={`status-badge ${statusClass(latestPrescription.status)}`}>
                {latestPrescription.status}
              </span>
            )}
          </div>

          <div className="bento-content">
            {latestPrescription ? (
              <div className="latest-rx-highlight">
                <div className="rx-meta">
                  <strong>{latestPrescription.rxId}</strong>
                  <span>Issued by {getDoctorName(latestPrescription)}</span>
                </div>
                <div className="pill-row">
                  {latestPrescription.items?.slice(0, 4).map((item, index) => (
                    <span className="pill" key={`${latestPrescription._id}-${index}`}>
                      {getMedicationName(item)}
                    </span>
                  ))}
                </div>
                <div className="care-narrative">
                  <AppIcon name="note" size={16} />
                  <p>{getStatusNarrative(latestPrescription.status)}</p>
                </div>
              </div>
            ) : (
              <div className="empty-bento">
                <AppIcon name="clock" size={32} />
                <p>No active prescriptions linked yet.</p>
              </div>
            )}
          </div>

          <div className="status-progress-list">
            {statusBreakdown.slice(0, 3).map((item) => (
              <div className="status-progress-row" key={item.label}>
                <div className="row-info">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <div className="progress-bar">
                  <span style={{ width: buildProgressWidth(item.value, summary.total || 1) }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bento: Profile Snapshot */}
        <section
          className={`patient-bento-item patient-bento-snapshot ${revealClassName('profile-snapshot')}`.trim()}
          data-scroll-reveal="profile-snapshot"
          ref={profileSnapshotRef}
        >
          <div className="bento-head">
            <div className="bento-title">
              <AppIcon name="users" size={20} />
              <h3>Health Snapshot</h3>
            </div>
          </div>
          <div className="bento-compact-grid">
            {recordFacts.slice(0, 4).map((fact) => (
              <div className="compact-fact" key={fact.label}>
                <span className="caption">{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>
          <div className="bento-divider" />
          <div className="bento-footer-action">
            <Link className="link-action" to="/patient/profile">
              <span>Full Medical Record</span>
              <AppIcon name="chevronRight" size={16} />
            </Link>
          </div>
        </section>

        {/* Bento: Recent Activity */}
        <section
          className={`patient-bento-item patient-bento-recent ${revealClassName('recent-prescriptions')}`.trim()}
          data-scroll-reveal="recent-prescriptions"
          ref={recentPrescriptionsRef}
        >
          <div className="bento-head">
            <div className="bento-title">
              <AppIcon name="clock" size={20} />
              <h3>Recent History</h3>
            </div>
          </div>
          <div className="bento-list">
            {recentPrescriptions.length ? recentPrescriptions.map((item) => (
              <div className="bento-list-item" key={item._id}>
                <div className="item-copy">
                  <strong>{item.rxId}</strong>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
                <span className={`dot-status ${statusClass(item.status)}`} />
              </div>
            )) : (
              <div className="empty-bento-sm">No recent activity.</div>
            )}
          </div>
        </section>

        {/* Bento: Quick Shortcuts */}
        <div className="patient-bento-shortcuts">
          {portalShortcuts.map((item) => (
            <Link className="bento-shortcut-card" key={item.to} to={item.to}>
              <AppIcon name={item.icon} size={20} />
              <strong>{item.label}</strong>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
