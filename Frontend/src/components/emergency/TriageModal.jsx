import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { assignTriage } from '../../store/slices/emergencySlice';
import AppIcon from '../AppIcon';
import useToast from '../../hooks/useToast';
import { apiClient } from '../../api/pimsApi';

export default function TriageModal({ visit, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { notifySuccess, notifyError } = useToast();

  const [formData, setFormData] = useState({
    triageScore: visit.triageScore || 3,
    triageCategory: visit.triageCategory || 'urgent',
    assignedDoctor: visit.assignedDoctor?._id || '',
    vitalsOnArrival: visit.vitalsOnArrival || { bp: { systolic: '', diastolic: '' }, hr: '', spo2: '', temp: '', gcs: 15 }
  });

  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    // Auto-suggest category based on score
    const mapping = {
      1: 'resuscitation',
      2: 'emergent',
      3: 'urgent',
      4: 'less_urgent',
      5: 'non_urgent'
    };
    setFormData(prev => ({ ...prev, triageCategory: mapping[formData.triageScore] }));
  }, [formData.triageScore]);

  useEffect(() => {
    // Load doctors
    apiClient.get('/users?role=doctor').then(res => setDoctors(res.data.data || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(assignTriage({ id: visit._id, data: formData })).unwrap();
      notifySuccess('Triage Updated');
      onSuccess();
    } catch (err) {
      notifyError('Failed to update triage', err);
    }
  };

  const triageColors = ['', '#ef4444', '#f97316', '#eab308', '#3b82f6', '#94a3b8'];

  return (
    <div className="user-modal-backdrop" onClick={onClose}>
      <div className="user-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Assess Patient: {visit.walkInData?.name || visit.patientRef?.firstName}</h3>
          <button className="button-ghost" onClick={onClose}><AppIcon name="x" /></button>
        </div>

        {formData.triageScore === 1 && (
          <div className="notice-banner danger mb-4">
            <AppIcon name="alert" size={16} />
            <strong>CODE BLUE — immediate alerts will fire</strong>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="field-label">Triage Score (ESI)</label>
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

          <div className="field-grid two mb-4">
            <div>
              <label className="field-label">Category</label>
              <input type="text" value={formData.triageCategory.toUpperCase()} readOnly style={{ background: 'var(--surface-muted)' }} />
            </div>
            <div>
              <label className="field-label">Assigned Doctor</label>
              <select value={formData.assignedDoctor} onChange={e => setFormData({...formData, assignedDoctor: e.target.value})}>
                <option value="">Select Doctor...</option>
                {doctors.map(dr => (
                  <option key={dr._id} value={dr._id}>Dr. {dr.firstName} {dr.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="panel mb-4" style={{ background: 'var(--surface-muted)' }}>
            <h4 style={{ marginTop: 0, fontSize: '0.9rem' }}>Vitals Update</h4>
            <div className="field-grid two mt-2">
              <div>
                <label className="field-label">BP (Sys/Dia)</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="number" value={formData.vitalsOnArrival.bp.systolic} onChange={e => setFormData({...formData, vitalsOnArrival: {...formData.vitalsOnArrival, bp: {...formData.vitalsOnArrival.bp, systolic: e.target.value}}})} />
                  <input type="number" value={formData.vitalsOnArrival.bp.diastolic} onChange={e => setFormData({...formData, vitalsOnArrival: {...formData.vitalsOnArrival, bp: {...formData.vitalsOnArrival.bp, diastolic: e.target.value}}})} />
                </div>
              </div>
              <div>
                <label className="field-label">HR / SpO2</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="number" placeholder="HR" value={formData.vitalsOnArrival.hr} onChange={e => setFormData({...formData, vitalsOnArrival: {...formData.vitalsOnArrival, hr: e.target.value}})} />
                  <input type="number" placeholder="SpO2" value={formData.vitalsOnArrival.spo2} onChange={e => setFormData({...formData, vitalsOnArrival: {...formData.vitalsOnArrival, spo2: e.target.value}})} />
                </div>
              </div>
            </div>
          </div>

          <div className="toolbar-group mt-6">
            <button type="submit" className="button-primary w-full">Commit Assessment</button>
          </div>
        </form>
      </div>
      <style>{`
        .w-full { width: 100%; }
        .mb-4 { margin-bottom: 1rem; }
      `}</style>
    </div>
  );
}
