import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { checkInEmergency } from '../../store/slices/emergencySlice';
import MainLayout from '../../layouts/MainLayout';
import AppIcon from '../../components/AppIcon';
import useToast from '../../hooks/useToast';

export default function EmergencyCheckIn() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useToast();
  const { checkInStatus } = useSelector(state => state.emergency);

  const [activeTab, setActiveTab] = useState('registered');
  const [formData, setFormData] = useState({
    patientRef: '',
    walkInData: { name: '', age: '', phone: '', gender: 'Male' },
    chiefComplaint: '',
    arrivalMode: 'walk_in',
    triageScore: 3,
    vitalsOnArrival: { bp: { systolic: '', diastolic: '' }, hr: '', spo2: '', temp: '', gcs: 15 }
  });

  const [showVitals, setShowVitals] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.chiefComplaint.length < 3) return notifyError('Complaint too short');
    if (activeTab === 'walkin' && (!formData.walkInData.name || !formData.walkInData.age)) {
      return notifyError('Name and age are required for walk-ins');
    }

    const payload = { ...formData };
    if (activeTab === 'registered') {
      delete payload.walkInData;
    } else {
      delete payload.patientRef;
    }

    try {
      await dispatch(checkInEmergency(payload)).unwrap();
      notifySuccess('Emergency Check-in Successful');
      setTimeout(() => navigate('/emergency/queue'), 2000);
    } catch (err) {
      notifyError('Check-in failed', err);
    }
  };

  const triageColors = ['', '#ef4444', '#f97316', '#eab308', '#3b82f6', '#94a3b8'];

  return (
    <MainLayout>
      <section className="page" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="toolbar">
          <h1>A&E Check-in</h1>
        </div>

        <div className="panel mt-6">
          <div className="tabs-container mb-6" style={{ display: 'flex', gap: '8px' }}>
            <button className={`button-${activeTab === 'registered' ? 'primary' : 'secondary'} flex-1`} onClick={() => setActiveTab('registered')}>Registered Patient</button>
            <button className={`button-${activeTab === 'walkin' ? 'primary' : 'secondary'} flex-1`} onClick={() => setActiveTab('walkin')}>Unregistered / Walk-in</button>
          </div>

          <form onSubmit={handleSubmit}>
            {activeTab === 'registered' ? (
              <div className="mb-4">
                <label className="field-label">Search Patient (ID / Name)</label>
                <input 
                  type="text" 
                  placeholder="Enter UHID or Name..." 
                  onChange={(e) => setFormData({...formData, patientRef: e.target.value})} // In real app, this would be a search/select
                  required
                />
              </div>
            ) : (
              <div className="field-grid two mb-4">
                <div>
                  <label className="field-label">Full Name</label>
                  <input type="text" value={formData.walkInData.name} onChange={e => setFormData({...formData, walkInData: {...formData.walkInData, name: e.target.value}})} required />
                </div>
                <div>
                  <label className="field-label">Age</label>
                  <input type="number" value={formData.walkInData.age} onChange={e => setFormData({...formData, walkInData: {...formData.walkInData, age: e.target.value}})} required />
                </div>
              </div>
            )}

            <div className="field-grid two mb-4">
              <div>
                <label className="field-label">Arrival Mode</label>
                <select value={formData.arrivalMode} onChange={e => setFormData({...formData, arrivalMode: e.target.value})}>
                  <option value="walk_in">Walk-in</option>
                  <option value="ambulance">Ambulance</option>
                  <option value="transferred">Transferred</option>
                  <option value="referred">Referred</option>
                </select>
              </div>
              <div>
                <label className="field-label">Triage Priority (ESI)</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {[1, 2, 3, 4, 5].map(score => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setFormData({...formData, triageScore: score})}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: formData.triageScore === score ? triageColors[score] : 'var(--surface-muted)',
                        color: formData.triageScore === score ? 'white' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="field-label">Chief Complaint</label>
              <textarea 
                rows="3" 
                value={formData.chiefComplaint} 
                onChange={e => setFormData({...formData, chiefComplaint: e.target.value})} 
                required 
                placeholder="Briefly describe why the patient is here..."
              />
            </div>

            <div className="panel mb-4" style={{ background: 'var(--surface-muted)' }}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setShowVitals(!showVitals)}
              >
                <h4 style={{ margin: 0 }}>Vitals on Arrival (Optional)</h4>
                <AppIcon name={showVitals ? 'chevronUp' : 'chevronDown'} />
              </div>
              
              {showVitals && (
                <div className="field-grid two mt-4">
                  <div>
                    <label className="field-label">BP (Sys/Dia)</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input type="number" placeholder="120" value={formData.vitalsOnArrival.bp.systolic} onChange={e => setFormData({...formData, vitalsOnArrival: {...formData.vitalsOnArrival, bp: {...formData.vitalsOnArrival.bp, systolic: e.target.value}}})} />
                      <input type="number" placeholder="80" value={formData.vitalsOnArrival.bp.diastolic} onChange={e => setFormData({...formData, vitalsOnArrival: {...formData.vitalsOnArrival, bp: {...formData.vitalsOnArrival.bp, diastolic: e.target.value}}})} />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Heart Rate</label>
                    <input type="number" placeholder="bpm" value={formData.vitalsOnArrival.hr} onChange={e => setFormData({...formData, vitalsOnArrival: {...formData.vitalsOnArrival, hr: e.target.value}})} />
                  </div>
                  <div>
                    <label className="field-label">SpO2 (%)</label>
                    <input type="number" placeholder="98" value={formData.vitalsOnArrival.spo2} onChange={e => setFormData({...formData, vitalsOnArrival: {...formData.vitalsOnArrival, spo2: e.target.value}})} />
                  </div>
                  <div>
                    <label className="field-label">GCS Score (3-15)</label>
                    <input type="number" min="3" max="15" value={formData.vitalsOnArrival.gcs} onChange={e => setFormData({...formData, vitalsOnArrival: {...formData.vitalsOnArrival, gcs: e.target.value}})} />
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="button-primary w-full mt-6" disabled={checkInStatus === 'loading'}>
              {checkInStatus === 'loading' ? 'Processing...' : 'Complete Emergency Check-in'}
            </button>
          </form>
        </div>
      </section>
      <style>{`
        .w-full { width: 100%; }
        .flex-1 { flex: 1; }
        .mb-6 { margin-bottom: 1.5rem; }
      `}</style>
    </MainLayout>
  );
}
