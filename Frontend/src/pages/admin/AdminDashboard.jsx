import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../components/AppIcon';
import StatCard from '../../components/StatCard';
import '../../styles/Dashboard.css';
import { getApiMessage, getSummaryReport, listUsers } from '../../api/pimsApi';

function formatLastSeen(value) {
  if (!value) {
    return 'Never';
  }

  return new Date(value).toLocaleString();
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [pageState, setPageState] = useState({
    isLoading: true,
    errorMessage: ''
  });

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setPageState({ isLoading: true, errorMessage: '' });

      try {
        const [summaryData, userData] = await Promise.all([
          getSummaryReport(),
          listUsers({ limit: 6 })
        ]);

        if (!isActive) {
          return;
        }

        setSummary(summaryData);
        setUsers(userData?.users || []);
        setPageState({ isLoading: false, errorMessage: '' });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setPageState({
          isLoading: false,
          errorMessage: getApiMessage(error, 'Failed to load admin dashboard')
        });
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  const overview = summary?.overview || {
    activeUsers: 0,
    totalPrescriptions: 0,
    inventoryValue: 0,
    uptimeSeconds: 0,
    unacknowledgedAlerts: 0
  };

  const derivedAlerts = useMemo(() => ([
    {
      id: 'alert-latency',
      title: 'Open Operational Alerts',
      detail: `${overview.unacknowledgedAlerts} alerts still need pharmacist acknowledgement.`,
      tone: overview.unacknowledgedAlerts > 0 ? 'warning' : 'success'
    },
    {
      id: 'alert-users',
      title: 'User Access Coverage',
      detail: `${overview.activeUsers} active users currently have access to PIMS.`,
      tone: overview.activeUsers > 0 ? 'success' : 'critical'
    },
    {
      id: 'alert-uptime',
      title: 'Runtime Snapshot',
      detail: `Backend uptime is ${Math.round(overview.uptimeSeconds / 60)} minutes for the current process.`,
      tone: overview.uptimeSeconds > 0 ? 'success' : 'warning'
    }
  ]), [overview.activeUsers, overview.uptimeSeconds, overview.unacknowledgedAlerts]);

  return (
    <section className="page dashboard-page">
      {pageState.errorMessage ? (
        <div className="notice-banner">
          <div>
            <strong>Admin dashboard data could not load</strong>
            <div className="helper-text">{pageState.errorMessage}</div>
          </div>
        </div>
      ) : null}

      <section className="hero-banner surface-card">
        <div className="page-title">
          <span className="caption">Welcome back, Admin</span>
          <h2>Monitor platform health, authenticated users, and pharmacy throughput from the live backend.</h2>
        </div>
        <div className="hero-actions">
          <Link className="button-secondary" to="/admin/users">
            Manage Users
          </Link>
          <Link className="button-primary" to="/reports">
            View Reports
            <AppIcon name="arrowRight" size={18} />
          </Link>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard hint="Currently active accounts" icon="users" title="Active Users" value={String(overview.activeUsers)} />
        <StatCard hint="Across the selected reporting window" icon="prescription" title="Total Prescriptions" value={String(overview.totalPrescriptions)} />
        <StatCard hint="Derived from live inventory records" icon="inventory" title="Inventory Value" value={`$${Math.round(overview.inventoryValue || 0).toLocaleString()}`} />
        <StatCard hint="Current process uptime" icon="shield" title="Uptime" value={`${Math.round((overview.uptimeSeconds || 0) / 60)}m`} />
      </div>

      <div className="admin-grid">
        <section className="table-panel">
          <div className="table-head">
            <div className="page-title">
              <div className="section-title">
                <AppIcon name="clock" size={20} />
                <h3>User Activity Snapshot</h3>
              </div>
              <p className="helper-text">Recent user accounts with role and last login visibility.</p>
            </div>
            <Link className="button-secondary" to="/admin/users">Open User Management</Link>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Last Seen</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id || user.id}>
                    <td>{[user.firstName, user.lastName].filter(Boolean).join(' ')}</td>
                    <td>{user.role}</td>
                    <td>{user.email}</td>
                    <td>{formatLastSeen(user.lastLogin)}</td>
                    <td>
                      <span className={user.isActive ? 'status-pill status-success' : 'status-pill status-warning'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!users.length ? (
                  <tr>
                    <td className="helper-text" colSpan="5">No users returned from the backend yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <div className="stack">
          <section className="panel">
            <div className="section-title">
              <AppIcon name="plusCircle" size={20} />
              <h3>Quick Actions</h3>
            </div>
            <div className="mini-list">
              <Link className="mini-list-item" to="/admin/users">
                <div>
                  <strong>Add New User</strong>
                  <div className="helper-text">Create clinician, pharmacist, or admin accounts.</div>
                </div>
                <AppIcon name="chevronRight" size={16} />
              </Link>
              <Link className="mini-list-item" to="/reports">
                <div>
                  <strong>Generate Reports</strong>
                  <div className="helper-text">Review fulfillment and ATC usage from live data.</div>
                </div>
                <AppIcon name="chevronRight" size={16} />
              </Link>
              <Link className="mini-list-item" to="/admin/audit">
                <div>
                  <strong>System Audit Logs</strong>
                  <div className="helper-text">Monitor all system mutations and user activity.</div>
                </div>
                <AppIcon name="chevronRight" size={16} />
              </Link>
            </div>
          </section>

          <section className="panel">
            <div className="section-title">
              <AppIcon name="alert" size={20} />
              <h3>System Health Alerts</h3>
            </div>
            <div className="alert-list">
              {derivedAlerts.map((alert) => (
                <div className={`alert-item is-${alert.tone}`} key={alert.id}>
                  <div>
                    <strong>{alert.title}</strong>
                    <div className="helper-text">{alert.detail}</div>
                  </div>
                  <span className={`status-pill status-${alert.tone}`}>
                    {alert.tone}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
