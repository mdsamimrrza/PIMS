import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppIcon from '../../components/AppIcon';
import useToast from '../../hooks/useToast';
import {
  acknowledgeAlertById,
  clearAlertsError,
  dismissAlertById,
  fetchAlerts
} from '../../store/slices/alertsSlice';

const sectionLabels = {
  LOW_STOCK: 'Critical Low Stock',
  NEAR_EXPIRY: 'Expiring Soon',
  EXPIRED: 'Expired Stock'
};

function summaryTone(severity) {
  if (severity === 'CRITICAL') {
    return 'status-pill status-critical';
  }
  if (severity === 'WARNING') {
    return 'status-pill status-warning';
  }
  return 'status-pill status-success';
}

export default function Alerts() {
  const dispatch = useDispatch();
  const alerts = useSelector((state) => state.alerts.items);
  const pagination = useSelector((state) => state.alerts.pagination);
  const isLoading = useSelector((state) => state.alerts.isLoading);
  const isUpdating = useSelector((state) => state.alerts.isUpdating);
  const errorMessage = useSelector((state) => state.alerts.errorMessage);
  const { notifyError, notifySuccess } = useToast();
  const [typeFilter, setTypeFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [scopeFilter, setScopeFilter] = useState('Open');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    dispatch(fetchAlerts({
      page,
      limit,
      type: typeFilter !== 'All' ? typeFilter : undefined,
      severity: severityFilter !== 'All' ? severityFilter : undefined,
      includeAcknowledged: scopeFilter === 'All' ? 'true' : undefined
    }));
  }, [dispatch, limit, page, refreshTick, scopeFilter, severityFilter, typeFilter]);

  const groupedAlerts = useMemo(() => alerts.reduce((accumulator, alert) => {
    const key = sectionLabels[alert.type] || alert.type;
    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(alert);
    return accumulator;
  }, {}), [alerts]);

  const criticalCount = alerts.filter((alert) => alert.severity === 'CRITICAL' && !alert.isAcknowledged).length;
  const warningCount = alerts.filter((alert) => alert.severity === 'WARNING' && !alert.isAcknowledged).length;
  const resolutionRate = alerts.length
    ? `${Math.round((alerts.filter((alert) => alert.isAcknowledged).length / alerts.length) * 100)}%`
    : '0%';

  const resolveAlert = async (id, mode) => {
    try {
      dispatch(clearAlertsError());
      await dispatch(mode === 'dismiss' ? dismissAlertById(id) : acknowledgeAlertById(id)).unwrap();
      notifySuccess('Alert updated', `Alert ${mode === 'dismiss' ? 'dismissed' : 'acknowledged'} successfully.`);
    } catch (error) {
      notifyError('Alert update failed', String(error || 'Failed to update alert'));
    }
  };

  return (
    <section className="page">
      {errorMessage ? (
        <div className="notice-banner" role="alert">
          <div>
            <strong>Alert issue</strong>
            <div className="helper-text">{errorMessage}</div>
          </div>
          <div className="toolbar-group">
            <button className="button-ghost" onClick={() => dispatch(clearAlertsError())} type="button">Dismiss</button>
            <button className="button-secondary" onClick={() => setRefreshTick((value) => value + 1)} type="button">Retry</button>
          </div>
        </div>
      ) : null}

      <div className="stats-grid">
        <section className="panel">
          <strong>Critical Alerts</strong>
          <h2>{criticalCount.toString().padStart(2, '0')}</h2>
        </section>
        <section className="panel">
          <strong>Warning Alerts</strong>
          <h2>{warningCount.toString().padStart(2, '0')}</h2>
        </section>
        <section className="panel">
          <strong>Resolution Rate</strong>
          <h2>{resolutionRate}</h2>
        </section>
      </div>

      <section className="panel">
        <div className="toolbar">
          <div className="toolbar-group">
            <select
              aria-label="Filter alerts by type"
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              value={typeFilter}
            >
              <option>All</option>
              <option>LOW_STOCK</option>
              <option>NEAR_EXPIRY</option>
              <option>EXPIRED</option>
            </select>
            <select
              aria-label="Filter alerts by severity"
              onChange={(event) => {
                setSeverityFilter(event.target.value);
                setPage(1);
              }}
              value={severityFilter}
            >
              <option>All</option>
              <option>CRITICAL</option>
              <option>WARNING</option>
              <option>INFO</option>
            </select>
            <select
              aria-label="Filter alerts by resolution state"
              onChange={(event) => {
                setScopeFilter(event.target.value);
                setPage(1);
              }}
              value={scopeFilter}
            >
              <option value="Open">Open Only</option>
              <option value="All">All</option>
            </select>
            <select
              aria-label="Alerts per page"
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              value={limit}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
          <div className="toolbar-group">
            <span className="helper-text">Page {pagination.page} of {pagination.totalPages}</span>
          </div>
        </div>
      </section>

      {Object.entries(groupedAlerts).map(([section, sectionAlerts]) => (
        <section className="panel" key={section}>
          <div className="panel-head">
            <div className="section-title">
              <AppIcon name="alert" size={20} />
              <h3>{section}</h3>
            </div>
          </div>

          <div className="alert-list">
            {sectionAlerts.map((alert) => (
              <div className={`alert-item is-${alert.severity?.toLowerCase()}`} key={alert._id}>
                <div>
                  <strong>{alert.medicineId?.name || alert.type}</strong>
                  <div className="helper-text">{alert.message}</div>
                </div>
                <div style={{ display: 'grid', gap: '0.65rem', justifyItems: 'end' }}>
                  <span className={summaryTone(alert.severity)}>
                    {alert.isAcknowledged ? 'Acknowledged' : alert.severity}
                  </span>
                  <div className="toolbar-group">
                    {!alert.isAcknowledged ? (
                      <>
                        <button className="button-secondary" disabled={isUpdating} onClick={() => resolveAlert(alert._id, 'acknowledge')} type="button">
                          {isUpdating ? 'Updating...' : 'Acknowledge'}
                        </button>
                        <button className="button-ghost" disabled={isUpdating} onClick={() => resolveAlert(alert._id, 'dismiss')} type="button">
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <span className="helper-text">Handled by {alert.acknowledgedBy?.firstName || 'user'}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {!isLoading && !alerts.length ? (
        <section className="panel">
          <div className="helper-text">No alerts returned from the backend for the current scope.</div>
        </section>
      ) : null}

      <div aria-label="Alert pagination" className="toolbar" role="navigation">
        <button
          className="button-secondary"
          disabled={pagination.page <= 1 || isLoading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          type="button"
        >
          Previous
        </button>
        <button
          className="button-secondary"
          disabled={pagination.page >= pagination.totalPages || isLoading}
          onClick={() => setPage((current) => current + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </section>
  );
}
