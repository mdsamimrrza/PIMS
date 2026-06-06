import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';

/* ─── Dark mode hook — reads / writes html.dark class ─── */
function useDarkMode() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  const toggle = useCallback(() => {
    const html = document.documentElement;
    html.classList.toggle('dark');
    setDark(html.classList.contains('dark'));
  }, []);
  return [dark, toggle];
}

/* ─── Scroll-reveal hook ─── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('lp-revealed'); io.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ─── Data ─── */
const SERVICES = [
  {
    emoji: '❤️',
    accent: 'rgba(193,69,69,0.1)',
    border: 'rgba(193,69,69,0.22)',
    title: 'Cardiology',
    desc: 'Advanced heart care and 24/7 cardiac emergency response with precision surgical excellence.',
    details: 'Our Cardiology unit provides end-to-end cardiac care: non-invasive diagnostics (ECG, ECHO), interventional cardiology (angioplasty, stenting), and advanced cardiac surgery including bypass and valve repair. We run a dedicated cardiac ICU and rapid response teams for acute MI and heart failure.',
    bullets: [
      '24/7 Cath lab availability',
      'Advanced heart-failure clinic',
      'Minimally invasive valve repair',
      'Remote cardiac monitoring and telemetry'
    ],
    contact: 'cardiology@pims.hospital'
  },
  {
    emoji: '🦴',
    accent: 'rgba(31,111,214,0.1)',
    border: 'rgba(31,111,214,0.22)',
    title: 'Orthopedics',
    desc: 'Expert joint replacement, sports medicine, and trauma care using robotic-assisted technology.',
    details: 'Orthopedics offers joint preservation and replacement, complex fracture management, and sports injury rehabilitation. Our multidisciplinary pathway reduces hospital stay and speeds recovery.',
    bullets: ['Robotic-assisted joint replacement', 'Acute trauma team', 'Integrated physiotherapy pathway'],
    contact: 'orthopedics@pims.hospital'
  },
  {
    emoji: '🧠',
    accent: 'rgba(107,60,174,0.1)',
    border: 'rgba(107,60,174,0.22)',
    title: 'Neurology',
    desc: 'Comprehensive neurological diagnostics and neurosurgery for complex brain and spine conditions.',
    details: 'Neurology and Neurosurgery teams handle stroke, epilepsy, neuro-oncology, and spine disorders. Imaging and intraoperative monitoring ensure better outcomes for complex cases.',
    bullets: ['24/7 stroke response', 'EEG and advanced neuroimaging', 'Minimally invasive spine surgery'],
    contact: 'neurology@pims.hospital'
  },
  {
    emoji: '🌱',
    accent: 'rgba(29,143,86,0.1)',
    border: 'rgba(29,143,86,0.22)',
    title: 'Pediatrics',
    desc: 'Gentle, expert care for our youngest patients in a child-friendly, nurturing environment.',
    details: 'Pediatrics provides family-centered inpatient and outpatient care, neonatal services, and pediatric subspecialties. We emphasize safe transitions and parental education.',
    bullets: ['Neonatal unit', 'Pediatric specialists on-call', 'Child life and family support'],
    contact: 'pediatrics@pims.hospital'
  },
];

const STATS = [
  { value: '50+', label: 'Expert Doctors', icon: '👨‍⚕️' },
  { value: '10k+', label: 'Patients Served', icon: '🏥' },
  { value: '200+', label: 'Modern Beds', icon: '🛏️' },
  { value: '24/7', label: 'Emergency Support', icon: '🚨' },
];

const FEATURES = [
  'World-class Diagnostic Labs',
  'AI-Powered Patient Monitoring',
  'Integrated Pharmacy Services',
  'Transparent Digital Billing',
];

function PimsIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M16 7v18M7 16h18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ThemeIcon({ dark }) {
  return dark ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [dark, toggleDark] = useDarkMode();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeService, setActiveService] = useState(null);
  useScrollReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="lp-root">
      {/* NAV */}
      <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <button className="lp-nav-logo" onClick={() => navigate('/')}>
            <PimsIcon size={30} />
            <span className="lp-logo-text">PIMS 2.0</span>
          </button>

          <div className="lp-nav-links">
            <a href="#services" className="lp-nav-link">Services</a>
            <a href="#about" className="lp-nav-link">About Us</a>
            <button className="icon-button lp-theme-btn" onClick={toggleDark} title={dark ? 'Light mode' : 'Dark mode'}>
              <ThemeIcon dark={dark} />
            </button>
            <button className="button-primary lp-cta-sm" onClick={() => navigate('/patient/login')}>
              Patient Portal
            </button>
          </div>

          <div className="lp-nav-mobile-actions">
            <button className="icon-button lp-theme-btn" onClick={toggleDark}>
              <ThemeIcon dark={dark} />
            </button>
            <button className="icon-button" onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileOpen
                  ? <><path d="M2 2l14 14" /><path d="M16 2L2 16" /></>
                  : <><path d="M2 4h14" /><path d="M2 9h14" /><path d="M2 14h14" /></>}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lp-mobile-menu">
            <a href="#services" className="lp-mobile-link" onClick={() => setMobileOpen(false)}>Services</a>
            <a href="#about" className="lp-mobile-link" onClick={() => setMobileOpen(false)}>About Us</a>
            <div className="lp-mobile-action-row">
              <button className="button-primary" onClick={() => navigate('/patient/login')}>Patient Portal</button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <main id="main-content" tabIndex={-1}>
        <section className="lp-hero">
          <div className="lp-hero-bg">
            <img src="/hospital_hero.png" alt="Hospital ward with staff and patients" loading="lazy" className="lp-hero-img" />
            <div className="lp-hero-overlay" />
            <div className="lp-hero-vignette" />
          </div>
          <div className="lp-orb lp-orb-1" />
          <div className="lp-orb lp-orb-2" />

          <div className="lp-hero-content lp-container">
            <span className="badge lp-hero-badge lp-animate-1">
              <span className="lp-pulse-dot" />
              World-class hospital platform
            </span>

            <h1 className="lp-hero-title lp-animate-2">
              Precision care for a<br />
              <span className="lp-hero-gradient">modern hospital</span><br />
              network.
            </h1>

            <p className="lp-hero-sub lp-animate-3">
              PIMS 2.0 unifies clinicians, reception, pharmacy, billing, and patients
              into one secure environment built for speed, clarity, and better outcomes.
            </p>

            <div className="lp-hero-actions lp-animate-4">
              <button className="button-primary lp-btn-hero" onClick={() => navigate('/patient/login')}>
                Patient Portal
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="lp-hero-pills lp-animate-5">
              {['24/7 emergency coordination', 'Unified clinical workflows', 'Secure role-based access'].map(p => (
                <span key={p} className="pill lp-hero-pill">{p}</span>
              ))}
            </div>
          </div>

          <div className="lp-scroll-cue lp-animate-5">
            <div className="lp-scroll-line" />
            <span className="caption lp-scroll-caption">Scroll</span>
          </div>
        </section>

        {/* STATS */}
        <section className="lp-stats-wrap">
          <div className="lp-stats-card surface-card lp-reveal">
            {STATS.map((s, i) => (
              <div key={i} className={`lp-stat-item${i < STATS.length - 1 ? ' lp-stat-border' : ''}`}>
                <div className="lp-stat-emoji">{s.icon}</div>
                <strong className="lp-stat-val">{s.value}</strong>
                <span className="caption">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="lp-services lp-container">
          <div className="lp-section-head lp-reveal">
            <span className="caption lp-section-tag">Specialized Care</span>
            <h2 className="lp-section-title">Our <em className="lp-em">Services</em></h2>
            <p className="helper-text lp-section-sub">Comprehensive care tailored precisely to your health needs.</p>
          </div>

          <div className="lp-services-grid">
            {SERVICES.map((s, i) => (
              <div
                key={i}
                className="lp-service-card panel lp-reveal"
                role="button"
                tabIndex={0}
                aria-label={`Learn more about ${s.title}`}
                onClick={() => setActiveService(s)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveService(s); } }}
                style={{
                  transitionDelay: `${i * 70}ms`,
                  '--s-accent': s.accent,
                  '--s-border': s.border,
                  cursor: 'pointer'
                }}
              >
                <div className="lp-service-icon-wrap">
                  <span className="lp-service-emoji">{s.emoji}</span>
                </div>
                <h3 className="lp-service-title">{s.title}</h3>
                <p className="helper-text lp-service-desc">{s.desc}</p>
                <span className="lp-service-arrow">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Learn more
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="lp-about">
          <div className="lp-about-inner lp-container">
            <div className="lp-about-image-col lp-reveal">
              <div className="lp-about-img-frame">
                <img src="/medical_team.png" alt="Medical team in hospital" loading="lazy" className="lp-about-img" />
                <div className="lp-about-img-border" />
                <span className="badge badge-accent lp-about-badge">
                  <span className="lp-pulse-dot" />
                  Operational since 2019
                </span>
              </div>
            </div>

            <div className="lp-about-copy lp-reveal lp-about-copy--delayed">
              <span className="caption lp-section-tag">About PIMS 2.0</span>
              <h2 className="lp-section-title lp-text-left">
                Driven by <em className="lp-em">excellence.</em>
              </h2>
              <p className="helper-text lp-about-paragraph">
                Our team of internationally recognized specialists are pioneers in their
                fields. At PIMS 2.0, we don't just treat symptoms — we treat people,
                with technology that keeps every caregiver informed and every patient safe.
              </p>

              <ul className="lp-feature-list">
                {FEATURES.map((f, i) => (
                  <li key={i} className="lp-feature-item">
                    <span className="lp-feature-check">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <button className="button-primary lp-btn-gap" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>
                Learn About Our Mission
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* CTA BAND */}
        <section className="lp-cta-band lp-reveal">
          <div className="lp-cta-inner lp-container">
            <div>
              <h2 className="lp-cta-title">Ready to transform your hospital operations?</h2>
              <p className="lp-cta-sub">
                Join thousands of healthcare professionals already using PIMS 2.0.
              </p>
            </div>
            <div className="lp-cta-actions">
              <button className="lp-cta-btn-white" onClick={() => navigate('/login')}>Staff Access</button>
              <button className="lp-cta-btn-outline" onClick={() => navigate('/patient/login')}>Patient Portal</button>
            </div>
          </div>
        </section>
        {/* Service details modal */}
        {activeService && (
          <div className="lp-modal-backdrop" onClick={() => setActiveService(null)}>
            <div className="lp-modal panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <button className="lp-modal-close" onClick={() => setActiveService(null)} aria-label="Close details">✕</button>
              <div className="lp-modal-body">
                <h3 className="lp-modal-title">{activeService.title}</h3>
                <p className="lp-modal-desc">{activeService.details || activeService.desc}</p>
                {activeService.bullets && (
                  <ul style={{ marginTop: '0.75rem' }}>
                    {activeService.bullets.map((b, idx) => (
                      <li key={idx} style={{ marginBottom: '0.4rem' }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="lp-modal-actions">
                <a className="button-primary" href={`mailto:${activeService.contact || 'care@pims.hospital'}?subject=Info%20about%20${encodeURIComponent(activeService.title)}`}>
                  Request Info
                </a>
                <button className="button-secondary" onClick={() => setActiveService(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-top lp-container">
          <div className="lp-footer-brand">
            <div className="lp-footer-brand-row">
              <PimsIcon size={36} />
              <span className="lp-logo-text lp-logo-large">PIMS 2.0</span>
            </div>
            <p className="helper-text" style={{ marginTop: '0.85rem', maxWidth: 280, lineHeight: 1.7 }}>
              Leading the digital transformation of healthcare delivery worldwide.
            </p>
          </div>

          <div className="lp-footer-links">
            <div className="lp-footer-group">
              <div className="caption lp-footer-group-title">Quick Links</div>
              <a href="#services" className="lp-footer-link">Services</a>
              <a href="#about" className="lp-footer-link">About</a>
              <a href="/portals" className="lp-footer-link">Staff Portal</a>
              <a href="/dashboard" className="lp-footer-link">Dashboard</a>
              <a href="/patient/login" className="lp-footer-link">Patient Portal</a>
            </div>
            <div className="lp-footer-group">
              <div className="caption lp-footer-group-title">Support</div>
              <span className="helper-text lp-footer-support-text">Emergency: +1-800-PIMS-911</span>
              <span className="helper-text lp-footer-support-text">care@pims.hospital</span>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom lp-container">
          <span className="caption lp-footer-copy">
            © 2026 PIMS 2.0 Hospital Management System. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}