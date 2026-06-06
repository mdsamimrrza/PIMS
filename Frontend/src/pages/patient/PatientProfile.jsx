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

export default function PatientProfile() {
  const {
    patient,
    latestPrescription,
    summary,
    lastUpdateDate,
    isLoading,
    errorMessage
  } = usePatientPortalData({ prescriptionLimit: 12 });

  const patientAllergies = patient?.allergies || [];
  const patientHistory = patient?.medicalHistory || [];

  const recordFacts = [
    { label: 'Patient ID', value: patient?.patientId || 'Not linked' },
    { label: 'Email', value: patient?.userId?.email || 'No portal account' },
    { label: 'Date of birth', value: formatDate(patient?.dob) },
    { label: 'Age', value: getAgeFromDob(patient?.dob) },
    { label: 'Gender', value: patient?.gender || 'Not recorded' },
    { label: 'Weight', value: patient?.weight ? `${patient.weight} kg` : 'Not recorded' },
    { label: 'Latest update', value: formatDate(lastUpdateDate) }
  ];

  const statusBreakdown = [
    { label: 'Awaiting progress', value: summary.pending },
    { label: 'Completed fills', value: summary.filled },
    { label: 'Urgent items', value: summary.urgent },
    { label: 'Cancelled', value: summary.cancelled }
  ];

  return (
    <section className="page patient-record-page">
      {errorMessage ? (
        <div className="notice-banner patient-dashboard-notice" role="alert">
          <div>
            <strong>Patient portal issue</strong>
            <div className="helper-text">{errorMessage}</div>
          </div>
        </div>
      ) : null}

      <section className="patient-record-hero panel">
        <div className="page-title">
          <div className="section-title">
            <AppIcon name="users" size={20} />
            <h2>Health Record</h2>
          </div>
          <p className="helper-text">
            A dedicated record page for patient identity, safety notes, and the health context behind current care.
          </p>
        </div>

        <div className="patient-record-actions">
          <Link className="button-secondary" to="/patient">
            <AppIcon name="dashboard" size={16} />
            Back to Dashboard
          </Link>
          <Link className="button-primary" to="/patient/prescriptions">
            <AppIcon name="prescription" size={16} />
            Open Prescriptions
          </Link>
        </div>
      </section>

      <div className="patient-overview-grid">
        <section className="patient-record-card">
          <div className="panel-head">
            <div className="page-title">
              <div className="section-title">
                <AppIcon name="shield" size={18} />
                <h3>Patient Profile</h3>
              </div>
              <p className="helper-text">Core identity details and read-only information linked to this secure account.</p>
            </div>
            <span className="badge badge-accent">Read only</span>
          </div>

          {isLoading ? (
            <div className="empty-state">
              <AppIcon name="clock" size={22} />
              <strong>Loading health record</strong>
              <div className="helper-text">Preparing your patient profile and background details.</div>
            </div>
          ) : patient ? (
            <div className="patient-detail-content">
              <div className="patient-detail-hero">
                <div>
                  <div className="caption">Patient</div>
                  <strong>{patient.name}</strong>
                  <p className="helper-text">
                    {patient.patientId || 'Patient ID pending'} | {patient.gender || 'Not recorded'} | DOB {formatDate(patient.dob)}
                    {patient.userId?.email ? ` | ${patient.userId.email}` : ''}
                  </p>
                </div>
                <div className="patient-detail-hero-badges">
                  <span className="pill">{getAgeFromDob(patient.dob)}</span>
                  <span className="pill">{patient.weight ? `${patient.weight} kg` : 'Weight not recorded'}</span>
                </div>
              </div>

              <div className="patient-record-grid">
                {recordFacts.map((fact) => (
                  <article className="patient-record-tile" key={fact.label}>
                    <span className="caption">{fact.label}</span>
                    <strong>{fact.value}</strong>
                  </article>
                ))}
              </div>

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
                  {patientHistory.length ? (
                    <div className="patient-history-grid">
                      {patientHistory.map((entry) => (
                        <div className="patient-history-item" key={`${patient._id}-${entry}`}>
                          <AppIcon name="note" size={16} />
                          <span>{entry}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="helper-text">No medical history has been recorded for this account yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <AppIcon name="users" size={22} />
              <strong>Patient record not available</strong>
              <div className="helper-text">The linked patient profile could not be loaded.</div>
            </div>
          )}
        </section>

        <section className="patient-status-card">
          <div className="panel-head">
            <div className="page-title">
              <div className="section-title">
                <AppIcon name="reports" size={18} />
                <h3>Record Context</h3>
              </div>
              <p className="helper-text">Quick clinical context to pair with the profile before you move into prescriptions.</p>
            </div>
            {latestPrescription ? (
              <span className={statusClass(latestPrescription.status)}>{latestPrescription.status}</span>
            ) : null}
          </div>

          {latestPrescription ? (
            <div className="patient-detail-content">
              <div className="patient-status-note">
                <div className="caption">Latest linked prescription</div>
                <strong>{latestPrescription.rxId}</strong>
                <p className="helper-text">
                  Issued {formatDate(latestPrescription.createdAt)} by {getDoctorName(latestPrescription)}
                </p>
                <div className="pill-row">
                  {latestPrescription.items?.slice(0, 3).map((item, index) => (
                    <span className="pill" key={`${latestPrescription._id}-${item.atcCode || index}`}>
                      {getMedicationName(item)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="patient-status-list">
                {statusBreakdown.map((item) => (
                  <div className="patient-status-row" key={item.label}>
                    <div className="patient-status-row-copy">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="patient-status-track">
                      <span style={{ width: buildProgressWidth(item.value, Math.max(summary.total, 1)) }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="patient-detail-alert">
                <AppIcon name="shield" size={18} />
                <div>
                  <strong>Read-only patient record</strong>
                  <div className="helper-text">
                    Your record details stay protected here while prescription updates are reviewed in a separate page.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <AppIcon name="prescription" size={22} />
              <strong>No prescription context yet</strong>
              <div className="helper-text">When a prescription is linked, the current care summary will appear here.</div>
            </div>
          )}

          <div className="toolbar-group patient-layout-actions">
            <Link className="button-primary" to="/patient/prescriptions">
              <AppIcon name="prescription" size={16} />
              Review Prescription History
            </Link>
          </div>
        </section>
      </div>

      {latestPrescription ? (
        <section className="patient-record-card">
          <div className="panel-head">
            <div className="page-title">
              <div className="section-title">
                <AppIcon name="pill" size={18} />
                <h3>Latest Medication Snapshot</h3>
              </div>
              <p className="helper-text">A quick medication preview from the most recent prescription.</p>
            </div>
          </div>

          <div className="patient-medication-grid">
            {(latestPrescription.items || []).map((item, index) => (
              <article className="patient-medication-card" key={`${latestPrescription._id}-${item.atcCode || index}`}>
                <div className="patient-medication-card-head">
                  <strong>{getMedicationName(item)}</strong>
                  <span className="pill">{item.atcCode || 'ATC pending'}</span>
                </div>
                <div className="patient-medication-meta">
                  <span>{item.dose}</span>
                  <span>{item.frequency}</span>
                  <span>{item.route || 'Oral'}</span>
                  <span>{item.durationDays || 0} day(s)</span>
                </div>
                <div className="helper-text">
                  {item.instructions || 'Open the prescription page to review the full medication instructions.'}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
