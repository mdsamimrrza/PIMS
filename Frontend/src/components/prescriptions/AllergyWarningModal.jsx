import { useState } from 'react';
import AppIcon from '../AppIcon';

export default function AllergyWarningModal({ warnings, onCancel, onOverride }) {
  const [reason, setReason] = useState('');

  return (
    <div className="user-modal-backdrop">
      <div className="user-modal" style={{ maxWidth: '500px' }}>
        <div className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{ color: 'var(--danger)' }}><AppIcon name="alert" size={24} /></div>
          <h3 style={{ margin: 0 }}>Allergy Conflict Detected</h3>
        </div>

        <div className="notice-banner danger mb-4">
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>

        <p className="muted" style={{ fontSize: '0.9rem' }}>
          Continuing with this prescription requires clinical justification. Please provide a reason for overriding this allergy warning.
        </p>

        <div className="mt-4">
          <label className="field-label">Override Justification (Required)</label>
          <textarea 
            rows="3" 
            placeholder="e.g., Patient has tolerated this medication before without adverse reaction..." 
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
          />
        </div>

        <div className="toolbar-group mt-6" style={{ display: 'flex', gap: '8px' }}>
          <button className="button-secondary flex-1" onClick={onCancel}>Cancel & Edit</button>
          <button 
            className="button-primary flex-1" 
            disabled={reason.length < 10}
            onClick={() => onOverride(reason)}
          >
            Override & Submit
          </button>
        </div>
      </div>
      <style>{`
        .flex-1 { flex: 1; }
        .mb-4 { margin-bottom: 1rem; }
      `}</style>
    </div>
  );
}
