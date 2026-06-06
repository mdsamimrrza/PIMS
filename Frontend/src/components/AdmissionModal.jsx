import { useState, useEffect } from 'react';
import AppIcon from '../components/AppIcon';
import { getAvailableBeds, listUsers, createAdmission, getApiMessage } from '../api/pimsApi';
import useToast from '../hooks/useToast';

export default function AdmissionModal({ patient, onClose, onSuccess }) {
  const { notifyError, notifySuccess } = useToast();
  const [beds, setBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    doctorId: '',
    bedId: '',
    reasonForAdmission: '',
    priority: 'routine'
  });

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [bedData, userData] = await Promise.all([
          getAvailableBeds(),
          listUsers({ role: 'doctor' })
        ]);
        setBeds(bedData || []);
        setDoctors(userData?.users || []);
      } catch (err) {
        notifyError('Failed to load options', getApiMessage(err));
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doctorId || !formData.bedId) {
      return notifyError('Missing fields', 'Please select a doctor and a bed.');
    }

    setIsSubmitting(true);
    try {
      await createAdmission({
        ...formData,
        patientId: patient._id
      });
      notifySuccess('Patient Admitted', `${patient.name} has been assigned to a bed.`);
      onSuccess();
    } catch (err) {
      notifyError('Admission failed', getApiMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="page-title">
          <div className="section-title">
            <AppIcon name="plusCircle" size={20} />
            <h3>Admit Patient: {patient.name}</h3>
          </div>
          <p className="helper-text">Assign a bed and clinician for inpatient care.</p>
        </div>

        {isLoading ? (
          <div className="empty-state">Loading options...</div>
        ) : (
          <form onSubmit={handleSubmit} className="admission-form">
            <div className="field-group">
              <label className="caption">Reason for Admission</label>
              <textarea 
                className="input-field"
                onChange={(e) => setFormData({...formData, reasonForAdmission: e.target.value})}
                placeholder="e.g., Post-operative care, Observation"
                required
                value={formData.reasonForAdmission}
              />
            </div>

            <div className="field-row">
              <div className="field-group" style={{ flex: 1 }}>
                <label className="caption">Priority</label>
                <select 
                  className="input-field"
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  value={formData.priority}
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div className="field-group" style={{ flex: 1 }}>
                <label className="caption">Assign Doctor</label>
                <select 
                  className="input-field"
                  onChange={(e) => setFormData({...formData, doctorId: e.target.value})}
                  required
                  value={formData.doctorId}
                >
                  <option value="">Select Doctor</option>
                  {doctors.map(d => (
                    <option key={d._id} value={d._id}>Dr. {d.firstName} {d.lastName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-group">
              <label className="caption">Select Bed</label>
              <select 
                className="input-field"
                onChange={(e) => setFormData({...formData, bedId: e.target.value})}
                required
                value={formData.bedId}
              >
                <option value="">Select an available bed</option>
                {beds.map(b => (
                  <option key={b._id} value={b._id}>
                    {b.ward} - Room {b.room} ({b.bedCode})
                  </option>
                ))}
              </select>
              {!beds.length && <p className="helper-text" style={{ color: 'var(--accent-critical)' }}>No beds available!</p>}
            </div>

            <div className="toolbar-group" style={{ marginTop: '1.5rem' }}>
              <button className="button-primary" disabled={isSubmitting || !beds.length} type="submit">
                {isSubmitting ? 'Processing...' : 'Confirm Admission'}
              </button>
              <button className="button-ghost" onClick={onClose} type="button">Cancel</button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .admission-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .input-field {
          padding: 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: var(--input-bg);
          color: var(--text-main);
        }
        .field-row {
          display: flex;
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}
