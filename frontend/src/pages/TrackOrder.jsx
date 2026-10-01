import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiEye, FiPackage } from 'react-icons/fi';
import { fetchOrders } from '../services/orders';
import OrderSteps, { StatusPill } from '../components/OrderStatus';
import { formatPrice, formatDate, formatPaymentMethod, formatPaymentStatus } from '../utils/format';

const ZONE_LABELS = {
  inside_dhaka: 'Inside Dhaka',
  outside_dhaka: 'Outside Dhaka',
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Rough ETA derived from the order date (deliveries are quoted at ~3 days). */
function estimateDelivery(order) {
  if (order.order_status === 'cancelled') return null;
  if (order.order_status === 'delivered') return { text: 'Delivered', done: true };
  const created = new Date(order.created_at);
  if (Number.isNaN(created.getTime())) return null;
  const eta = new Date(created.getTime() + 3 * DAY_MS);
  const sameDay = eta.toDateString() === new Date().toDateString();
  return {
    text: sameDay ? 'Estimated delivery: Today by 5 PM' : `Estimated delivery: ${formatDate(eta)}`,
    done: false,
  };
}

export default function TrackOrder() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setPayload(await fetchOrders({ page: 1, limit: 10 }));
    } catch (err) {
      setError(err.message || 'We could not load your orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const orders = payload?.orders || [];

  return (
    <div className="container page track-page">
      <Helmet>
        <title>Track Order - {import.meta.env.VITE_STORE_NAME || 'EShopping'}</title>
      </Helmet>

      <div className="page__head">
        <h1>Track your order</h1>
        <p className="muted">See where your recent orders are right now.</p>
      </div>

      {loading && (
        <div className="state" role="status">
          <p>Loading your orders…</p>
        </div>
      )}

      {!loading && error && (
        <div className="state state--error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn--primary" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="state">
          <FiPackage size={30} />
          <p>You don&apos;t have any orders to track yet.</p>
          <Link to="/shop" className="btn btn--primary">
            Continue shopping
          </Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="track-list">
          {orders.map((order) => {
            const eta = estimateDelivery(order);
            return (
            <article key={order.id} className="track-card">
              <div className="track-card__head">
                <div>
                  <h2 className="order-card__number">{order.order_number}</h2>
                  <p className="muted">Placed on {formatDate(order.created_at)}</p>
                </div>
                <div className="track-card__badges">
                  {eta && (
                    <span className={`badge badge--eta ${eta.done ? 'is-done' : ''}`}>{eta.text}</span>
                  )}
                  <StatusPill status={order.order_status} />
                </div>
              </div>

              <OrderSteps status={order.order_status} />

              <dl className="track-card__info">
                <div>
                  <dt>Recipient</dt>
                  <dd>{order.customer_name || order.account_name}</dd>
                </div>
                <div>
                  <dt>Delivery</dt>
                  <dd>{ZONE_LABELS[order.delivery_zone] || order.city}</dd>
                </div>
                <div>
                  <dt>Payment</dt>
                  <dd>
                    {formatPaymentMethod(order.payment_method)} / {formatPaymentStatus(order.payment_status)}
                  </dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{formatPrice(order.total)}</dd>
                </div>
              </dl>

              <div className="track-card__actions">
                <Link to={`/orders/${order.id}`} className="btn btn--primary btn--sm">
                  <FiEye size={14} /> View order details
                </Link>
              </div>
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
