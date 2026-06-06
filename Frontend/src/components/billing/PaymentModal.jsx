import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { processPartialPayment, applyInsurance, downloadReceipt } from '../../store/slices/billingSlice';
import useToast from '../../hooks/useToast';
import AppIcon from '../AppIcon';

export default function PaymentModal({ invoice, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const { notifySuccess, notifyError } = useToast();
  const { downloadStatus } = useSelector(state => state.billing);

  const [paymentMode, setPaymentMode] = useState('pay'); // 'pay' or 'insurance'
  const [amount, setAmount] = useState(invoice.amountDue.toString());
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Insurance fields
  const [insurance, setInsurance] = useState({
    provider: '',
    policyNumber: '',
    approvalCode: '',
    coveredAmount: '0',
    patientCopay: '0'
  });

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (parseFloat(amount) > invoice.amountDue + 0.01) {
      return notifyError('Invalid Amount', 'Payment cannot exceed amount due.');
    }
    if (parseFloat(amount) <= 0) {
      return notifyError('Invalid Amount', 'Amount must be greater than zero.');
    }

    try {
      await dispatch(processPartialPayment({
        id: invoice._id,
        data: { amount: parseFloat(amount), method, reference, notes }
      })).unwrap();
      notifySuccess('Payment Successful');
      onSuccess();
      onClose();
    } catch (err) {
      notifyError('Payment Failed', err);
    }
  };

  const handleApplyInsurance = async (e) => {
    e.preventDefault();
    const total = parseFloat(insurance.coveredAmount) + parseFloat(insurance.patientCopay);
    if (total > invoice.grandTotal + 0.01) {
      return notifyError('Validation Error', 'Insurance + Copay exceeds total.');
    }

    try {
      await dispatch(applyInsurance({
        id: invoice._id,
        data: {
          ...insurance,
          coveredAmount: parseFloat(insurance.coveredAmount),
          patientCopay: parseFloat(insurance.patientCopay)
        }
      })).unwrap();
      notifySuccess('Insurance Applied');
      onSuccess();
      onClose();
    } catch (err) {
      notifyError('Failed to apply insurance', err);
    }
  };

  const handleDownload = () => {
    dispatch(downloadReceipt(invoice._id));
  };

  const fmt = (v) => '₹' + (v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="user-modal-backdrop" onClick={onClose}>
      <div className="user-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Invoice #{invoice.invoiceNumber}</h3>
          <button className="button-ghost" onClick={onClose}><AppIcon name="x" /></button>
        </div>

        {/* GST & Summary Section */}
        <div className="panel mb-4" style={{ background: 'var(--surface-muted)', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span className="muted">Subtotal:</span>
            <span>{fmt(invoice.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '4px' }}>
            <span className="muted">GST (Medicines 5%):</span>
            <span>{fmt(invoice.gst.medicineAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '4px' }}>
            <span className="muted">GST (Services 12%):</span>
            <span>{fmt(invoice.gst.serviceAmount)}</span>
          </div>
          {invoice.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '4px', color: 'var(--danger)' }}>
              <span>Discount:</span>
              <span>-{fmt(invoice.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
            <span>Grand Total:</span>
            <span style={{ color: 'var(--accent)' }}>{fmt(invoice.grandTotal)}</span>
          </div>
        </div>

        {/* Status Banner */}
        {invoice.paymentStatus === 'paid' ? (
          <div className="notice-banner success mb-4">
            <AppIcon name="checkCircle" size={16} />
            <span>Paid in Full</span>
          </div>
        ) : (
          <div className="notice-banner warning mb-4">
            <AppIcon name="alert" size={16} />
            <span>Balance Due: {fmt(invoice.amountDue)}</span>
          </div>
        )}

        <div className="tabs-container mb-4" style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`button-${paymentMode === 'pay' ? 'primary' : 'secondary'} flex-1`} 
            onClick={() => setPaymentMode('pay')}
            disabled={invoice.paymentStatus === 'paid'}
          >
            Collect Payment
          </button>
          <button 
            className={`button-${paymentMode === 'insurance' ? 'primary' : 'secondary'} flex-1`} 
            onClick={() => setPaymentMode('insurance')}
            disabled={invoice.paymentStatus === 'paid' || invoice.insurance?.insuranceStatus === 'approved'}
          >
            Insurance / Co-pay
          </button>
        </div>

        {paymentMode === 'pay' && invoice.paymentStatus !== 'paid' && (
          <form onSubmit={handleProcessPayment}>
            <div className="field-grid two">
              <div>
                <label className="field-label">Amount to Pay</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                <span className="muted" style={{ fontSize: '0.75rem' }}>Paying {fmt(parseFloat(amount || 0))} of {fmt(invoice.amountDue)}</span>
              </div>
              <div>
                <label className="field-label">Method</label>
                <select value={method} onChange={e => setMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI / Online</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="field-label">Reference (Optional)</label>
              <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="Txn ID / Auth Code" />
            </div>
            <button type="submit" className="button-primary w-full mt-6">Record Payment</button>
          </form>
        )}

        {paymentMode === 'insurance' && (
          <form onSubmit={handleApplyInsurance}>
            <div className="field-grid two">
              <div>
                <label className="field-label">Provider</label>
                <input type="text" value={insurance.provider} onChange={e => setInsurance({...insurance, provider: e.target.value})} required />
              </div>
              <div>
                <label className="field-label">Policy Number</label>
                <input type="text" value={insurance.policyNumber} onChange={e => setInsurance({...insurance, policyNumber: e.target.value})} required />
              </div>
            </div>
            <div className="field-grid two mt-4">
              <div>
                <label className="field-label">Covered Amount</label>
                <input type="number" value={insurance.coveredAmount} onChange={e => setInsurance({...insurance, coveredAmount: e.target.value})} required />
              </div>
              <div>
                <label className="field-label">Patient Co-pay</label>
                <input type="number" value={insurance.patientCopay} onChange={e => setInsurance({...insurance, patientCopay: e.target.value})} required />
              </div>
            </div>
            <div className="mt-4">
              <label className="field-label">Approval Code</label>
              <input type="text" value={insurance.approvalCode} onChange={e => setInsurance({...insurance, approvalCode: e.target.value})} required />
            </div>
            <button type="submit" className="button-primary w-full mt-6">Apply Insurance</button>
          </form>
        )}

        <div className="mt-6 pt-4 border-top" style={{ borderTop: '1px solid var(--line)' }}>
          <button 
            className="button-ghost w-full" 
            onClick={handleDownload}
            disabled={downloadStatus === 'loading'}
          >
            <AppIcon name="download" size={16} />
            {downloadStatus === 'loading' ? 'Generating Receipt...' : 'Download Receipt PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
