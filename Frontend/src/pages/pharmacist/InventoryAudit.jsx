import { useEffect, useState } from 'react';
import AppIcon from '../../components/AppIcon';
import { getApiMessage, getInventoryAudit } from '../../api/pimsApi';

function statusClass(status) {
  if (status === 'STABLE') {
    return 'status-pill status-success';
  }
  if (status === 'NEAR EXPIRY') {
    return 'status-pill status-warning';
  }
  if (status === 'LOW STOCK' || status === 'EXPIRED') {
    return 'status-pill status-critical';
  }
  return 'status-pill status-neutral';
}

const statusOptions = ['All', 'STABLE', 'LOW STOCK', 'NEAR EXPIRY', 'EXPIRED'];

export default function InventoryAudit() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalUnits: 0,
    inventoryValue: 0,
    lowStockCount: 0,
    nearExpiryCount: 0,
    expiredCount: 0
  });
  const [pageState, setPageState] = useState({
    isLoading: true,
    errorMessage: ''
  });

  useEffect(() => {
    let isActive = true;

    async function loadAudit() {
      setPageState({ isLoading: true, errorMessage: '' });

      try {
        const data = await getInventoryAudit({
          page,
          limit,
          q: query || undefined,
          status: status !== 'All' ? status : undefined
        });

        if (!isActive) {
          return;
        }

        setItems(data?.items || []);
        setPagination(data?.pagination || { page, limit, total: 0, totalPages: 1 });
        setSummary(data?.summary || {
          totalItems: 0,
          totalUnits: 0,
          inventoryValue: 0,
          lowStockCount: 0,
          nearExpiryCount: 0,
          expiredCount: 0
        });
        setPageState({ isLoading: false, errorMessage: '' });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setPageState({
          isLoading: false,
          errorMessage: getApiMessage(error, 'Failed to load inventory audit')
        });
      }
    }

    loadAudit();

    return () => {
      isActive = false;
    };
  }, [limit, page, query, status]);

  return (
    <section className="page">
      {pageState.errorMessage ? (
        <div className="notice-banner">
          <div>
            <strong>Inventory audit issue</strong>
            <div className="helper-text">{pageState.errorMessage}</div>
          </div>
        </div>
      ) : null}

      <div className="stats-grid">
        <section className="panel">
          <strong>Total Items</strong>
          <h2>{summary.totalItems}</h2>
        </section>
        <section className="panel">
          <strong>Total Units</strong>
          <h2>{summary.totalUnits}</h2>
        </section>
        <section className="panel">
          <strong>Inventory Value</strong>
          <h2>${Math.round(summary.inventoryValue || 0).toLocaleString()}</h2>
        </section>
        <section className="panel">
          <strong>Low Stock</strong>
          <h2>{summary.lowStockCount}</h2>
        </section>
        <section className="panel">
          <strong>Near Expiry</strong>
          <h2>{summary.nearExpiryCount}</h2>
        </section>
        <section className="panel">
          <strong>Expired</strong>
          <h2>{summary.expiredCount}</h2>
        </section>
      </div>

      <section className="table-panel">
        <div className="toolbar">
          <div className="toolbar-group">
            <label className="search-field" style={{ minWidth: '280px' }}>
              <AppIcon name="search" size={18} />
              <input
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search batch or ATC code..."
                type="search"
                value={query}
              />
            </label>
            <select
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              value={status}
            >
              {statusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <select
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
          <div className="helper-text">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total records
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>ATC Code</th>
                <th>Batch</th>
                <th>Stock</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Storage</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.medicineId?.name || item.atcCode}</strong>
                    <div className="helper-text">{item.medicineId?.manufacturer || 'Unknown manufacturer'}</div>
                  </td>
                  <td>{item.atcCode}</td>
                  <td>{item.batchId}</td>
                  <td>{item.currentStock}</td>
                  <td>{item.threshold}</td>
                  <td><span className={statusClass(item.status)}>{item.status}</span></td>
                  <td>{new Date(item.expiryDate).toLocaleDateString()}</td>
                  <td>{item.storage || 'No storage note'}</td>
                </tr>
              ))}
              {!pageState.isLoading && !items.length ? (
                <tr>
                  <td className="helper-text" colSpan="8">No inventory audit records for current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="toolbar">
          <button
            className="button-secondary"
            disabled={pagination.page <= 1 || pageState.isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            Previous
          </button>
          <button
            className="button-secondary"
            disabled={pagination.page >= pagination.totalPages || pageState.isLoading}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </section>
    </section>
  );
}
