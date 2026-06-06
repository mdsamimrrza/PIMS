import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppIcon from '../../components/AppIcon';
import { getBedLayout, updateBedStatus, getApiMessage, getLatestVitals } from '../../api/pimsApi';
import useToast from '../../hooks/useToast';
import VitalsEntryForm from '../../components/vitals/VitalsEntryForm';
import VitalsTimeline from '../../components/vitals/VitalsTimeline';
import { fetchLatestVitals } from '../../store/slices/vitalsSlice';

export default function WardManagement() {
  const dispatch = useDispatch();
  const { notifyError, notifySuccess } = useToast();
  const [wards, setWards] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState(null);
  const [activeTab, setActiveTab] = useState('record'); // 'record' or 'history'
  
  const latestVitals = useSelector(state => state.vitals.latest);

  const fetchBeds = async () => {
    try {
      setIsLoading(true);
      const data = await getBedLayout();
      setWards(data);

      // Rule F: Fetch latest vitals for each occupied bed on load
      const occupiedBeds = Object.values(data).flat().filter(b => b.status === 'Occupied' && b.currentAdmission);
      
      // Use Promise.allSettled so one failure doesn't block others
      await Promise.allSettled(occupiedBeds.map(bed => 
        dispatch(fetchLatestVitals(bed.currentAdmission))
      ));
    } catch (err) {
      notifyError('Failed to load beds', getApiMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, []);

  const handleStatusChange = async (bedId, newStatus) => {
    try {
      await updateBedStatus(bedId, newStatus);
      notifySuccess('Status Updated', `Bed is now ${newStatus}`);
      fetchBeds();
      setSelectedBed(null);
    } catch (err) {
      notifyError('Update failed', getApiMessage(err));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'var(--accent-success)';
      case 'Occupied': return 'var(--accent-critical)';
      case 'Cleaning': return 'var(--accent-gold)';
      case 'Maintenance': return 'var(--accent-neutral-dark)';
      default: return 'var(--accent-neutral)';
    }
  };

  const renderBedVitals = (admissionId) => {
    const vitals = latestVitals[admissionId];
    if (!vitals) return <div className="bed-vitals-empty">No vitals</div>;

    const hasCritical = vitals.alerts?.some(a => a.severity === 'critical');

    return (
      <div className="bed-vitals-snapshot">
        {hasCritical && <div className="critical-pulse" />}
        <div className="vitals-row">
          <span>{vitals.vitals.hr || '--'} HR</span>
          <span>{vitals.vitals.spo2 ? `${vitals.vitals.spo2}%` : '--%'} SpO2</span>
        </div>
        {vitals.vitals.bp && (
          <div className="vitals-bp">{vitals.vitals.bp.systolic}/{vitals.vitals.bp.diastolic} BP</div>
        )}
      </div>
    );
  };

  return (
    <section className="page ward-management-page">
      <div className="page-title">
        <div className="section-title">
          <AppIcon name="home" size={24} />
          <h2>Ward & Bed Management</h2>
        </div>
        <p className="helper-text">Real-time overview of hospital bed occupancy and clinical status.</p>
      </div>

      {isLoading ? (
        <div className="empty-state">Loading ward layout...</div>
      ) : Object.keys(wards || {}).length === 0 ? (
        <div className="empty-state panel">
          <AppIcon name="info" size={32} />
          <p>No beds found. Please seed the bed inventory or contact an admin.</p>
        </div>
      ) : (
        <div className="ward-layout-grid">
          {Object.entries(wards || {}).map(([wardName, beds]) => (
            <section key={wardName} className="ward-section panel">
              <div className="ward-header">
                <h3>{wardName}</h3>
                <span className="pill">{beds.length} Beds</span>
              </div>
              <div className="bed-grid">
                {beds.map((bed) => (
                  <button
                    key={bed._id}
                    className={`bed-card ${selectedBed?._id === bed._id ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedBed(bed);
                      setActiveTab('record');
                    }}
                    style={{ borderTop: `4px solid ${getStatusColor(bed.status)}` }}
                  >
                    <div className="bed-card-head">
                      <strong>{bed.bedCode}</strong>
                      <span className="helper-text">{bed.type}</span>
                    </div>
                    {bed.status === 'Occupied' && bed.currentAdmission && (
                      <div className="bed-occupant">
                        <AppIcon name="users" size={14} />
                        <span>Occupied</span>
                        {renderBedVitals(bed.currentAdmission)}
                      </div>
                    )}
                    <div className="bed-status-pill">
                      <span className="status-dot" style={{ background: getStatusColor(bed.status) }} />
                      {bed.status}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {selectedBed && (
        <div className="user-modal-backdrop">
          <section className="user-modal" style={{ maxWidth: '600px' }}>
            <div className="toolbar">
              <div className="page-title">
                <div className="section-title">
                  <AppIcon name="home" size={20} />
                  <h3>Bed {selectedBed.bedCode} - {selectedBed.ward}</h3>
                </div>
                <p className="helper-text">Manage bed status and clinical documentation.</p>
              </div>
              <button className="button-ghost" onClick={() => setSelectedBed(null)}>Close</button>
            </div>

            <div className="bed-detail-layout">
              <div className="bed-detail-info panel">
                <div className="detail-row">
                  <span className="caption">Current Status</span>
                  <div className="status-pill">{selectedBed.status}</div>
                </div>
                <div className="detail-row">
                  <span className="caption">Ward / Room</span>
                  <strong>{selectedBed.ward}</strong>
                </div>
                <div className="detail-row">
                  <span className="caption">Bed Type</span>
                  <strong>{selectedBed.type}</strong>
                </div>

                <div className="bed-actions mt-4">
                  <label className="field-label">Quick Status Update</label>
                  <div className="button-group">
                    <button 
                      className="button-secondary button-small"
                      disabled={selectedBed.status === 'Available'}
                      onClick={() => handleStatusChange(selectedBed._id, 'Available')}
                    >
                      Make Available
                    </button>
                    <button 
                      className="button-secondary button-small"
                      disabled={selectedBed.status === 'Cleaning'}
                      onClick={() => handleStatusChange(selectedBed._id, 'Cleaning')}
                    >
                      Set Cleaning
                    </button>
                    <button 
                      className="button-secondary button-small"
                      disabled={selectedBed.status === 'Maintenance'}
                      onClick={() => handleStatusChange(selectedBed._id, 'Maintenance')}
                    >
                      Maintenance
                    </button>
                  </div>
                </div>
              </div>

              {selectedBed.status === 'Occupied' && selectedBed.currentAdmission && (
                <div className="bed-clinical-panel mt-4">
                  <div className="p-tabs mb-4" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--line)' }}>
                    <button 
                      className={`p-tab ${activeTab === 'record' ? 'is-active' : ''}`}
                      onClick={() => setActiveTab('record')}
                      style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'record' ? '2px solid var(--accent)' : 'none' }}
                    >
                      Record Vitals
                    </button>
                    <button 
                      className={`p-tab ${activeTab === 'history' ? 'is-active' : ''}`}
                      onClick={() => setActiveTab('history')}
                      style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'history' ? '2px solid var(--accent)' : 'none' }}
                    >
                      Vitals History
                    </button>
                  </div>

                  <div className="tab-content">
                    {activeTab === 'record' ? (
                      <VitalsEntryForm 
                        admissionId={selectedBed.currentAdmission}
                        onSuccess={() => {
                          fetchBeds();
                          setActiveTab('history');
                        }}
                      />
                    ) : (
                      <VitalsTimeline admissionId={selectedBed.currentAdmission} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <style>{`
        .ward-layout-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        .ward-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--line);
        }
        .bed-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.75rem;
        }
        .bed-card {
          background: var(--surface-muted);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 0.75rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .bed-card:hover {
          background: var(--surface);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }
        .bed-card.is-selected {
          box-shadow: 0 0 0 2px var(--accent);
          background: var(--surface);
        }
        .bed-card-head {
          display: flex;
          flex-direction: column;
        }
        .bed-occupant {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--accent-critical);
          font-weight: 600;
        }
        .bed-status-pill {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          margin-top: auto;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .bed-vitals-snapshot {
          margin-top: 4px;
          font-size: 0.7rem;
          color: var(--text-main);
        }
        .critical-pulse {
          width: 8px;
          height: 8px;
          background: var(--danger);
          border-radius: 50%;
          display: inline-block;
          margin-right: 4px;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
      `}</style>
    </section>
  );
}
