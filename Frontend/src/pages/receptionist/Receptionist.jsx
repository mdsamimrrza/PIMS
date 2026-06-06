import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MainLayout from '../../layouts/MainLayout';
import AppIcon from '../../components/AppIcon';
import useToast from '../../hooks/useToast';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import * as api from '../../api/pimsApi';
import { fetchAvailableBeds } from '../../store/slices/bedSlice';
import { createAdmission, fetchActiveAdmissions, dischargePatient } from '../../store/slices/admissionSlice';

export default function Receptionist() {
  const dispatch = useDispatch();
  const { notifySuccess, notifyError } = useToast();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    ward: '',
    bedRef: '',
    assignedDoctor: '',
    priority: 'routine',
    diagnosis: '',
    notes: ''
  });
  const [doctors, setDoctors] = useState([]);
  
  // Active admissions
  const { admissions, status: admStatus, pagination } = useSelector(state => state.admissions);
  const { available: availableBeds } = useSelector(state => state.beds);

  useEffect(() => {
    dispatch(fetchActiveAdmissions());
    loadDoctors();
  }, [dispatch]);

  useEffect(() => {
    if (debouncedSearch) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

  const loadDoctors = async () => {
    try {
      const data = await api.listUsers({ role: 'doctor' });
      setDoctors(data.users || data);
    } catch (err) {
      console.error('Failed to load doctors', err);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const data = await api.listPatients({ q: debouncedSearch });
      setSearchResults(data.patients || data);
    } catch (err) {
      notifyError('Search failed', api.getApiMessage(err));
    } finally {
      setIsSearching(false);
    }
  };

  const handleWardChange = (e) => {
    const ward = e.target.value;
    setFormData(prev => ({ ...prev, ward, bedRef: '' }));
    if (ward) {
      dispatch(fetchAvailableBeds(ward));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return notifyError('Please select a patient first');
    
    try {
      await dispatch(createAdmission({
        ...formData,
        patientRef: selectedPatient._id
      })).unwrap();
      
      notifySuccess('Admission created successfully');
      setFormData({ ward: '', bedRef: '', assignedDoctor: '', priority: 'routine', diagnosis: '', notes: '' });
      setSelectedPatient(null);
      setSearchTerm('');
      dispatch(fetchActiveAdmissions());
    } catch (err) {
      notifyError('Admission failed', err);
    }
  };

  const handleDischarge = async (id) => {
    if (!window.confirm('Are you sure you want to discharge this patient?')) return;
    try {
      await dispatch(dischargePatient({ id })).unwrap();
      notifySuccess('Patient discharged');
      dispatch(fetchActiveAdmissions());
    } catch (err) {
      notifyError('Discharge failed', err);
    }
  };

  return (
    <MainLayout>
      <div className="page receptionist-page">
        <div className="toolbar">
          <h1>Patient Admissions</h1>
        </div>

        <div className="field-grid two mt-6">
          {/* LEFT: Patient Search */}
          <section className="panel">
            <h3>1. Select Patient</h3>
            <div className="search-box mt-4">
              <input
                type="text"
                placeholder="Search by Name or UHID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              {isSearching && <div className="loader-inline">Searching...</div>}
            </div>

            <div className="results-list mt-4">
              {searchResults.map(p => (
                <div 
                  key={p._id} 
                  className={`result-card ${selectedPatient?._id === p._id ? 'selected' : ''}`}
                  onClick={() => setSelectedPatient(p)}
                >
                  <p className="name">{p.firstName} {p.lastName}</p>
                  <p className="uhid">{p.uhid || p.patientId}</p>
                </div>
              ))}
              {searchTerm && searchResults.length === 0 && !isSearching && (
                <p className="muted">No patients found</p>
              )}
            </div>

            {selectedPatient && (
              <div className="selected-patient-card mt-6">
                <h4>Patient Details</h4>
                <p><strong>Name:</strong> {selectedPatient.firstName} {selectedPatient.lastName}</p>
                <p><strong>UHID:</strong> {selectedPatient.uhid}</p>
                <div className="chips mt-2">
                  <span className="chip">{selectedPatient.bloodGroup}</span>
                  {selectedPatient.allergies && (
                    <span className="chip danger">Allergy: {selectedPatient.allergies}</span>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* RIGHT: Admission Form */}
          <section className="panel">
            <h3>2. Admission Details</h3>
            {!selectedPatient ? (
              <div className="empty-notice mt-8">
                <AppIcon name="user" size={48} />
                <p>Please select a patient from the left to begin admission.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4">
                <div className="field-grid two">
                  <div>
                    <label className="field-label">Ward</label>
                    <select value={formData.ward} onChange={handleWardChange} required>
                      <option value="">Select Ward</option>
                      <option value="ICU">ICU</option>
                      <option value="ER">ER</option>
                      <option value="General">General</option>
                      <option value="HDU">HDU</option>
                      <option value="Isolation">Isolation</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Available Bed</label>
                    <select 
                      value={formData.bedRef} 
                      onChange={(e) => setFormData(prev => ({ ...prev, bedRef: e.target.value }))}
                      required
                      disabled={!formData.ward}
                    >
                      <option value="">Select Bed</option>
                      {availableBeds.map(b => (
                        <option key={b._id} value={b._id}>{b.bedCode} ({b.type})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="field-label">Assigned Doctor</label>
                  <select 
                    value={formData.assignedDoctor} 
                    onChange={(e) => setFormData(prev => ({ ...prev, assignedDoctor: e.target.value }))}
                    required
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(d => (
                      <option key={d._id} value={d._id}>Dr. {d.firstName} {d.lastName}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-4">
                  <label className="field-label">Priority</label>
                  <div className="radio-group">
                    <label><input type="radio" name="priority" value="routine" checked={formData.priority === 'routine'} onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))} /> Routine</label>
                    <label><input type="radio" name="priority" value="urgent" checked={formData.priority === 'urgent'} onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))} /> Urgent</label>
                    <label><input type="radio" name="priority" value="emergency" checked={formData.priority === 'emergency'} onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))} /> Emergency</label>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="field-label">Diagnosis</label>
                  <textarea rows="2" value={formData.diagnosis} onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))} />
                </div>

                <button type="submit" className="button-primary w-full mt-6" disabled={admStatus === 'loading'}>
                  {admStatus === 'loading' ? 'Processing...' : 'Complete Admission'}
                </button>
              </form>
            )}
          </section>
        </div>

        {/* Active Admissions Table */}
        <section className="panel mt-8">
          <h3>Active Admissions</h3>
          <div className="data-table mt-4">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Bed / Ward</th>
                  <th>Priority</th>
                  <th>Doctor</th>
                  <th>Admitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {admissions.map(adm => (
                  <tr key={adm._id}>
                    <td>
                      <strong>{adm.patientRef?.firstName} {adm.patientRef?.lastName}</strong>
                      <div className="text-xs muted">{adm.patientRef?.uhid}</div>
                    </td>
                    <td>
                      <div className="monospace">{adm.bedRef?.bedCode}</div>
                      <div className="text-xs muted">{adm.bedRef?.ward}</div>
                    </td>
                    <td>
                      <span className={`status-pill priority-${adm.priority}`}>
                        {adm.priority}
                      </span>
                    </td>
                    <td>Dr. {adm.assignedDoctor?.firstName} {adm.assignedDoctor?.lastName}</td>
                    <td>{new Date(adm.admittedAt).toLocaleDateString()}</td>
                    <td>
                      <button className="button-ghost danger" onClick={() => handleDischarge(adm._id)}>
                        Discharge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <style>{`
          .result-card { padding: 0.75rem; border-bottom: 1px solid var(--line); cursor: pointer; transition: background 0.2s; }
          .result-card:hover { background: var(--surface-muted); }
          .result-card.selected { border-left: 4px solid var(--accent); background: var(--surface-muted); }
          .result-card .name { font-weight: 600; margin: 0; }
          .result-card .uhid { font-size: 0.75rem; color: var(--text-muted); margin: 0; }
          
          .selected-patient-card { background: var(--surface-muted); padding: 1rem; border-radius: 8px; border: 1px solid var(--accent); }
          .chips { display: flex; gap: 0.5rem; }
          .chip { background: var(--surface); padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; border: 1px solid var(--line); }
          .chip.danger { border-color: var(--danger); color: var(--danger); }
          
          .radio-group { display: flex; gap: 1.5rem; margin-top: 0.5rem; }
          .radio-group label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
          
          .priority-emergency { background: var(--danger); color: white; }
          .priority-urgent { background: #f59e0b; color: white; }
          .priority-routine { background: var(--surface-muted); color: var(--text-muted); }
          
          .empty-notice { text-align: center; color: var(--text-muted); padding: 4rem 2rem; }
        `}</style>
      </div>
    </MainLayout>
  );
}
