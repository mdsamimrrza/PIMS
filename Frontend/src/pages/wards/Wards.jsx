import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MainLayout from '../../layouts/MainLayout';
import AppIcon from '../../components/AppIcon';
import useToast from '../../hooks/useToast';
import { fetchBedLayout, updateBedStatus, fetchSanitQueue } from '../../store/slices/bedSlice';
import { dischargePatient } from '../../store/slices/admissionSlice';
import { fetchLatestVitals } from '../../store/slices/vitalsSlice';
import VitalsEntryForm from '../../components/vitals/VitalsEntryForm';
import VitalsTimeline from '../../components/vitals/VitalsTimeline';

export default function Wards() {
  const dispatch = useDispatch();
  const { notifySuccess, notifyError } = useToast();
  
  const { layout, status, sanitQueue } = useSelector((state) => state.beds);
  const latestVitals = useSelector((state) => state.vitals.latest);
  const [activeWard, setActiveWard] = useState('ICU');
  const [selectedBed, setSelectedBed] = useState(null);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'record', 'vitals'

  useEffect(() => {
    dispatch(fetchBedLayout());
    dispatch(fetchSanitQueue());
  }, [dispatch]);

  // Fetch latest vitals for occupied beds
  useEffect(() => {
    const occupiedBeds = Object.values(layout).flat().filter(b => b.status === 'occupied' && b.currentAdmission?._id);
    if (occupiedBeds.length > 0) {
      Promise.allSettled(occupiedBeds.map(b => dispatch(fetchLatestVitals(b.currentAdmission._id))));
    }
  }, [layout, dispatch]);

  const wardsList = ['ICU', 'ER', 'General', 'HDU', 'Isolation'];

  const handleMarkClean = async (id) => {
    try {
      await dispatch(updateBedStatus({ id, status: 'available' })).unwrap();
      notifySuccess('Bed marked as available');
      dispatch(fetchBedLayout());
      dispatch(fetchSanitQueue());
    } catch (err) {
      notifyError('Update failed', err);
    }
  };

  const handleDischarge = async () => {
    if (!selectedBed?.currentAdmission?._id) return;
    try {
      await dispatch(dischargePatient({ id: selectedBed.currentAdmission._id })).unwrap();
      notifySuccess('Patient discharged successfully');
      setShowDischargeModal(false);
      setSelectedBed(null);
      dispatch(fetchBedLayout());
      dispatch(fetchSanitQueue());
    } catch (err) {
      notifyError('Discharge failed', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#10b981'; // green
      case 'occupied': return '#f59e0b'; // amber
      case 'cleaning': return '#3b82f6'; // blue
      case 'maintenance': return '#6b7280'; // gray
      default: return 'var(--text-muted)';
    }
  };

  const renderBedVitals = (admissionId) => {
    const vitals = latestVitals[admissionId];
    if (!vitals) return <div className="bed-vitals-empty">No vitals</div>;

    const isCritical = vitals.alerts?.some(a => a.severity === 'critical');

    return (
      <div className={`bed-vitals-snapshot ${isCritical ? 'critical-pulse' : ''}`}>
        <div className="vitals-mini-row">
          <span>{vitals.vitals.hr || '--'} HR</span>
          <span>{vitals.vitals.spo2 ? `${vitals.vitals.spo2}%` : '--%'}</span>
        </div>
        {vitals.vitals.bp && (
          <div className="vitals-bp-mini">{vitals.vitals.bp.systolic}/{vitals.vitals.bp.diastolic}</div>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="page wards-page">
        <div className="toolbar">
          <h1>Ward Management</h1>
        </div>

        <div className="tabs-container">
          {wardsList.map((ward) => (
            <button
              key={ward}
              className={`tab-btn ${activeWard === ward ? 'active' : ''}`}
              onClick={() => setActiveWard(ward)}
            >
              {ward}
            </button>
          ))}
        </div>

        <div className="bed-grid-container mt-6">
          <div className="bed-grid">
            {status === 'loading' && !layout[activeWard] ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bed-card skeleton" />
              ))
            ) : (
              (layout[activeWard] || []).map((bed) => (
                <div
                  key={bed._id}
                  className={`bed-card ${selectedBed?._id === bed._id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedBed(bed);
                    setActiveTab('info');
                  }}
                >
                  <div className="bed-header">
                    <span className="bed-code">{bed.bedCode}</span>
                    <span className={`status-pill`} style={{ backgroundColor: getStatusColor(bed.status), color: '#fff' }}>
                      {bed.status}
                    </span>
                  </div>
                  <div className="bed-body">
                    <span className="type-badge">{bed.type}</span>
                    {bed.status === 'occupied' && bed.currentAdmission?.patientRef && (
                      <>
                        <div className="occupant-info">
                          <p className="patient-name">
                            {bed.currentAdmission.patientRef.firstName} {bed.currentAdmission.patientRef.lastName}
                          </p>
                        </div>
                        {renderBedVitals(bed.currentAdmission._id)}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Side Panel */}
          {selectedBed && (
            <div className={`side-panel side-panel-large ${selectedBed ? 'open' : ''}`}>
              <div className="panel-header">
                <h3>{selectedBed.bedCode} Details</h3>
                <button className="button-ghost" onClick={() => setSelectedBed(null)}>
                  <AppIcon name="x" />
                </button>
              </div>

              <div className="panel-tabs">
                <button className={`p-tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Info</button>
                {selectedBed.status === 'occupied' && (
                  <>
                    <button className={`p-tab ${activeTab === 'record' ? 'active' : ''}`} onClick={() => setActiveTab('record')}>Record</button>
                    <button className={`p-tab ${activeTab === 'vitals' ? 'active' : ''}`} onClick={() => setActiveTab('vitals')}>History</button>
                  </>
                )}
              </div>

              <div className="panel-content mt-4">
                {activeTab === 'info' && (
                  <>
                    <div className="detail-item">
                      <label>Status:</label>
                      <span className="status-pill" style={{ backgroundColor: getStatusColor(selectedBed.status), color: '#fff' }}>
                        {selectedBed.status}
                      </span>
                    </div>

                    {selectedBed.status === 'occupied' && selectedBed.currentAdmission && (
                      <div className="admission-details mt-6">
                        <h4>Current Admission</h4>
                        <div className="detail-card mt-2">
                          <p><strong>Patient:</strong> {selectedBed.currentAdmission.patientRef?.firstName} {selectedBed.currentAdmission.patientRef?.lastName}</p>
                          <p><strong>Priority:</strong> <span className={`priority-${selectedBed.currentAdmission.priority}`}>{selectedBed.currentAdmission.priority}</span></p>
                          <p><strong>Admitted:</strong> {new Date(selectedBed.currentAdmission.admittedAt).toLocaleString()}</p>
                          
                          <button 
                            className="button-danger mt-4 w-full"
                            onClick={() => setShowDischargeModal(true)}
                          >
                            Discharge Patient
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedBed.status === 'cleaning' && (
                      <button 
                        className="button-primary mt-6 w-full"
                        onClick={() => handleMarkClean(selectedBed._id)}
                      >
                        Mark as Available
                      </button>
                    )}
                  </>
                )}

                {activeTab === 'record' && (
                  <VitalsEntryForm 
                    admissionId={selectedBed.currentAdmission._id}
                    patientRef={selectedBed.currentAdmission.patientRef?._id}
                    patientName={`${selectedBed.currentAdmission.patientRef?.firstName} ${selectedBed.currentAdmission.patientRef?.lastName}`}
                    onSuccess={() => dispatch(fetchLatestVitals(selectedBed.currentAdmission._id))}
                  />
                )}

                {activeTab === 'vitals' && (
                  <VitalsTimeline admissionId={selectedBed.currentAdmission._id} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sanitization Queue */}
        <section className="panel mt-8">
          <div className="section-header">
            <h3>Sanitization Queue</h3>
          </div>
          <div className="data-table mt-4">
            <table>
              <thead>
                <tr>
                  <th>Bed</th>
                  <th>Ward</th>
                  <th>Last Action</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sanitQueue.length === 0 ? (
                  <tr><td colSpan="4" className="text-center">No beds in cleaning status</td></tr>
                ) : (
                  sanitQueue.map(bed => (
                    <tr key={bed._id}>
                      <td className="monospace">{bed.bedCode}</td>
                      <td>{bed.ward}</td>
                      <td>{bed.lastSanitizedAt ? new Date(bed.lastSanitizedAt).toLocaleTimeString() : 'N/A'}</td>
                      <td>
                        <button className="button-primary" onClick={() => handleMarkClean(bed._id)}>
                          Mark Ready
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Discharge Modal */}
        {showDischargeModal && (
          <div className="user-modal-backdrop">
            <div className="user-modal">
              <h3>Confirm Discharge</h3>
              <p>Are you sure you want to discharge this patient? This will free the bed for cleaning.</p>
              <div className="button-group mt-6">
                <button className="button-secondary" onClick={() => setShowDischargeModal(false)}>Cancel</button>
                <button className="button-danger" onClick={handleDischarge}>Confirm Discharge</button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .wards-page { padding: 2rem; }
          .tabs-container { display: flex; gap: 0.5rem; border-bottom: 1px solid var(--line); padding-bottom: 0.5rem; }
          .tab-btn { padding: 0.5rem 1.5rem; background: none; border: none; cursor: pointer; color: var(--text-muted); font-weight: 600; border-radius: 4px; }
          .tab-btn.active { background: var(--surface-muted); color: var(--accent); }
          
          .bed-grid-container { display: flex; gap: 2rem; position: relative; min-height: 400px; }
          .bed-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
          
          .bed-card { 
            background: var(--surface); 
            border: 1px solid var(--line); 
            border-radius: 12px; 
            padding: 1rem; 
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
          }
          .bed-card:hover { transform: translateY(-2px); border-color: var(--accent); }
          .bed-card.selected { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
          
          .bed-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
          .bed-code { font-family: monospace; font-weight: 700; font-size: 1.1rem; }
          
          .bed-body { display: flex; flex-direction: column; gap: 0.5rem; }
          .type-badge { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
          
          .patient-name { font-weight: 600; margin: 0; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          
          .bed-vitals-snapshot { 
            margin-top: 4px; 
            background: var(--surface-muted); 
            padding: 6px; 
            border-radius: 6px; 
            font-size: 0.75rem; 
          }
          .vitals-mini-row { display: flex; justify-content: space-between; font-weight: 700; }
          .vitals-bp-mini { margin-top: 2px; color: var(--text-muted); }
          
          .side-panel { 
            width: 320px; 
            background: var(--surface); 
            border: 1px solid var(--line); 
            border-radius: 12px;
            padding: 1.5rem;
            height: fit-content;
            position: sticky;
            top: 2rem;
            transition: transform 0.3s ease;
            max-height: 90vh;
            overflow-y: auto;
          }
          .side-panel-large { width: 400px; }
          
          .panel-tabs { display: flex; border-bottom: 1px solid var(--line); margin-top: 1rem; }
          .p-tab { flex: 1; padding: 0.5rem; background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 0.85rem; border-bottom: 2px solid transparent; }
          .p-tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

          .detail-item { display: flex; justify-content: space-between; margin-bottom: 0.75rem; font-size: 0.9rem; }
          .detail-item label { color: var(--text-muted); }
          
          .detail-card { background: var(--surface-muted); padding: 1rem; border-radius: 8px; }
          
          .skeleton { background: var(--surface-muted); min-height: 120px; border: none; }
          
          @keyframes pulse-red {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
          .critical-pulse { animation: pulse-red 2s infinite; border: 1px solid var(--danger); }
          .bed-vitals-empty { font-size: 0.7rem; font-style: italic; opacity: 0.6; }
        `}</style>
      </div>
    </MainLayout>
  );
}
