import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { recordVitals, clearVitalsError } from '../../store/slices/vitalsSlice';
import { VITALS_THRESHOLDS } from '../../constants/vitalsThresholds';
import useToast from '../../hooks/useToast';
import AppIcon from '../AppIcon';

export default function VitalsEntryForm({ admissionId, patientRef, patientName, onSuccess }) {
  const dispatch = useDispatch();
  const { notifySuccess, notifyError } = useToast();
  const { recordStatus, error } = useSelector(state => state.vitals);
  const lastSubmitTime = useRef(0);

  const [form, setForm] = useState({
    hr: '',
    spo2: '',
    temp: '',
    rr: '',
    gcs: '',
    sys: '',
    dia: '',
    notes: ''
  });

  const [warning, setWarning] = useState(null);

  const getFieldStatus = (field, value) => {
    if (!value) return 'empty';
    const val = parseFloat(value);
    const t = VITALS_THRESHOLDS[field];
    if (!t) return 'normal';

    if (field === 'gcs') {
      if (val <= t.critAt) return 'critical';
      if (val <= t.warnAt) return 'warning';
      return 'normal';
    }

    if (t.critLow && val <= t.critLow) return 'critical';
    if (t.critHigh && val >= t.critHigh) return 'critical';
    if (t.warnLow && val <= t.warnLow) return 'warning';
    if (t.warnHigh && val >= t.warnHigh) return 'warning';

    return 'normal';
  };

  const StatusDot = ({ status }) => {
    const colors = {
      critical: '#ef4444',
      warning: '#f59e0b',
      normal: '#10b981',
      empty: '#6b7280'
    };
    return <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors[status], display: 'inline-block', marginRight: 6 }} />;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setWarning(null);

    // 5-min guard
    const now = Date.now();
    if (now - lastSubmitTime.current < 5 * 60 * 1000) {
      notifyError('Rate limit', 'Please wait at least 5 minutes between recordings.');
      return;
    }

    // BP Validation
    if ((form.sys || form.dia) && (!form.sys || !form.dia)) {
      return notifyError('Validation', 'Both Systolic and Diastolic BP are required.');
    }
    if (form.sys && parseFloat(form.sys) <= parseFloat(form.dia)) {
      return notifyError('Validation', 'Systolic BP must be greater than Diastolic.');
    }

    const payload = {
      admissionRef: admissionId,
      patientRef,
      vitals: {},
      notes: form.notes
    };

    if (form.hr) payload.vitals.hr = parseInt(form.hr);
    if (form.spo2) payload.vitals.spo2 = parseInt(form.spo2);
    if (form.temp) payload.vitals.temp = parseFloat(form.temp);
    if (form.rr) payload.vitals.rr = parseInt(form.rr);
    if (form.gcs) payload.vitals.gcs = parseInt(form.gcs);
    if (form.sys) {
      payload.vitals.bp = {
        systolic: parseInt(form.sys),
        diastolic: parseInt(form.dia)
      };
    }

    try {
      const result = await dispatch(recordVitals(payload)).unwrap();
      lastSubmitTime.current = Date.now();
      notifySuccess('Vitals recorded');
      if (result.warning) setWarning(result.warning);
      if (onSuccess) onSuccess();
      setForm({ hr: '', spo2: '', temp: '', rr: '', gcs: '', sys: '', dia: '', notes: '' });
    } catch (err) {
      notifyError('Failed to record vitals', err);
    }
  };

  const isFormEmpty = !form.hr && !form.spo2 && !form.temp && !form.rr && !form.gcs && !form.sys;

  return (
    <div className="vitals-entry-form">
      {warning && (
        <div className="notice-banner warning mb-4">
          <AppIcon name="alert" size={16} />
          <span>{warning}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field-grid two">
          <div>
            <label className="field-label">
              <StatusDot status={getFieldStatus('hr', form.hr)} />
              Heart Rate (bpm)
            </label>
            <input type="number" value={form.hr} onChange={e => setForm({...form, hr: e.target.value})} placeholder="72" />
          </div>
          <div>
            <label className="field-label">
              <StatusDot status={getFieldStatus('spo2', form.spo2)} />
              SpO2 (%)
            </label>
            <input type="number" value={form.spo2} onChange={e => setForm({...form, spo2: e.target.value})} placeholder="98" />
          </div>
        </div>

        <div className="field-grid two mt-4">
          <div>
            <label className="field-label">
              <StatusDot status={getFieldStatus('sbp', form.sys)} />
              BP Systolic
            </label>
            <input type="number" value={form.sys} onChange={e => setForm({...form, sys: e.target.value})} placeholder="120" />
          </div>
          <div>
            <label className="field-label">
              <StatusDot status={getFieldStatus('dia', form.dia)} />
              BP Diastolic
            </label>
            <input type="number" value={form.dia} onChange={e => setForm({...form, dia: e.target.value})} placeholder="80" />
          </div>
        </div>

        <div className="field-grid two mt-4">
          <div>
            <label className="field-label">
              <StatusDot status={getFieldStatus('temp', form.temp)} />
              Temp (°C)
            </label>
            <input type="number" step="0.1" value={form.temp} onChange={e => setForm({...form, temp: e.target.value})} placeholder="36.6" />
          </div>
          <div>
            <label className="field-label">
              <StatusDot status={getFieldStatus('rr', form.rr)} />
              Resp Rate
            </label>
            <input type="number" value={form.rr} onChange={e => setForm({...form, rr: e.target.value})} placeholder="16" />
          </div>
        </div>

        <div className="mt-4">
          <label className="field-label">
            <StatusDot status={getFieldStatus('gcs', form.gcs)} />
            GCS Score (3-15)
          </label>
          <input type="number" value={form.gcs} onChange={e => setForm({...form, gcs: e.target.value})} placeholder="15" />
        </div>

        <div className="mt-4">
          <label className="field-label">Clinical Notes</label>
          <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows="2" placeholder="Observe for changes..." />
        </div>

        <button 
          type="submit" 
          className="button-primary w-full mt-6" 
          disabled={isFormEmpty || recordStatus === 'loading'}
        >
          {recordStatus === 'loading' ? 'Recording...' : 'Save Vitals'}
        </button>
      </form>
    </div>
  );
}
