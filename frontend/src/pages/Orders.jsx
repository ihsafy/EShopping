import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiArrowRight, FiEye } from 'react-icons/fi';
import { fetchOrders } from '../services/orders';
import { StatusPill } from '../components/OrderStatus';
import { formatPrice, formatDate } from '../utils/format';

export default function Orders() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async (target) => {
    setError('');
    try {
      setPayload(await fetchOrders({ page: target, limit: 10 }));
    } catch (err) {
      setError(err.message || 'We could not load your orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const orders = payload?.orders || [];
  const pagination = payload?.pagination || {};
  const totalPages = Number(pagination.totalPages) || 1;

  return (
    <div className="container page orders-page">
      <Helmet>
        <title>My Orders - {import.meta.env.VITE_STORE_NAME || 'EShopping'}</title>
      </Helmet>

      <div className="page__head">
        <h1>My orders</h1>
        <p className="muted">Track and review the orders you have placed.</p>
      </div>

      {loading && (
        <div className="state" role="status">
          <p>Loading your orders…</p>
        </div>
      )}

      {!loading && error && (
        <div className="state state--error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn--primary" onClick={() => load(page)}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="state">
          <p>You don&apos;t have any orders yet.</p>
          <Link to="/shop" className="btn btn--primary">
            Continue shopping
          </Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <>
          <div className="orders-list">
            {orders.map((order) => (
              <article key={order.id} className="order-card">
                <div className="order-card__head">
                  <div>
                    <h2 className="order-card__number">{order.order_number}</h2>
                    <p className="muted">Placed on {formatDate(order.created_at)}</p>
                  </div>
                  <StatusPill status={order.order_status} />
                </div>

                <div className="order-card__body">
                  <div className="order-card__meta">
                    <span>
                      <strong>Customer</strong> {order.customer_name || order.account_name}
                    </span>
                    <span>
                      <strong>Payment</strong> {order.payment_method} / {order.payment_status}
                    </span>
                    <span>
                      <strong>Total</strong> {formatPrice(order.total)}
                    </span>
                  </div>

                  <Link to={`/orders/${order.id}`} className="btn btn--ghost btn--sm">
                    <FiEye size={14} /> View details
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="pager" aria-label="Orders pagination">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                <FiArrowLeft size={14} /> Previous
              </button>
              <span className="muted">
                Page {pagination.page || page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                Next <FiArrowRight size={14} />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
