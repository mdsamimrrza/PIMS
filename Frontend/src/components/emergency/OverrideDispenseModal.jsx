import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { dispenseOverride } from '../../store/slices/emergencySlice';
import AppIcon from '../AppIcon';
import useToast from '../../hooks/useToast';
import { apiClient } from '../../api/pimsApi';

export default function OverrideDispenseModal({ visit, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { notifySuccess, notifyError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [selectedMed, setSelectedMed] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.length > 2) {
      apiClient.get(`/medicines?q=${searchTerm}`).then(res => setMedicines(res.data.data || []));
    }
  }, [searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMed) return notifyError('Select a medicine');
    
    try {
      setLoading(true);
      await dispatch(dispenseOverride({ visitId: visit._id, drugRef: selectedMed._id, qty })).unwrap();
      notifySuccess('Dispensed — pending doctor signature');
      onSuccess();
    } catch (err) {
      notifyError('Dispense failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-modal-backdrop" onClick={onClose}>
      <div className="user-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Emergency Override: {visit.walkInData?.name || visit.patientRef?.firstName}</h3>
          <button className="button-ghost" onClick={onClose}><AppIcon name="x" /></button>
        </div>

        <div className="notice-banner warning mb-4">
          <AppIcon name="alert" size={16} />
          <span>Override — must be counter-signed within 2 hours by the attending physician.</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="field-label">Search Medication</label>
            <input 
              type="text" 
              placeholder="Start typing medicine name..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              disabled={!!selectedMed}
            />
            {medicines.length > 0 && !selectedMed && (
              <div className="search-results panel mt-1">
                {medicines.map(med => (
                  <div key={med._id} className="search-item" onClick={() => setSelectedMed(med)}>
                    <div><strong>{med.name}</strong> ({med.genericName})</div>
                    <div className="muted small">Stock: {med.stockQuantity} {med.unit}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedMed && (
            <div className="panel mb-4" style={{ background: 'var(--surface-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{selectedMed.name}</strong>
                  <div className="muted small">Available: {selectedMed.stockQuantity}</div>
                </div>
                <button className="button-ghost" onClick={() => setSelectedMed(null)}><AppIcon name="x" size={14} /></button>
              </div>
              <div className="mt-4">
                <label className="field-label">Quantity to Dispense</label>
                <input 
                  type="number" 
                  min="1" 
                  max={selectedMed.stockQuantity} 
                  value={qty} 
                  onChange={e => setQty(parseInt(e.target.value))} 
                  required 
                />
              </div>
            </div>
          )}

          <button type="submit" className="button-primary w-full mt-6" disabled={!selectedMed || loading}>
            {loading ? 'Processing...' : 'Authorize Stat Dispense'}
          </button>
        </form>
      </div>
      <style>{`
        .search-results { max-height: 200px; overflow-y: auto; border: 1px solid var(--line); position: absolute; width: calc(100% - 3rem); z-index: 10; }
        .search-item { padding: 8px; cursor: pointer; border-bottom: 1px solid var(--line); }
        .search-item:hover { background: var(--surface-muted); }
        .w-full { width: 100%; }
        .mb-4 { margin-bottom: 1rem; }
      `}</style>
    </div>
  );
}
