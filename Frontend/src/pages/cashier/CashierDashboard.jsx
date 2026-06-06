import { useEffect, useState } from 'react';
import AppIcon from '../../components/AppIcon';
import StatCard from '../../components/StatCard';
import { listInvoices, getApiMessage } from '../../api/pimsApi';
import useToast from '../../hooks/useToast';
import PaymentModal from '../../components/billing/PaymentModal';

export default function CashierDashboard() {
  const { notifyError } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [filter, setFilter] = useState('pending'); // 'pending', 'partial', 'paid'

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const data = await listInvoices({ paymentStatus: filter === 'pending' ? 'pending' : (filter === 'partial' ? 'partial' : 'paid') });
      setInvoices(data || []);
    } catch (err) {
      notifyError('Failed to load invoices', getApiMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const totals = {
    count: invoices.length,
    due: invoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0)
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'partial': return 'status-partial';
      default: return 'status-pending';
    }
  };

  const fmt = (v) => '₹' + (v || 0).toLocaleString('en-IN');

  return (
    <section className="page">
      <div className="toolbar">
        <h1>Cashier Terminal</h1>
        <div className="button-group">
          <button className={`button-${filter === 'pending' ? 'primary' : 'secondary'}`} onClick={() => setFilter('pending')}>Pending</button>
          <button className={`button-${filter === 'partial' ? 'primary' : 'secondary'}`} onClick={() => setFilter('partial')}>Partial</button>
          <button className={`button-${filter === 'paid' ? 'primary' : 'secondary'}`} onClick={() => setFilter('paid')}>History</button>
        </div>
      </div>

      <div className="stats-grid mt-6">
        <StatCard icon="note" title="Invoice Count" value={String(totals.count)} />
        <StatCard icon="checkCircle" title="Total Due" value={fmt(totals.due)} />
        <StatCard icon="inventory" title="Daily Collected" value="₹42,850" />
      </div>

      <section className="panel mt-6">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{filter.charAt(0).toUpperCase() + filter.slice(1)} Invoices</h3>
          <button className="button-ghost" onClick={fetchInvoices}><AppIcon name="refresh" /></button>
        </div>

        {isLoading ? (
          <div className="empty-state">Loading billing records...</div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Patient</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id}>
                    <td className="monospace"><strong>{inv.invoiceNumber}</strong></td>
                    <td>{inv.patientId?.name || 'Walk-in Patient'}</td>
                    <td>{fmt(inv.grandTotal)}</td>
                    <td style={{ color: 'var(--accent)' }}>{fmt(inv.amountPaid)}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{fmt(inv.amountDue)}</td>
                    <td>
                      <span className={`status-pill ${getStatusClass(inv.paymentStatus)}`}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="muted">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="button-primary button-small" onClick={() => setSelectedInvoice(inv)}>
                        {inv.paymentStatus === 'paid' ? 'View' : 'Process'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!invoices.length && <div className="empty-state">No invoices found for this filter.</div>}
          </div>
        )}
      </section>

      {selectedInvoice && (
        <PaymentModal 
          invoice={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
          onSuccess={fetchInvoices}
        />
      )}

      <style>{`
        .status-paid { background: #dcfce7; color: #166534; }
        .status-partial { background: #fef3c7; color: #92400e; }
        .status-pending { background: #fee2e2; color: #991b1b; }
        .monospace { font-family: monospace; }
        .border-top { border-top: 1px solid var(--line); }
      `}</style>
    </section>
  );
}
