import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiChevronLeft, FiChevronRight, FiEye, FiSearch } from 'react-icons/fi';
import Modal from '../../components/admin/Modal';
import { fetchAdminOrders, fetchAdminOrder, setOrderStatus } from '../../services/admin';
import { formatPrice, formatDate } from '../../utils/format';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

function OrderDetail({ order, onClose, onChanged }) {
  const [status, setStatus] = useState(order?.order_status || 'pending');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) {
      setStatus(order.order_status || 'pending');
      setNote('');
    }
  }, [order]);

  if (!order) return null;

  const items = order.items || [];
  const unchanged = status === order.order_status && !note.trim();

  const save = async () => {
    if (saving || unchanged) return;
    if (status !== order.order_status && status === 'cancelled') {
      const confirmed = window.confirm(
        `Cancel order ${order.order_number}? Reserved stock will be released back to inventory.`
      );
      if (!confirmed) return;
    }
    setSaving(true);
    try {
      const result = await setOrderStatus(order.id, status, note.trim());
      toast.success(result.message || 'Order updated');
      onChanged();
    } catch (err) {
      toast.error(err.message || 'Could not update the order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Order ${order.order_number}`} onClose={saving ? undefined : onClose} wide>
      <div className="admin-order">
        <div className="admin-order__grid">
          <div className="admin-order__block">
            <h3>Customer</h3>
            <p>
              <strong>{order.customer_name}</strong>
            </p>
            <p className="muted">{order.customer_phone}</p>
            {order.customer_email && <p className="muted">{order.customer_email}</p>}
            <p className="muted">
              {order.customer_address}, {order.area}, {order.city}
            </p>
            {order.notes && <p className="muted">Note: {order.notes}</p>}
          </div>

          <div className="admin-order__block">
            <h3>Payment</h3>
            <p>
              Method <strong>{order.payment_method}</strong>
            </p>
            <p>
              Status{' '}
              <span className="admin-pill" data-status={order.payment_status === 'paid' ? 'delivered' : 'pending'}>
                {order.payment_status}
              </span>
            </p>
            <p className="muted">Placed on {formatDate(order.created_at)}</p>
          </div>

          <div className="admin-order__block">
            <h3>Totals</h3>
            <p>
              Subtotal <strong>{formatPrice(order.subtotal)}</strong>
            </p>
            {Number(order.discount) > 0 && (
              <p>
                Discount <strong>-{formatPrice(order.discount)}</strong>
              </p>
            )}
            <p>
              Delivery <strong>{formatPrice(order.delivery_fee)}</strong>
            </p>
            <p>
              Total <strong>{formatPrice(order.total)}</strong>
            </p>
          </div>
        </div>

        <h3>Ordered products</h3>
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--tight">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="admin-prod">
                      <span className="admin-prod__media admin-prod__media--sm">
                        {item.product_image ? (
                          <img src={item.product_image} alt={item.product_name} />
                        ) : (
                          <span className="admin-prod__noimg">—</span>
                        )}
                      </span>
                      <span className="admin-prod__meta">
                        <strong>{item.product_name}</strong>
                        <em>{item.product_sku}</em>
                      </span>
                    </div>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.unit_price)}</td>
                  <td>{formatPrice(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-order__status">
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="order-status">
              Order status
            </label>
            <select
              id="order-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={saving}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field admin-field--grow">
            <label className="admin-field__label" htmlFor="order-note">
              Status note (optional)
            </label>
            <input
              id="order-note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Courier pickup scheduled"
              disabled={saving}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={save}
            disabled={saving || unchanged}
          >
            {saving ? 'Saving…' : 'Update status'}
          </button>
          <p className="admin-field__hint">
            Current status: <span className="admin-pill" data-status={order.order_status}>{order.order_status}</span>
            {order.status_note ? ` · ${order.status_note}` : ''}
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminOrders() {
  const [draft, setDraft] = useState({ search: '', status: '' });
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 10 };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      setData(await fetchAdminOrders(params));
    } catch (err) {
      setError(err.message || 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const openOrder = async (id) => {
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await fetchAdminOrder(id));
    } catch (err) {
      toast.error(err.message || 'Could not load the order.');
      setOpenId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    try {
      setDetail(await fetchAdminOrder(openId));
    } catch {
      /* the list refresh below is enough */
    }
    load();
  };

  const applyFilters = (event) => {
    event?.preventDefault?.();
    setPage(1);
    setFilters(draft);
  };

  const orders = data?.orders || [];
  const pagination = data?.pagination || {};
  const totalPages = Number(pagination.totalPages) || 1;
  const hasFilters = Boolean(filters.search || filters.status);

  return (
    <section className="admin-page">
      <Helmet>
        <title>Orders | EShopping Admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Orders</h1>
          <p className="muted">
            {loading ? 'Loading orders…' : `${pagination.total ?? orders.length} order(s)`}
          </p>
        </div>
      </div>

      <form className="admin-filters" onSubmit={applyFilters}>
        <input
          type="search"
          value={draft.search}
          onChange={(event) => setDraft((prev) => ({ ...prev, search: event.target.value }))}
          placeholder="Search order number, customer or phone"
          aria-label="Search orders"
        />
        <select
          value={draft.status}
          onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
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

      {loading && !data && <p className="muted admin-page__loading">Loading orders…</p>}

      {data && (
        <>
          {orders.length === 0 ? (
            <div className="admin-panel admin-empty">
              <h2>{hasFilters ? 'No orders match these filters' : 'No orders yet'}</h2>
              <p className="muted">
                {hasFilters ? 'Adjust the filters and try again.' : 'Orders placed by customers will appear here.'}
              </p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--rows">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.order_number}</strong>
                      </td>
                      <td>
                        {order.customer_name}
                        <em className="admin-sub">{order.customer_phone}</em>
                      </td>
                      <td>{formatDate(order.created_at)}</td>
                      <td>{formatPrice(order.total)}</td>
                      <td>
                        {order.payment_method}
                        <em className="admin-sub">{order.payment_status}</em>
                      </td>
                      <td>
                        <span className="admin-pill" data-status={order.order_status}>
                          {order.order_status}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => openOrder(order.id)}
                            aria-label={`View order ${order.order_number}`}
                          >
                            <FiEye size={13} /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {orders.length > 0 && totalPages > 1 && (
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
                Page {pagination.page || page} of {totalPages} · {pagination.total} total
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

      {openId &&
        (detailLoading && !detail ? (
          <Modal title="Order details" onClose={() => setOpenId(null)}>
            <p className="muted">Loading order…</p>
          </Modal>
        ) : (
          <OrderDetail order={detail} onClose={() => setOpenId(null)} onChanged={refreshDetail} />
        ))}
    </section>
  );
}
