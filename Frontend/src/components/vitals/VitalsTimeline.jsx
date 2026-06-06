import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVitalsTimeline } from '../../store/slices/vitalsSlice';
import AppIcon from '../AppIcon';
import { VITALS_THRESHOLDS } from '../../constants/vitalsThresholds';

export default function VitalsTimeline({ admissionId }) {
  const dispatch = useDispatch();
  const { timelines, pagination, status } = useSelector(state => state.vitals);
  const data = timelines[admissionId] || [];
  const { hasMore, nextCursor } = pagination[admissionId] || {};

  useEffect(() => {
    if (data.length === 0) {
      dispatch(fetchVitalsTimeline({ admissionId, limit: 10 }));
    }
  }, [dispatch, admissionId, data.length]);

  const handleLoadMore = () => {
    dispatch(fetchVitalsTimeline({ admissionId, limit: 10, before: nextCursor }));
  };

  const getColor = (field, value) => {
    if (!value) return 'inherit';
    const val = parseFloat(value);
    const t = VITALS_THRESHOLDS[field];
    if (!t) return 'inherit';

    if (field === 'gcs') {
      if (val <= t.critAt) return 'var(--danger)';
      if (val <= t.warnAt) return 'var(--accent-gold)';
      return 'inherit';
    }

    if (t.critLow && val <= t.critLow) return 'var(--danger)';
    if (t.critHigh && val >= t.critHigh) return 'var(--danger)';
    if (t.warnLow && val <= t.warnLow) return 'var(--accent-gold)';
    if (t.warnHigh && val >= t.warnHigh) return 'var(--accent-gold)';

    return 'inherit';
  };

  if (status === 'loading' && data.length === 0) {
    return (
      <div className="vitals-timeline-skeleton">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton-row mb-4" style={{ height: 100, background: 'var(--surface-muted)', borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="empty-notice">
        <p>No vitals recorded for this admission.</p>
      </div>
    );
  }

  return (
    <div className="vitals-timeline">
      <div className="timeline-list">
        {data.map((entry) => (
          <div key={entry._id} className={`vitals-card panel mb-4 ${entry.isVoided ? 'is-voided' : ''}`}>
            <div className="card-header">
              <div className="recorder-info">
                <strong>{entry.recordedBy?.firstName} {entry.recordedBy?.lastName}</strong>
                <span className="pill ml-2">{entry.recordedBy?.role}</span>
              </div>
              <div className="timestamp" title={new Date(entry.recordedAt).toLocaleString()}>
                {new Date(entry.recordedAt).toLocaleTimeString()}
              </div>
            </div>

            <div className="vitals-grid-mini mt-3">
              <div className="vital-item">
                <label>BP</label>
                <span style={{ color: entry.vitals.bp ? getColor('sbp', entry.vitals.bp.systolic) : 'inherit' }}>
                  {entry.vitals.bp ? `${entry.vitals.bp.systolic}/${entry.vitals.bp.diastolic}` : '--'}
                </span>
              </div>
              <div className="vital-item">
                <label>HR</label>
                <span style={{ color: getColor('hr', entry.vitals.hr) }}>{entry.vitals.hr || '--'}</span>
              </div>
              <div className="vital-item">
                <label>SpO2</label>
                <span style={{ color: getColor('spo2', entry.vitals.spo2) }}>{entry.vitals.spo2 ? `${entry.vitals.spo2}%` : '--'}</span>
              </div>
              <div className="vital-item">
                <label>Temp</label>
                <span style={{ color: getColor('temp', entry.vitals.temp) }}>{entry.vitals.temp ? `${entry.vitals.temp}°C` : '--'}</span>
              </div>
              <div className="vital-item">
                <label>RR</label>
                <span style={{ color: getColor('rr', entry.vitals.rr) }}>{entry.vitals.rr || '--'}</span>
              </div>
              <div className="vital-item">
                <label>GCS</label>
                <span style={{ color: getColor('gcs', entry.vitals.gcs) }}>{entry.vitals.gcs || '--'}</span>
              </div>
            </div>

            {entry.alerts?.length > 0 && !entry.isVoided && (
              <div className="alert-badges mt-2">
                {entry.alerts.map((a, i) => (
                  <span key={i} className={`alert-pill ${a.severity}`}>
                    {a.field.toUpperCase()}: {a.severity}
                  </span>
                ))}
              </div>
            )}

            {entry.notes && (
              <div className="notes mt-2 italic muted text-sm">
                "{entry.notes}"
              </div>
            )}

            {entry.isVoided && (
              <div className="void-badge">
                <AppIcon name="alert" size={14} />
                <span>Voided: {entry.voidReason}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button className="button-ghost w-full mt-2" onClick={handleLoadMore} disabled={status === 'loading'}>
          {status === 'loading' ? 'Loading...' : 'Load Older Records'}
        </button>
      )}

      <style>{`
        .vitals-card { position: relative; border-left: 4px solid var(--accent); padding: 1rem; }
        .vitals-card.is-voided { border-left-color: var(--text-muted); opacity: 0.6; }
        .vitals-card.is-voided .vitals-grid-mini { text-decoration: line-through; }
        
        .card-header { display: flex; justify-content: space-between; font-size: 0.85rem; }
        .vitals-grid-mini { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; text-align: center; }
        .vital-item label { display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
        .vital-item span { font-weight: 700; font-size: 0.95rem; }
        
        .alert-pill { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; margin-right: 4px; font-weight: 700; }
        .alert-pill.critical { background: var(--danger); color: white; }
        .alert-pill.warning { background: var(--accent-gold); color: white; }
        
        .void-badge { margin-top: 8px; font-size: 0.75rem; color: var(--danger); display: flex; align-items: center; gap: 4px; font-weight: 600; }
        
        .recorder-info { display: flex; align-items: center; }
        .recorder-info .pill { font-size: 0.7rem; padding: 1px 6px; background: var(--surface-muted); border-radius: 12px; }
      `}</style>
    </div>
  );
}
