import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiArrowLeft } from 'react-icons/fi';
import { fetchOrder } from '../services/orders';
import OrderSteps, { StatusPill } from '../components/OrderStatus';
import { formatPrice, formatDate } from '../utils/format';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setOrder(null);

    fetchOrder(id)
      .then((data) => alive && setOrder(data))
      .catch((err) => alive && setError(err.message || 'We could not load this order.'))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [id]);

  const items = order?.items || [];

  return (
    <div className="container page order-detail-page">
      <Helmet>
        <title>
          Order {order?.order_number || ''} - {import.meta.env.VITE_STORE_NAME || 'EShopping'}
        </title>
      </Helmet>

      <div className="page__head page__head--split">
        <div>
          <Link to="/orders" className="page__back">
            <FiArrowLeft size={14} /> Back to my orders
          </Link>
          <h1>Order details</h1>
          {order && <p className="muted">{order.order_number}</p>}
        </div>
        {order && <StatusPill status={order.order_status} />}
      </div>

      {loading && (
        <div className="state" role="status">
          <p>Loading this order…</p>
        </div>
      )}

      {!loading && error && (
        <div className="state state--error" role="alert">
          <p>{error}</p>
          <Link to="/orders" className="btn btn--primary">
            Back to my orders
          </Link>
        </div>
      )}

      {!loading && !error && order && (
        <>
          <section className="panel">
            <h2 className="panel__title">Order status</h2>
            <OrderSteps status={order.order_status} />
            <div className="panel__grid">
              <p>
                <strong>Placed on</strong> {formatDate(order.created_at)}
              </p>
              <p>
                <strong>Payment</strong> {order.payment_method} / {order.payment_status}
              </p>
              <p>
                <strong>Delivery zone</strong>{' '}
                {order.delivery_zone === 'outside_dhaka' ? 'Outside Dhaka' : 'Inside Dhaka'}
              </p>
              {order.coupon_code && (
                <p>
                  <strong>Coupon</strong> {order.coupon_code}
                </p>
              )}
            </div>
          </section>

          <section className="panel">
            <h2 className="panel__title">Items</h2>
            <div className="order-items">
              {items.map((item) => (
                <div key={item.id} className="order-item">
                  <div className="order-item__media">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} loading="lazy" />
                    ) : (
                      <div className="product-card__placeholder">No image</div>
                    )}
                  </div>
                  <div className="order-item__body">
                    {item.product_slug ? (
                      <Link to={`/product/${item.product_slug}`} className="order-item__name">
                        {item.product_name}
                      </Link>
                    ) : (
                      <span className="order-item__name">{item.product_name}</span>
                    )}
                    <p className="muted">
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </p>
                  </div>
                  <strong className="order-item__total">{formatPrice(item.total)}</strong>
                </div>
              ))}
            </div>

            <div className="cart-summary cart-summary--slim">
              <div className="cart-summary__row">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="cart-summary__row cart-summary__row--savings">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="cart-summary__row">
                <span>Delivery fee</span>
                <span>{formatPrice(order.delivery_fee)}</span>
              </div>
              <div className="cart-summary__row cart-summary__row--total">
                <span>Total</span>
                <strong>{formatPrice(order.total)}</strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel__title">Delivery information</h2>
            <div className="panel__grid">
              <p>
                <strong>Name</strong> {order.customer_name}
              </p>
              <p>
                <strong>Phone</strong> {order.customer_phone}
              </p>
              {order.customer_email && (
                <p>
                  <strong>Email</strong> {order.customer_email}
                </p>
              )}
              <p>
                <strong>Address</strong> {order.customer_address}, {order.area}, {order.city}
              </p>
              {order.notes && (
                <p>
                  <strong>Notes</strong> {order.notes}
                </p>
              )}
            </div>
          </section>

          <div className="page__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(order.order_number)
                  .then(() => toast.success('Order number copied'))
                  .catch(() => toast.error('Could not copy the order number'));
              }}
            >
              Copy order number
            </button>
            <Link to="/shop" className="btn btn--primary">
              Continue shopping
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
