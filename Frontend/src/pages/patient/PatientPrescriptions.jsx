import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppIcon from '../../components/AppIcon';
import { downloadPrescriptionPdf, getApiMessage } from '../../api/pimsApi';
import usePatientPortalData from '../../hooks/usePatientPortalData';
import useToast from '../../hooks/useToast';
import {
  formatDate,
  getDoctorName,
  getMedicationName,
  getStatusNarrative,
  statusClass
} from '../../utils/patientPortal';

export default function PatientPrescriptions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const detailCardRef = useRef(null);
  const focusTimerRef = useRef(null);
  const clickPulseTimerRef = useRef(null);
  const {
    prescriptions,
    summary,
    latestPrescription,
    isLoading,
    errorMessage
  } = usePatientPortalData({ prescriptionLimit: 24 });
  const { notifyError, notifySuccess } = useToast();
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDetailCardFocused, setIsDetailCardFocused] = useState(false);
  const [clickedPrescriptionId, setClickedPrescriptionId] = useState('');
  const requestedPrescriptionId = searchParams.get('rx');

  useEffect(() => () => {
    if (focusTimerRef.current) {
      window.clearTimeout(focusTimerRef.current);
    }

    if (clickPulseTimerRef.current) {
      window.clearTimeout(clickPulseTimerRef.current);
    }
  }, []);

  useEffect(() => {
    setSelectedPrescriptionId((current) => {
      if (requestedPrescriptionId && prescriptions.some((item) => item._id === requestedPrescriptionId)) {
        return requestedPrescriptionId;
      }

      if (prescriptions.some((item) => item._id === current)) {
        return current;
      }

      return prescriptions[0]?._id || '';
    });
  }, [prescriptions, requestedPrescriptionId]);

  const selectedPrescription = useMemo(
    () => prescriptions.find((item) => item._id === selectedPrescriptionId) || prescriptions[0] || null,
    [prescriptions, selectedPrescriptionId]
  );

  const selectedPrescriptionItems = selectedPrescription?.items || [];

  const prescriptionSummaryCards = [
    {
      icon: 'prescription',
      label: 'Linked prescriptions',
      value: prescriptions.length,
      note: 'Available in your portal history'
    },
    {
      icon: 'clock',
      label: 'Awaiting progress',
      value: summary.pending,
      note: 'Still moving through review or fulfillment'
    },
    {
      icon: 'checkCircle',
      label: 'Completed fills',
      value: summary.filled,
      note: 'Ready in your completed history'
    },
    {
      icon: 'alert',
      label: 'Urgent items',
      value: summary.urgent,
      note: 'Marked urgent by your care team'
    }
  ];

  const handleDownload = async () => {
    if (!selectedPrescription?._id) {
      return;
    }

    setIsDownloading(true);

    try {
      const response = await downloadPrescriptionPdf(selectedPrescription._id);
      const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `${selectedPrescription.rxId || 'prescription'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
      notifySuccess('PDF ready', 'Your prescription PDF downloaded successfully.');
    } catch (error) {
      notifyError('Download failed', getApiMessage(error, 'Failed to download prescription PDF'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectPrescription = (prescriptionId, rxId) => {
    if (!prescriptionId) {
      return;
    }

    setSelectedPrescriptionId(prescriptionId);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('rx', prescriptionId);
    setSearchParams(nextParams, { replace: true });

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

    if (rxId) {
      notifySuccess('Prescription selected', `${rxId} details are ready on this page.`);
    }

    if (focusTimerRef.current) {
      window.clearTimeout(focusTimerRef.current);
    }

    focusTimerRef.current = window.setTimeout(() => {
      setIsDetailCardFocused(false);
    }, 1200);
  };

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

      <section className="patient-record-hero panel">
        <div className="page-title">
          <div className="section-title">
            <AppIcon name="prescription" size={20} />
            <h2>Prescription Center</h2>
          </div>
          <p className="helper-text">
            A dedicated page for browsing your full prescription history, reviewing medication plans, and downloading
            official PDF copies.
          </p>
        </div>

        <div className="patient-record-actions">
          <Link className="button-secondary" to="/patient">
            <AppIcon name="dashboard" size={16} />
            Back to Dashboard
          </Link>
          <Link className="button-secondary" to="/patient/profile">
            <AppIcon name="users" size={16} />
            Open Health Record
          </Link>
          <button className="button-primary" disabled={!selectedPrescription || isDownloading} onClick={handleDownload} type="button">
            <AppIcon name="download" size={16} />
            Download Selected PDF
          </button>
        </div>
      </section>

      <div className="patient-summary-grid">
        {prescriptionSummaryCards.map((card) => (
          <article className="patient-summary-card" key={card.label}>
            <span className="patient-summary-icon">
              <AppIcon name={card.icon} size={18} />
            </span>
            <div className="patient-summary-copy">
              <div className="caption">{card.label}</div>
              <strong>{card.value}</strong>
              <span className="helper-text">{card.note}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="patient-prescription-workspace">
        <section className="patient-prescription-panel">
          <div className="panel-head">
            <div className="page-title">
              <div className="section-title">
                <AppIcon name="clock" size={18} />
                <h3>Prescription History</h3>
              </div>
              <p className="helper-text">
                Choose any prescription in the list to open the full diagnosis, medication lines, and PDF actions.
              </p>
            </div>
            <span className="badge">{prescriptions.length} linked</span>
          </div>

          {isLoading ? (
            <div className="empty-state">
              <AppIcon name="clock" size={22} />
              <strong>Loading your prescription history</strong>
              <div className="helper-text">We&apos;re preparing the latest items linked to your patient record.</div>
            </div>
          ) : prescriptions.length ? (
            <div className="patient-prescription-list">
              {prescriptions.map((item) => (
                <div
                  className={`patient-prescription-item ${selectedPrescriptionId === item._id ? 'is-active' : ''} ${clickedPrescriptionId === item._id ? 'is-clicked' : ''}`.trim()}
                  key={item._id}
                >
                  <div className="patient-prescription-item-head">
                    <div>
                      <strong>{item.rxId}</strong>
                      <div className="helper-text">{formatDate(item.createdAt)}</div>
                    </div>
                    <div className="patient-prescription-item-badges">
                      {item.isUrgent ? <span className="patient-urgent-pill">Urgent</span> : null}
                      <span className={statusClass(item.status)}>{item.status}</span>
                    </div>
                  </div>

                  <div className="patient-prescription-item-body">
                    <p>{item.diagnosis || 'No diagnosis information supplied for this prescription.'}</p>
                    <div className="patient-prescription-item-meta">
                      <span>
                        <AppIcon name="users" size={15} />
                        {getDoctorName(item)}
                      </span>
                      <span>
                        <AppIcon name="pill" size={15} />
                        {item.items?.length || 0} medication line(s)
                      </span>
                    </div>
                    <div className="pill-row">
                      {item.items?.slice(0, 2).map((entry, index) => (
                        <span className="pill" key={`${item._id}-${entry.atcCode || index}`}>
                          {getMedicationName(entry)}
                        </span>
                      ))}
                    </div>
                    {selectedPrescriptionId === item._id ? (
                      <div className="patient-prescription-item-status">Details open on the right</div>
                    ) : null}
                  </div>

                  {clickedPrescriptionId === item._id ? (
                    <div className="patient-prescription-item-expanded">
                      <div className="patient-prescription-item-expanded-head">
                        <strong>Viewing {item.rxId}</strong>
                        <span className="pill">Opened</span>
                      </div>
                      <div className="helper-text">
                        {item.diagnosis || 'No diagnosis information supplied for this prescription.'}
                      </div>
                      <div className="pill-row">
                        <span className="pill">{formatDate(item.createdAt)}</span>
                        <span className="pill">{item.items?.length || 0} medication line(s)</span>
                        <span className="pill">PDF ready from the detail card</span>
                      </div>
                    </div>
                  ) : null}

                  <button
                    aria-label={`View details for ${item.rxId}`}
                    className={`patient-prescription-item-arrow ${clickedPrescriptionId === item._id ? 'is-clicked' : ''}`.trim()}
                    onClick={() => handleSelectPrescription(item._id, item.rxId)}
                    type="button"
                  >
                    <span>View details</span>
                    <AppIcon name="chevronRight" size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <AppIcon name="prescription" size={22} />
              <strong>No prescriptions linked yet</strong>
              <div className="helper-text">Your care team can link prescriptions to this portal as soon as they are issued.</div>
            </div>
          )}
        </section>

        <section
          className={`patient-detail-card${isDetailCardFocused ? ' is-focused' : ''}`}
          id="patient-prescription-details"
          ref={detailCardRef}
          tabIndex="-1"
        >
          <div className="patient-detail-head">
            <div className="page-title">
              <div className="section-title">
                <AppIcon name="note" size={18} />
                <h3>Prescription Details</h3>
              </div>
              <p className="helper-text">A focused breakdown of the selected prescription and medication instructions.</p>
            </div>
            <button className="button-secondary" disabled={!selectedPrescription || isDownloading} onClick={handleDownload} type="button">
              <AppIcon name="download" size={16} />
              Download PDF
            </button>
          </div>

          {selectedPrescription ? (
            <div className="patient-detail-content">
              <div className="patient-detail-hero">
                <div>
                  <div className="caption">Selected prescription</div>
                  <strong>{selectedPrescription.rxId}</strong>
                  <p className="helper-text">{getStatusNarrative(selectedPrescription.status)}</p>
                </div>
                <div className="patient-detail-hero-badges">
                  {selectedPrescription.isUrgent ? <span className="patient-urgent-pill">Urgent</span> : null}
                  <span className={statusClass(selectedPrescription.status)}>{selectedPrescription.status}</span>
                </div>
              </div>

              <div className="patient-detail-meta-grid">
                <article className="patient-detail-meta-card">
                  <span className="caption">Diagnosis</span>
                  <strong>{selectedPrescription.diagnosis || 'Not provided'}</strong>
                </article>
                <article className="patient-detail-meta-card">
                  <span className="caption">Issued on</span>
                  <strong>{formatDate(selectedPrescription.createdAt)}</strong>
                </article>
                <article className="patient-detail-meta-card">
                  <span className="caption">Clinician</span>
                  <strong>{getDoctorName(selectedPrescription)}</strong>
                </article>
                <article className="patient-detail-meta-card">
                  <span className="caption">Refills</span>
                  <strong>{selectedPrescription.allowRefills || 0} allowed</strong>
                </article>
              </div>

              {selectedPrescription.isUrgent ? (
                <div className="patient-detail-alert">
                  <AppIcon name="alert" size={18} />
                  <div>
                    <strong>Urgent prescription</strong>
                    <div className="helper-text">This medication request was marked as urgent by your care team.</div>
                  </div>
                </div>
              ) : null}

              <div className="patient-detail-section">
                <div className="section-title">
                  <AppIcon name="pill" size={18} />
                  <h3>Medication Plan</h3>
                </div>
                <div className="patient-medication-grid">
                  {selectedPrescriptionItems.map((item, index) => (
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
                        {item.instructions || 'Follow the dosage plan shown above and consult your care team for clarification.'}
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="patient-detail-footer">
                <span>
                  <AppIcon name="shield" size={16} />
                  Digital signature on file: {selectedPrescription.digitalSignature || 'Securely generated'}
                </span>
                <span>
                  <AppIcon name="calendar" size={16} />
                  Added to portal {formatDate(selectedPrescription.updatedAt || selectedPrescription.createdAt)}
                </span>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <AppIcon name="note" size={22} />
              <strong>Select a prescription to begin</strong>
              <div className="helper-text">
                Once selected, you&apos;ll see medication instructions, diagnosis context, and PDF access here.
              </div>
            </div>
          )}

          {!selectedPrescription && latestPrescription ? (
            <div className="helper-text">The latest available prescription is {latestPrescription.rxId}.</div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
