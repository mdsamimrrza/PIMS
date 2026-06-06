import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmergencyQueue, setQueue } from '../../store/slices/emergencySlice';
import MainLayout from '../../layouts/MainLayout';
import AppIcon from '../../components/AppIcon';
import TriageModal from '../../components/emergency/TriageModal';
import OverrideDispenseModal from '../../components/emergency/OverrideDispenseModal';

export default function EmergencyQueue() {
  const dispatch = useDispatch();
  const { queue, status } = useSelector(state => state.emergency);
  const { user } = useSelector(state => state.auth);

  const [connected, setConnected] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [modalType, setModalType] = useState(null); // 'triage' or 'override'

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    dispatch(fetchEmergencyQueue());

    const eventSource = new EventSource('/api/emergency/stream', { withCredentials: true });

    eventSource.onopen = () => setConnected(true);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      dispatch(setQueue(data));
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
      // Reconnect logic would go here, but simple refresh also works
    };

    return () => {
      eventSource.close();
    };
  }, [dispatch]);

  const getWaitTime = (arrivedAt) => {
    const diff = Math.floor((currentTime - new Date(arrivedAt)) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs}s`;
  };

  const filteredQueue = queue.filter(visit => {
    const matchStatus = filterStatus === 'all' || visit.status === filterStatus;
    const matchPriority = filterPriority === 'all' || visit.priority === filterPriority;
    return matchStatus && matchPriority;
  });

  const getPriorityColor = (p) => {
    switch (p) {
      case 'emergency': return 'var(--danger)';
      case 'stat': return '#f97316';
      case 'urgent': return '#f59e0b';
      default: return 'var(--text-muted)';
    }
  };

  const getTriageColor = (score) => {
    const colors = ['', '#ef4444', '#f97316', '#eab308', '#3b82f6', '#94a3b8'];
    return colors[score] || 'var(--line)';
  };

  return (
    <MainLayout>
      <section className="page">
        <div className="toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1>Emergency Queue</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? 'var(--accent)' : 'var(--danger)' }} />
              <span className="muted">{connected ? 'Live' : 'Reconnecting...'}</span>
            </div>
          </div>
          <div className="button-group">
            <button className="button-secondary" onClick={() => dispatch(fetchEmergencyQueue())}>Refresh</button>
          </div>
        </div>

        <div className="panel mt-6">
          <div className="field-grid two" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
            <div>
              <label className="field-label">Status Filter</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Active</option>
                <option value="waiting">Waiting</option>
                <option value="in_triage">In Triage</option>
                <option value="being_treated">Being Treated</option>
              </select>
            </div>
            <div>
              <label className="field-label">Priority Filter</label>
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                <option value="all">All Priorities</option>
                <option value="emergency">Emergency</option>
                <option value="stat">Stat</option>
                <option value="urgent">Urgent</option>
                <option value="routine">Routine</option>
              </select>
            </div>
          </div>
        </div>

        <section className="panel mt-6">
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Patient</th>
                  <th>Chief Complaint</th>
                  <th>Triage</th>
                  <th>Arrival Mode</th>
                  <th>Wait Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map(visit => (
                  <tr key={visit._id}>
                    <td>
                      <span className="status-pill" style={{ background: getPriorityColor(visit.priority), color: 'white', border: 'none' }}>
                        {visit.priority.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <strong>{visit.patientRef ? `${visit.patientRef.firstName} ${visit.patientRef.lastName}` : `Walk-in: ${visit.walkInData?.name}`}</strong>
                      <div className="muted small">{visit.patientRef?.uhid || 'No UHID'}</div>
                    </td>
                    <td>{visit.chiefComplaint}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: getTriageColor(visit.triageScore) }} />
                        <span>ESI {visit.triageScore}</span>
                      </div>
                    </td>
                    <td>{visit.arrivalMode.replace('_', ' ')}</td>
                    <td className="monospace">{getWaitTime(visit.timestamps.arrivedAt)}</td>
                    <td>
                      <span className="status-pill">{visit.status.replace('_', ' ')}</span>
                    </td>
                    <td>
                      <div className="button-group">
                        {['nurse', 'doctor', 'admin'].includes(user?.role) && (
                          <button className="button-ghost button-small" onClick={() => { setSelectedVisit(visit); setModalType('triage'); }}>Triage</button>
                        )}
                        {user?.role === 'pharmacist' && (
                          <button className="button-ghost button-small" onClick={() => { setSelectedVisit(visit); setModalType('override'); }}>Override</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredQueue.length === 0 && <div className="empty-state">No active emergency visits</div>}
          </div>
        </section>
      </section>

      {selectedVisit && modalType === 'triage' && (
        <TriageModal 
          visit={selectedVisit} 
          onClose={() => { setSelectedVisit(null); setModalType(null); }} 
          onSuccess={() => { setSelectedVisit(null); setModalType(null); dispatch(fetchEmergencyQueue()); }} 
        />
      )}

      {selectedVisit && modalType === 'override' && (
        <OverrideDispenseModal 
          visit={selectedVisit} 
          onClose={() => { setSelectedVisit(null); setModalType(null); }} 
          onSuccess={() => { setSelectedVisit(null); setModalType(null); dispatch(fetchEmergencyQueue()); }} 
        />
      )}

      <style>{`
        .monospace { font-family: monospace; font-size: 0.9rem; }
        .small { font-size: 0.75rem; }
      `}</style>
    </MainLayout>
  );
}
