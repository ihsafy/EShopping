import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiChevronLeft, FiChevronRight, FiSearch, FiTrash2, FiUserCheck, FiUserX, FiEye } from 'react-icons/fi';
import Modal from '../../components/admin/Modal';
import Confirm from '../../components/admin/Confirm';
import { fetchAdminCustomers, fetchAdminCustomer, setCustomerStatus, deleteCustomer } from '../../services/admin';
import { formatPrice, formatDate } from '../../utils/format';

const LIMIT = 12;

function CustomerDetail({ data, onClose, onChanged, onDelete }) {
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const { customer, orders, totalSpent, conversation } = data;
  const active = customer.status === 'active';

  const toggleStatus = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await setCustomerStatus(customer.id, active ? 'disabled' : 'active');
      toast.success(result.message || 'Customer updated');
      onChanged();
    } catch (err) {
      toast.error(err.message || 'Could not update the customer.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={customer.name}
      onClose={busy ? undefined : onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={() => onDelete(customer)} disabled={busy}>
            <FiTrash2 size={14} /> Delete
          </button>
          <button
            type="button"
            className={active ? 'btn btn--ghost' : 'btn btn--primary'}
            onClick={toggleStatus}
            disabled={busy}
          >
            {busy ? 'Saving…' : active ? <><FiUserX size={14} /> Disable account</> : <><FiUserCheck size={14} /> Enable account</>}
          </button>
        </>
      }
    >
      <div className="admin-customer">
        <div className="admin-customer__stats">
          <div className="admin-kpi admin-kpi--sm">
            <span className="admin-kpi__label">Orders</span>
            <strong className="admin-kpi__value">{Number(customer.total_orders) || 0}</strong>
          </div>
          <div className="admin-kpi admin-kpi--sm">
            <span className="admin-kpi__label">Total spent</span>
            <strong className="admin-kpi__value">{formatPrice(totalSpent)}</strong>
          </div>
          <div className="admin-kpi admin-kpi--sm">
            <span className="admin-kpi__label">Status</span>
            <strong className="admin-kpi__value">
              <span className="admin-pill" data-status={active ? 'delivered' : 'cancelled'}>
                {customer.status}
              </span>
            </strong>
          </div>
        </div>

        <div className="admin-customer__info">
          <p>
            <span>Mobile</span> <strong>{customer.mobile}</strong>
          </p>
          <p>
            <span>Email</span> <strong>{customer.email || '—'}</strong>
          </p>
          <p>
            <span>Joined</span> <strong>{formatDate(customer.created_at)}</strong>
          </p>
          <p>
            <span>Last login</span> <strong>{customer.last_login_at ? formatDate(customer.last_login_at) : 'Never'}</strong>
          </p>
          <p>
            <span>Support chat</span> <strong>{conversation ? 'Active conversation' : 'No conversation'}</strong>
          </p>
        </div>

        <h3>Recent orders</h3>
        {orders?.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--tight">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>
                      <span className="admin-pill" data-status={order.order_status}>
                        {order.order_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">This customer has not placed any orders yet.</p>
        )}
      </div>
    </Modal>
  );
}

export default function AdminCustomers() {
  const [draft, setDraft] = useState({ search: '', status: '' });
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: LIMIT };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      setData(await fetchAdminCustomers(params));
    } catch (err) {
      setError(err.message || 'Could not load customers.');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const openCustomer = async (id) => {
    setOpenId(id);
    setDetail(null);
    try {
      setDetail(await fetchAdminCustomer(id));
    } catch (err) {
      toast.error(err.message || 'Could not load the customer.');
      setOpenId(null);
    }
  };

  const refreshDetail = async () => {
    if (!openId) return;
    try {
      setDetail(await fetchAdminCustomer(openId));
    } catch {
      /* the list refresh below is enough */
    }
    load();
  };

  const confirmRemove = async () => {
    if (!confirming || busy) return;
    setBusy(true);
    try {
      const result = await deleteCustomer(confirming.id);
      toast.success(result.message || 'Customer removed');
      if (openId === confirming.id) {
        setOpenId(null);
        setDetail(null);
      }
      setConfirming(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not remove the customer.');
    } finally {
      setBusy(false);
    }
  };

  const applyFilters = (event) => {
    event?.preventDefault?.();
    setPage(1);
    setFilters(draft);
  };

  const rows = data?.rows || [];
  const total = Number(data?.total) || 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const hasFilters = Boolean(filters.search || filters.status);

  return (
    <section className="admin-page">
      <Helmet>
        <title>Customers | EShopping Admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Customers</h1>
          <p className="muted">{loading ? 'Loading customers…' : `${total} customer(s)`}</p>
        </div>
      </div>

      <form className="admin-filters" onSubmit={applyFilters}>
        <input
          type="search"
          value={draft.search}
          onChange={(event) => setDraft((prev) => ({ ...prev, search: event.target.value }))}
          placeholder="Search name, mobile or email"
          aria-label="Search customers"
        />
        <select
          value={draft.status}
          onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
          aria-label="Filter by status"
        >
          <option value="">All accounts</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <button type="submit" className="btn btn--primary btn--sm">
          <FiSearch size={14} /> Apply
        </button>
        {hasFilters && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setDraft({ search: '', status: '' });
              setPage(1);
              setFilters({ search: '', status: '' });
            }}
          >
            Reset
          </button>
        )}
      </form>

      {error && (
        <div className="alert alert--error">
          {error}{' '}
          <button type="button" className="admin-linkbtn" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {loading && !data && <p className="muted admin-page__loading">Loading customers…</p>}

      {data && (
        <>
          {rows.length === 0 ? (
            <div className="admin-panel admin-empty">
              <h2>{hasFilters ? 'No customers match these filters' : 'No customers yet'}</h2>
              <p className="muted">
                {hasFilters ? 'Adjust the search or filters and try again.' : 'Registered shoppers will appear here.'}
              </p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--rows">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Joined</th>
                    <th>Orders</th>
                    <th>Spent</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.name}</strong>
                        <em className="admin-sub">
                          {row.mobile}
                          {row.email ? ` · ${row.email}` : ''}
                        </em>
                      </td>
                      <td>
                        {formatDate(row.created_at)}
                        <em className="admin-sub">
                          {row.last_login_at ? `Last login ${formatDate(row.last_login_at)}` : 'Never signed in'}
                        </em>
                      </td>
                      <td>{Number(row.total_orders) || 0}</td>
                      <td>{formatPrice(row.total_spending)}</td>
                      <td>
                        <span
                          className="admin-pill"
                          data-status={row.status === 'active' ? 'delivered' : 'cancelled'}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => openCustomer(row.id)}
                            aria-label={`View ${row.name}`}
                          >
                            <FiEye size={13} /> View
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => setConfirming(row)}
                            aria-label={`Delete ${row.name}`}
                          >
                            <FiTrash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && totalPages > 1 && (
            <div className="admin-pager">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <FiChevronLeft size={14} /> Previous
              </button>
              <span className="muted">
                Page {page} of {totalPages} · {total} total
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <FiChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {openId && detail && (
        <CustomerDetail
          data={detail}
          onClose={() => setOpenId(null)}
          onChanged={refreshDetail}
          onDelete={(customer) => setConfirming(customer)}
        />
      )}

      <Confirm
        open={Boolean(confirming)}
        title="Remove customer"
        message={`Are you sure you want to remove "${confirming?.name}"? Their account will be deleted permanently.`}
        confirmLabel="Remove customer"
        busy={busy}
        onConfirm={confirmRemove}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}
