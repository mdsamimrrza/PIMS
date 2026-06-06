import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../components/AppIcon';
import StatCard from '../../components/StatCard';
import { createAdmission, getActiveAdmissions, listAppointments, listPatients, getApiMessage } from '../../api/pimsApi';
import AdmissionModal from '../../components/AdmissionModal';

export default function ReceptionistDashboard() {
  const [patients, setPatients] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageState, setPageState] = useState({ isLoading: true, errorMessage: '' });
  const [selectedPatientForAdmission, setSelectedPatientForAdmission] = useState(null);

  const loadData = async () => {
    try {
      const [patientData, admissionData, appointmentData] = await Promise.all([
        listPatients({ limit: 10 }),
        getActiveAdmissions({ limit: 10 }),
        listAppointments({ limit: 10 })
      ]);
      setPatients(patientData?.patients || []);
      setAdmissions(admissionData || []);
      setAppointments(appointmentData || []);
      setPageState({ isLoading: false, errorMessage: '' });
    } catch (error) {
      setPageState({ isLoading: false, errorMessage: getApiMessage(error) });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <section className="page">
      <div className="stats-grid">
        <StatCard icon="users" title="Total Patients" value={String(patients.length)} />
        <StatCard icon="alert" title="Emergency Active" value={String(admissions.filter(a => a.priority === 'emergency').length)} />
        <StatCard icon="calendar" title="Today's Appts" value={String(appointments.length)} />
      </div>

      <div className="content-grid-2">
        <section className="panel">
          <div className="panel-head">
            <div className="section-title">
              <AppIcon name="users" size={20} />
              <h3>Recent Patients</h3>
            </div>
            <Link className="button-secondary" to="/patients/new">Register New</Link>
          </div>
          <div className="mini-list">
            {patients.map(p => (
              <div key={p._id} className="mini-list-item">
                <div>
                  <strong>{p.name}</strong>
                  <div className="helper-text">{p.patientId} · {p.gender}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setSelectedPatientForAdmission(p)} className="button-primary button-small">ADMIT</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {selectedPatientForAdmission && (
          <AdmissionModal 
            patient={selectedPatientForAdmission} 
            onClose={() => setSelectedPatientForAdmission(null)}
            onSuccess={() => {
              setSelectedPatientForAdmission(null);
              loadData();
            }}
          />
        )}

        <section className="panel">
          <div className="panel-head">
            <div className="section-title">
              <AppIcon name="clock" size={20} />
              <h3>Upcoming Appointments</h3>
            </div>
          </div>
          <div className="mini-list">
            {appointments.map(a => (
              <div key={a._id} className="mini-list-item">
                <div>
                  <strong>{a.patientId?.name}</strong>
                  <div className="helper-text">{new Date(a.appointmentDate).toLocaleDateString()} at {a.timeSlot}</div>
                </div>
                <span className="status-pill status-success">{a.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
