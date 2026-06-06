import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AppIcon from '../../components/AppIcon';
import { downloadPrescriptionPdf, getApiMessage, getPatientById, listPrescriptions, createPatientPortalAccount, getActiveAdmissions, listInvoices, dischargePatient } from '../../api/pimsApi';
import useToast from '../../hooks/useToast';
import AdmissionModal from '../../components/AdmissionModal';

function statusClass(status) {
  if (status === 'Filled') {
    return 'status-pill status-success';
  }

  if (status === 'Pending' || status === 'Processing') {
    return 'status-pill status-warning';
  }

  if (status === 'Cancelled') {
    return 'status-pill status-critical';
  }

  return 'status-pill status-neutral';
}

function formatDate(value, options = {}) {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not available';
  }

  return parsed.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  });
}

function getAgeFromDob(value) {
  if (!value) {
    return 'Not available';
  }

  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) {
    return 'Not available';
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthOffset = today.getMonth() - dob.getMonth();

  if (monthOffset < 0 || (monthOffset === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return `${age} years`;
}

function getMedicationName(item) {
  return item?.medicineId?.name || item?.medicineId?.genericName || item?.atcCode || 'Medication';
}

function getDoctorName(prescription) {
  const doctor = prescription?.doctorId;
  const name = [doctor?.firstName, doctor?.lastName].filter(Boolean).join(' ').trim();
  return name || 'Assigned clinician';
}

function getStatusNarrative(status) {
  if (status === 'Filled') {
    return 'This prescription has been completed and is ready in the patient history.';
  }

  if (status === 'Processing') {
    return 'The pharmacy team is actively preparing this prescription.';
  }

  if (status === 'Pending') {
    return 'This prescription is waiting for the next dispensing step.';
  }

  if (status === 'Cancelled') {
    return 'This prescription was cancelled and is retained for the record.';
  }

  return 'Review the latest prescription details and medication plan.';
}

export default function PatientRecordDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const detailCardRef = useRef(null);
  const focusTimerRef = useRef(null);
  const clickPulseTimerRef = useRef(null);
  const { notifyError, notifySuccess } = useToast();
  const [patient, setPatient] = useState(location.state?.patient || null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDetailCardFocused, setIsDetailCardFocused] = useState(false);
  const [clickedPrescriptionId, setClickedPrescriptionId] = useState('');
  const [portalCredentials, setPortalCredentials] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [isProcessingDischarge, setIsProcessingDischarge] = useState(false);

  useEffect(() => () => {
    if (focusTimerRef.current) {
      window.clearTimeout(focusTimerRef.current);
    }

    if (clickPulseTimerRef.current) {
      window.clearTimeout(clickPulseTimerRef.current);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadPatientRecord() {
      if (!id) {
        setErrorMessage('Patient record id is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const [patientData, prescriptionData, admissionData, invoiceData] = await Promise.all([
          getPatientById(id),
          listPrescriptions({ patientId: id, limit: 50 }),
          getActiveAdmissions({ patientId: id }),
          listInvoices({ patientId: id })
        ]);

        if (!isActive) {
          return;
        }

        const nextPatient = patientData?.patient || location.state?.patient || null;
        const nextPrescriptions = prescriptionData?.prescriptions || [];

        setPatient(nextPatient);
        setPrescriptions(nextPrescriptions);
        setAdmissions(admissionData || []);
        setInvoices(invoiceData || []);
        setSelectedPrescriptionId((current) => (
          nextPrescriptions.some((item) => item._id === current)
            ? current
            : nextPrescriptions[0]?._id || ''
        ));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(getApiMessage(error, 'Failed to load patient record'));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadPatientRecord();

    return () => {
      isActive = false;
    };
  }, [id, location.state?.patient]);

  const reloadAdmissions = async () => {
    try {
      const data = await getActiveAdmissions({ patientId: id });
      setAdmissions(data || []);
    } catch (err) {
      notifyError('Refresh failed', getApiMessage(err));
    }
  };

  const handleDischarge = async (admissionId) => {
    if (!window.confirm('Are you sure you want to discharge this patient? This will free the assigned bed.')) return;
    
    setIsProcessingDischarge(true);
    try {
      await dischargePatient(admissionId);
      notifySuccess('Patient Discharged', 'The admission has been closed and the bed is now in cleaning status.');
      reloadAdmissions();
    } catch (err) {
      notifyError('Discharge failed', getApiMessage(err));
    } finally {
      setIsProcessingDischarge(false);
    }
  };

  // Listen for global data changes and reload this patient record when relevant
  useEffect(() => {
    let isActive = true;

    async function handleDataChanged(event) {
      const resource = event?.detail?.resource;
      if (resource && !['patients', 'prescriptions', 'users'].includes(resource)) {
        return;
      }

      try {
        setIsLoading(true);
        const [patientData, prescriptionData] = await Promise.all([
          getPatientById(id),
          listPrescriptions({ patientId: id, limit: 50 })
        ]);

        if (!isActive) return;

        const nextPatient = patientData?.patient || location.state?.patient || null;
        const nextPrescriptions = prescriptionData?.prescriptions || [];

        setPatient(nextPatient);
        setPrescriptions(nextPrescriptions);
        setSelectedPrescriptionId((current) => (
          nextPrescriptions.some((item) => item._id === current)
            ? current
            : nextPrescriptions[0]?._id || ''
        ));
      } catch (_error) {
        // keep existing error handling from primary loader
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    window.addEventListener('pims:data:changed', handleDataChanged);
    return () => { isActive = false; window.removeEventListener('pims:data:changed', handleDataChanged); };
  }, [id, location.state?.patient]);

  const handleCreatePortal = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      const response = await createPatientPortalAccount(id, { email: inviteEmail });
      setPortalCredentials({
        email: response.access?.email,
        loginUrl: response.access?.loginUrl,
        passwordSetupRequired: response.access?.passwordSetupRequired,
        inviteDelivered: response.access?.inviteEmail?.delivered ?? response.user?.inviteEmail?.delivered ?? false,
      });
      
      // Refresh patient data to show the new email
      const updatedData = await getPatientById(id);
      setPatient(updatedData.patient);
      
      notifySuccess('Portal account created', `Access has been granted to ${inviteEmail}`, 4000);
      setShowInviteForm(false);
    } catch (err) {
      notifyError('Failed to create portal', getApiMessage(err), 5000);
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!portalCredentials) return;
    const text = `Patient Portal Access\nURL: ${portalCredentials.loginUrl}\nEmail: ${portalCredentials.email}\nAction: Open the secure setup link sent by email to set a password.`;
    navigator.clipboard.writeText(text);
    notifySuccess('Copied to clipboard', 'You can now share the access instructions with the patient.', 3000);
  };

  const selectedPrescription = useMemo(
    () => prescriptions.find((item) => item._id === selectedPrescriptionId) || prescriptions[0] || null,
    [prescriptions, selectedPrescriptionId]
  );

  const patientAllergies = patient?.allergies || [];
  const patientHistory = patient?.medicalHistory || [];
  const latestPrescription = prescriptions[0] || null;

  const recordFacts = [
    { label: 'Patient ID', value: patient?.patientId || 'Not linked' },
    { label: 'Email', value: patient?.userId?.email || 'No portal account' },
    { label: 'Date of birth', value: formatDate(patient?.dob) },
    { label: 'Age', value: getAgeFromDob(patient?.dob) },
    { label: 'Gender', value: patient?.gender || 'Not recorded' },
    { label: 'Weight', value: patient?.weight ? `${patient.weight} kg` : 'Not recorded' },
    { label: 'Blood Group', value: patient?.bloodGroup || 'Not recorded' },
    { label: 'Emergency Contact', value: patient?.emergencyContact ? `${patient.emergencyContact.name} (${patient.emergencyContact.relation}) - ${patient.emergencyContact.phone}` : 'Not recorded' },
    { label: 'Latest update', value: formatDate(latestPrescription?.updatedAt || latestPrescription?.createdAt) }
  ];

  const handleDownloadPrescription = async (prescription) => {
    if (!prescription?._id) {
      return;
    }

    setIsDownloading(true);

    try {
      const response = await downloadPrescriptionPdf(prescription._id);
      const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `${prescription.rxId || 'prescription'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
      notifySuccess('PDF ready', `${prescription.rxId || 'Prescription'} downloaded successfully.`);
    } catch (error) {
      notifyError('Download failed', getApiMessage(error, 'Failed to download prescription PDF'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectPrescription = (prescriptionId) => {
    if (!prescriptionId) {
      return;
    }

    setSelectedPrescriptionId(prescriptionId);

    // Replay the detail-card highlight even when the same prescription is clicked again.
    setIsDetailCardFocused(false);
    window.requestAnimationFrame(() => {
      setIsDetailCardFocused(true);
      detailCardRef.current?.focus?.({ preventScroll: true });
      detailCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    setClickedPrescriptionId(prescriptionId);
    if (clickPulseTimerRef.current) {
      window.clearTimeout(clickPulseTimerRef.current);
    }

    clickPulseTimerRef.current = window.setTimeout(() => {
      setClickedPrescriptionId('');
    }, 520);

    if (focusTimerRef.current) {
      window.clearTimeout(focusTimerRef.current);
    }

    focusTimerRef.current = window.setTimeout(() => {
      setIsDetailCardFocused(false);
    }, 1200);
  };

  if (errorMessage && !patient) {
    return (
      <section className="page patient-record-page">
        <div className="notice-banner" role="alert">
          <div>
            <strong>Patient record unavailable</strong>
            <div className="helper-text">{errorMessage}</div>
          </div>
          <button className="button-ghost" onClick={() => navigate('/dashboard')} type="button">
            Back to search
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page patient-record-page">
      {errorMessage ? (
        <div className="notice-banner" role="alert">
          <div>
            <strong>Patient record issue</strong>
            <div className="helper-text">{errorMessage}</div>
          </div>
        </div>
      ) : null}

      <section className="patient-record-hero panel">
        <div className="page-title">
          <div className="section-title">
            <AppIcon name="users" size={20} />
            <h2>{patient?.name || 'Patient Record'}</h2>
          </div>
          <p className="helper-text">
            Complete patient details, prescription history, and PDF access in one record page.
          </p>
        </div>

        <div className="patient-record-actions">
          <Link className="button-secondary" to="/dashboard">
            Back to Search
          </Link>
          <button
            className="button-primary"
            onClick={() => setShowAdmissionModal(true)}
            type="button"
          >
            <AppIcon name="plusCircle" size={16} />
            Admit Patient
          </button>
          <button
            className="button-primary"
            disabled={!selectedPrescription || isDownloading}
            onClick={() => handleDownloadPrescription(selectedPrescription)}
            type="button"
          >
            <AppIcon name="download" size={16} />
            Download Selected PDF
          </button>
        </div>
      </section>

      {showAdmissionModal && (
        <AdmissionModal 
          patient={patient} 
          onClose={() => setShowAdmissionModal(false)}
          onSuccess={() => {
            setShowAdmissionModal(false);
            reloadAdmissions();
          }}
        />
      )}

      <div className="patient-record-layout">
        <section
          className={`patient-detail-card${isDetailCardFocused ? ' is-focused' : ''}`}
          id="patient-selected-prescription"
          ref={detailCardRef}
          tabIndex="-1"
        >
          <div className="patient-detail-head">
            <div className="page-title">
              <div className="section-title">
                <AppIcon name="note" size={18} />
                <h3>Patient Information</h3>
              </div>
              <p className="helper-text">Identity, safety notes, and medical background tied to this patient record.</p>
            </div>
            <span className={statusClass(selectedPrescription?.status || 'Pending')}>
              {prescriptions.length ? `${prescriptions.length} prescription(s)` : 'No prescriptions'}
            </span>
          </div>

          {isLoading ? (
            <div className="helper-text">Loading patient record...</div>
          ) : patient ? (
            <div className="patient-detail-content">
              <div className="patient-detail-hero">
                <div>
                  <div className="caption">Selected patient</div>
                  <strong>{patient.name}</strong>
                  <p className="helper-text">
                    {patient.patientId} · {patient.gender || 'Not recorded'} · DOB {formatDate(patient.dob)}
                    {patient.userId?.email ? ` · ${patient.userId.email}` : ''}
                  </p>
                </div>
                <div className="patient-detail-hero-badges">
                  <span className="pill">{getAgeFromDob(patient.dob)}</span>
                  <span className="pill">{patient.weight ? `${patient.weight} kg` : 'Weight not recorded'}</span>
                </div>
              </div>

              <div className="patient-detail-ledger">
                {recordFacts.map((item) => (
                  <article className="patient-detail-ledger-row" key={item.label}>
                    <span className="caption">{item.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong>{item.value}</strong>
                      {item.label === 'Email' && !patient?.userId && !showInviteForm && !portalCredentials && (
                        <button 
                          className="button-ghost button-small" 
                          onClick={() => {
                            setInviteEmail('');
                            setShowInviteForm(true);
                          }}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          type="button"
                        >
                          Link Email
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {showInviteForm && (
                <div className="patient-detail-section patient-detail-section-soft" style={{ marginTop: '1rem', border: '1px solid var(--accent-gold-soft)' }}>
                  <div className="section-title">
                    <AppIcon name="shield" size={18} />
                    <h3>Create Patient Portal Account</h3>
                  </div>
                  <p className="helper-text">Enter the patient's email to grant them access to their prescription history.</p>
                  <form className="field-row" onSubmit={handleCreatePortal} style={{ marginTop: '0.75rem' }}>
                    <label className="search-field" style={{ flex: 1 }}>
                      <AppIcon name="email" size={16} />
                      <input 
                        autoFocus
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="patient@example.com"
                        required
                        type="email"
                        value={inviteEmail}
                      />
                    </label>
                    <button className="button-primary" disabled={isInviting} type="submit">
                      {isInviting ? 'Creating...' : 'Grant Access'}
                    </button>
                    <button className="button-ghost" onClick={() => setShowInviteForm(false)} type="button">Cancel</button>
                  </form>
                </div>
              )}

              {portalCredentials && (
                <div className="patient-detail-section patient-detail-section-soft" style={{ marginTop: '1rem', background: 'var(--accent-gold-pale)', border: '1px solid var(--accent-gold)' }}>
                  <div className="section-title">
                    <AppIcon name="checkCircle" size={18} />
                    <h3 style={{ color: 'var(--accent-gold-dark)' }}>Portal Credentials Generated</h3>
                  </div>
                  <p className="helper-text" style={{ color: 'var(--accent-gold-dark)' }}>
                    The patient must use the secure setup email to set their password before signing in.
                  </p>
                  <div className="patient-record-grid" style={{ marginTop: '1rem' }}>
                    <article className="patient-record-tile">
                      <span className="caption">Login URL</span>
                      <strong>{portalCredentials.loginUrl}</strong>
                    </article>
                    <article className="patient-record-tile">
                      <span className="caption">Email Address</span>
                      <strong>{portalCredentials.email}</strong>
                    </article>
                    <article className="patient-record-tile">
                      <span className="caption">Password Setup</span>
                      <strong>{portalCredentials.passwordSetupRequired ? 'Required via secure email link' : 'Already configured'}</strong>
                    </article>
                    <article className="patient-record-tile">
                      <span className="caption">Invite Delivery</span>
                      <strong>{portalCredentials.inviteDelivered ? 'Sent' : 'Pending / check email delivery mode'}</strong>
                    </article>
                  </div>
                  <div className="toolbar-group" style={{ marginTop: '1rem' }}>
                    <button className="button-primary" onClick={handleCopyCredentials} type="button">
                      <AppIcon name="copy" size={16} />
                      Copy All Details
                    </button>
                    <button className="button-secondary" onClick={() => setPortalCredentials(null)} type="button">Dismiss</button>
                  </div>
                </div>
              )}

              <div className="patient-detail-dual-grid">
                <div className="patient-detail-section patient-detail-section-soft">
                  <div className="section-title">
                    <AppIcon name="alert" size={18} />
                    <h3>Allergies</h3>
                  </div>
                  <div className="pill-row">
                    {patientAllergies.length ? patientAllergies.map((entry) => (
                      <span className="pill" key={`${patient._id}-${entry.substance}`}>
                        {entry.substance} ({entry.severity || 'Mild'})
                      </span>
                    )) : <span className="pill">No allergies recorded</span>}
                  </div>
                </div>

                <div className="patient-detail-section patient-detail-section-soft">
                  <div className="section-title">
                    <AppIcon name="note" size={18} />
                    <h3>Medical History</h3>
                  </div>
                  <div className="pill-row">
                    {patientHistory.length ? patientHistory.map((entry) => (
                      <span className="pill" key={`${patient._id}-${entry}`}>
                        {entry}
                      </span>
                    )) : <span className="pill">No medical history recorded</span>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <AppIcon name="users" size={22} />
              <strong>Patient record not available</strong>
              <div className="helper-text">The selected patient could not be loaded.</div>
            </div>
          )}
        </section>

        <section className="patient-detail-card">
          <div className="patient-detail-head">
            <div className="page-title">
              <div className="section-title">
                <AppIcon name="prescription" size={18} />
                <h3>Selected Prescription</h3>
              </div>
              <p className="helper-text">Review diagnosis, status, and the medication plan for the active prescription.</p>
            </div>
            {selectedPrescription ? (
              <button
                className="button-secondary"
                disabled={isDownloading}
                onClick={() => handleDownloadPrescription(selectedPrescription)}
                type="button"
              >
                <AppIcon name="download" size={16} />
                Download PDF
              </button>
            ) : null}
          </div>

          {selectedPrescription ? (
            <div className="patient-detail-content">
              <div className="patient-detail-hero">
                <div>
                  <div className="caption">Prescription</div>
                  <strong>{selectedPrescription.rxId}</strong>
                  <p className="helper-text">{getStatusNarrative(selectedPrescription.status)}</p>
                </div>
                <div className="patient-detail-hero-badges">
                  {selectedPrescription.isUrgent ? <span className="patient-urgent-pill">Urgent</span> : null}
                  <span className={statusClass(selectedPrescription.status)}>{selectedPrescription.status}</span>
                </div>
              </div>

              <div className="patient-detail-ledger">
                <article className="patient-detail-ledger-row">
                  <span className="caption">Diagnosis</span>
                  <strong>{selectedPrescription.diagnosis || 'Not provided'}</strong>
                </article>
                <article className="patient-detail-ledger-row">
                  <span className="caption">Issued on</span>
                  <strong>{formatDate(selectedPrescription.createdAt)}</strong>
                </article>
                <article className="patient-detail-ledger-row">
                  <span className="caption">Clinician</span>
                  <strong>{getDoctorName(selectedPrescription)}</strong>
                </article>
                <article className="patient-detail-ledger-row">
                  <span className="caption">Refills</span>
                  <strong>{selectedPrescription.allowRefills || 0} allowed</strong>
                </article>
              </div>

              <div className="patient-detail-section">
                <div className="section-title">
                  <AppIcon name="pill" size={18} />
                  <h3>Medication Plan</h3>
                </div>
                <div className="patient-medication-grid">
                  {(selectedPrescription.items || []).map((item, index) => (
                    <article className="patient-medication-card" key={`${selectedPrescription._id}-${item.atcCode || index}`}>
                      <div className="patient-medication-card-head">
                        <strong>{getMedicationName(item)}</strong>
                        <span className="pill">{item.atcCode || 'ATC pending'}</span>
                      </div>
                      <div className="patient-medication-meta">
                        <span>{item.dose}</span>
                        <span>{item.frequency}</span>
                        <span>{item.route || 'Oral'}</span>
                        <span>{item.durationDays || 0} day(s)</span>
                        <span>Qty {item.quantity || 1}</span>
                      </div>
                      <div className="helper-text">
                        {item.instructions || 'Follow the dosage plan shown above and consult the care team for clarification.'}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <AppIcon name="prescription" size={22} />
              <strong>No prescription selected</strong>
              <div className="helper-text">The latest prescription will appear here once the record is loaded.</div>
            </div>
          )}
        </section>
      </div>

      <section className="patient-prescription-panel">
        <div className="patient-detail-head">
          <div className="page-title">
            <div className="section-title">
              <AppIcon name="clock" size={18} />
              <h3>Prescription History</h3>
            </div>
            <p className="helper-text">Select a prescription below to review full details or download the PDF copy.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="helper-text">Loading prescription history...</div>
        ) : prescriptions.length ? (
          <div className="patient-prescription-list">
            {prescriptions.map((prescription) => (
              <button
                className={`patient-prescription-item ${selectedPrescriptionId === prescription._id ? 'is-active' : ''} ${clickedPrescriptionId === prescription._id ? 'is-clicked' : ''}`.trim()}
                key={prescription._id}
                onClick={() => handleSelectPrescription(prescription._id)}
                type="button"
              >
                <div className="patient-prescription-item-head">
                  <div>
                    <strong>{prescription.rxId}</strong>
                    <div className="helper-text">{formatDate(prescription.createdAt)}</div>
                  </div>
                  <div className="patient-prescription-item-badges">
                    {prescription.isUrgent ? <span className="patient-urgent-pill">Urgent</span> : null}
                    <span className={statusClass(prescription.status)}>{prescription.status}</span>
                  </div>
                </div>

                <div className="patient-prescription-item-body">
                  <p>{prescription.diagnosis || 'No diagnosis information supplied for this prescription.'}</p>
                  <div className="patient-prescription-item-meta">
                    <span>
                      <AppIcon name="users" size={15} />
                      {getDoctorName(prescription)}
                    </span>
                    <span>
                      <AppIcon name="pill" size={15} />
                      {prescription.items?.length || 0} medication line(s)
                    </span>
                  </div>
                  <div className="pill-row">
                    {(prescription.items || []).slice(0, 2).map((entry, index) => (
                      <span className="pill" key={`${prescription._id}-${entry.atcCode || index}`}>
                        {getMedicationName(entry)}
                      </span>
                    ))}
                  </div>
                  {selectedPrescriptionId === prescription._id ? (
                    <div className="patient-prescription-item-status">Details open above</div>
                  ) : null}
                </div>

                <span className={`patient-prescription-item-arrow ${clickedPrescriptionId === prescription._id ? 'is-clicked' : ''}`.trim()}>
                  <AppIcon name="chevronRight" size={18} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <AppIcon name="prescription" size={22} />
            <strong>No prescriptions found</strong>
            <div className="helper-text">This patient does not have any linked prescriptions yet.</div>
          </div>
        )}
      </section>


      <section className="patient-prescription-panel">
        <div className="patient-detail-head">
          <div className="section-title">
            <AppIcon name="calendar" size={18} />
            <h3>Admission History</h3>
          </div>
        </div>
        <div className="mini-list" style={{ marginTop: '1rem' }}>
          {admissions.map(adm => (
            <div key={adm._id} className="mini-list-item">
              <div>
                <strong>{(adm.priority || 'routine').toUpperCase()} Admission - {adm.bedRef?.ward || 'Ward'} (Bed {adm.bedRef?.bedCode || 'N/A'})</strong>
                <div className="helper-text">{formatDate(adm.admittedAt)} - {adm.dischargedAt ? formatDate(adm.dischargedAt) : 'Ongoing'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className={`status-pill ${adm.status === 'discharged' ? 'status-success' : 'status-warning'}`}>{adm.status?.toUpperCase()}</span>
                {adm.status === 'active' && (
                  <button 
                    className="button-ghost button-small" 
                    disabled={isProcessingDischarge}
                    onClick={() => handleDischarge(adm._id)}
                    style={{ color: 'var(--accent-critical)' }}
                  >
                    Discharge
                  </button>
                )}
              </div>
            </div>
          ))}
          {!admissions.length && <div className="helper-text">No admission history found.</div>}
        </div>
      </section>

      <section className="patient-prescription-panel">
        <div className="patient-detail-head">
          <div className="section-title">
            <AppIcon name="inventory" size={18} />
            <h3>Billing & Invoices</h3>
          </div>
        </div>
        <div className="mini-list" style={{ marginTop: '1rem' }}>
          {invoices.map(inv => (
            <div key={inv._id} className="mini-list-item">
              <div>
                <strong>{inv.invoiceNumber}</strong>
                <div className="helper-text">Total: ${inv.grandTotal} · {formatDate(inv.createdAt)}</div>
              </div>
              <span className={`status-pill ${inv.paymentStatus === 'Paid' ? 'status-success' : 'status-warning'}`}>{inv.paymentStatus}</span>
            </div>
          ))}
          {!invoices.length && <div className="helper-text">No billing history found.</div>}
        </div>
      </section>
    </section>
  );
}
