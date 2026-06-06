import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAuditLogs, fetchAuditStats } from '../../store/slices/auditSlice';
import AppIcon from '../../components/AppIcon';
import '../../styles/AuditLog.css';
import StatCard from '../../components/StatCard';
import { getApiMessage } from '../../api/pimsApi';

const MODULE_COLORS = {
  admission: 'status-success',
  billing: 'status-warning',
  prescription: 'status-accent',
  user: 'status-critical',
  system: 'status-neutral',
  vitals: 'status-success',
  emergency: 'status-critical',
  inventory: 'status-warning'
};

export default function AuditLog() {
  const dispatch = useDispatch();
  const { logs, stats, pagination, loading, error } = useSelector(state => state.audit);
  
  const [filters, setFilters] = useState({
    module: '',
    action: '',
    q: '',
    page: 1
  });

  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    dispatch(fetchAuditLogs(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    dispatch(fetchAuditStats());
  }, [dispatch]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const formatDiff = (diff) => {
    if (!diff) return null;
    return JSON.stringify(diff, null, 2);
  };

  return (
    <section className="page">
      <section className="hero-banner surface-card">
        <div className="page-title">
          <span className="caption">System Integrity</span>
          <h2>Global Audit Trail</h2>
          <p className="helper-text">Immutable record of every sensitive mutation across the PIMS platform.</p>
        </div>
      </section>

      {/* Stats Overview */}
      <div className="stats-grid">
        <StatCard 
          icon="shield" 
          title="Total Events" 
          value={pagination.total.toLocaleString()} 
          hint="All recorded mutations"
        />
        <StatCard 
          icon="users" 
          title="Top Actor" 
          value={stats?.byAction?.[0]?._id?.split('.')[0] || 'System'} 
          hint="Most active module"
        />
        <StatCard 
          icon="alert" 
          title="Critical Events" 
          value={logs.filter(l => l.action.includes('failed') || l.action.includes('deleted')).length.toString()} 
          hint="Recent sensitive actions"
        />
        <StatCard 
          icon="clock" 
          title="Log Retention" 
          value="7 Years" 
          hint="Regulatory compliance"
        />
      </div>

      {/* Filters & Table */}
      <section className="table-panel">
        <div className="table-head">
          <div className="topbar-actions" style={{ flex: 1 }}>
            <div className="search-field" style={{ flex: 1 }}>
              <AppIcon name="search" size={18} />
              <input 
                name="q"
                placeholder="Search by actor, ID or email..." 
                value={filters.q}
                onChange={handleFilterChange}
              />
            </div>
            <select name="module" value={filters.module} onChange={handleFilterChange} style={{ width: '150px' }}>
              <option value="">All Modules</option>
              <option value="admission">Admission</option>
              <option value="billing">Billing</option>
              <option value="prescription">Prescription</option>
              <option value="user">User</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Module</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Resource</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center">Loading audit trails...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="6" className="text-center helper-text">No audit logs found matching your criteria.</td></tr>
              ) : logs.map(log => (
                <tr key={log._id}>
                  <td className="helper-text">{new Date(log.timestamp).toLocaleString()}</td>
                  <td>
                    <span className={`status-pill ${MODULE_COLORS[log.module] || 'status-neutral'}`}>
                      {log.module.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{log.action}</td>
                  <td>
                    <div className="stack" style={{ gap: '2px' }}>
                      <strong>{log.actor.name}</strong>
                      <div className="helper-text" style={{ fontSize: '0.7rem' }}>{log.actor.role} • {log.actor.ip}</div>
                    </div>
                  </td>
                  <td className="helper-text" style={{ fontFamily: 'monospace' }}>
                    {log.resource.collection} ({log.resource.docId.slice(-6)})
                  </td>
                  <td>
                    <button className="button-secondary btn-sm" onClick={() => setSelectedLog(log)}>
                      <AppIcon name="eye" size={14} />
                      View Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination-bar" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <button 
              disabled={filters.page === 1}
              onClick={() => handlePageChange(filters.page - 1)}
              className="button-secondary btn-sm"
            >
              Previous
            </button>
            <span className="helper-text">Page {filters.page} of {pagination.totalPages}</span>
            <button 
              disabled={filters.page === pagination.totalPages}
              onClick={() => handlePageChange(filters.page + 1)}
              className="button-secondary btn-sm"
            >
              Next
            </button>
          </div>
        )}
      </section>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content surface-card" style={{ maxWidth: '800px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="section-title">
                <AppIcon name="history" size={24} />
                <h3>Event Mutation Detail</h3>
              </div>
              <button className="icon-button" onClick={() => setSelectedLog(null)}>
                <AppIcon name="close" size={20} />
              </button>
            </div>
            
            <div className="modal-body stack" style={{ gap: '1.5rem' }}>
              <div className="admin-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="panel">
                  <strong>Metadata</strong>
                  <div className="mini-list" style={{ marginTop: '0.5rem' }}>
                    <div className="mini-list-item">
                      <span>Session ID</span>
                      <span className="helper-text">{selectedLog.sessionId || 'N/A'}</span>
                    </div>
                    <div className="mini-list-item">
                      <span>User Agent</span>
                      <span className="helper-text" style={{ fontSize: '0.7rem' }}>{selectedLog.actor.userAgent}</span>
                    </div>
                  </div>
                </div>
                <div className="panel">
                  <strong>Resource Reference</strong>
                  <div className="mini-list" style={{ marginTop: '0.5rem' }}>
                    <div className="mini-list-item">
                      <span>Collection</span>
                      <span className="helper-text">{selectedLog.resource.collection}</span>
                    </div>
                    <div className="mini-list-item">
                      <span>Document ID</span>
                      <span className="helper-text">{selectedLog.resource.docId}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="stack" style={{ gap: '0.5rem' }}>
                <strong>State Mutation (JSON Diff)</strong>
                <div className="diff-view" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: selectedLog.diff?.before ? '1fr 1fr' : '1fr',
                  gap: '1rem',
                  background: 'var(--surface-muted)',
                  padding: '1rem',
                  borderRadius: '12px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  overflowX: 'auto'
                }}>
                  {selectedLog.diff?.before && (
                    <div className="stack">
                      <div className="caption" style={{ marginBottom: '0.5rem' }}>Before</div>
                      <pre>{formatDiff(selectedLog.diff.before)}</pre>
                    </div>
                  )}
                  <div className="stack">
                    <div className="caption" style={{ marginBottom: '0.5rem', color: 'var(--success)' }}>{selectedLog.diff?.before ? 'After' : 'Snapshot'}</div>
                    <pre>{formatDiff(selectedLog.diff?.after || selectedLog.metadata)}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
