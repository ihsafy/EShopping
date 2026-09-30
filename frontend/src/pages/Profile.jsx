import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import {
  FiHeart,
  FiMapPin,
  FiPackage,
  FiShoppingCart,
  FiTruck,
  FiUser,
} from 'react-icons/fi';
import useAuth from '../context/useAuth';
import { fetchProfileSummary } from '../services/profile';
import { StatusPill } from '../components/OrderStatus';
import { formatPrice, formatDate } from '../utils/format';

export default function Profile() {
  const { user, signOut } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');

    fetchProfileSummary()
      .then((data) => alive && setSummary(data))
      .catch((err) => alive && setError(err.message || 'We could not load your account summary.'))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  const stats = [
    { icon: <FiPackage size={16} />, label: 'Orders placed', value: summary?.totalOrders ?? '—', to: '/orders' },
    { icon: <FiTruck size={16} />, label: 'Total spent', value: formatPrice(summary?.totalSpent ?? 0), to: '/orders' },
    { icon: <FiHeart size={16} />, label: 'Wishlist', value: summary?.wishlistCount ?? '—', to: '/wishlist' },
    { icon: <FiShoppingCart size={16} />, label: 'Cart', value: 'View cart', to: '/cart' },
  ];

  const recentOrders = summary?.recentOrders || [];

  return (
    <div className="container page profile-page">
      <Helmet>
        <title>My Account - {import.meta.env.VITE_STORE_NAME || 'EShopping'}</title>
      </Helmet>

      <div className="page__head">
        <h1>My account</h1>
        <p className="muted">Your details, orders and shortcuts in one place.</p>
      </div>

      <section className="panel profile-card">
        <div className="profile-card__avatar" aria-hidden="true">
          <FiUser size={22} />
        </div>
        <div className="profile-card__info">
          <h2>{user?.name}</h2>
          <p>
            <strong>Mobile</strong> {user?.mobile}
          </p>
          {user?.email && (
            <p>
              <strong>Email</strong> {user.email}
            </p>
          )}
          <p className="muted">
            Member since {user?.createdAt ? formatDate(user.createdAt) : 'today'}
          </p>
        </div>
        <div className="profile-card__actions">
          <Link to="/profile/change-password" className="btn btn--ghost btn--sm">
            Change password
          </Link>
          <Link to="/profile/addresses" className="btn btn--ghost btn--sm">
            <FiMapPin size={14} /> Addresses
          </Link>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={async () => {
              await signOut();
              toast.success('Signed out');
            }}
          >
            Sign out
          </button>
        </div>
      </section>

      {loading && (
        <div className="state" role="status">
          <p>Loading your account…</p>
        </div>
      )}

      {!loading && error && (
        <div className="state state--error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="profile-stats">
            {stats.map((stat) => (
              <Link key={stat.label} to={stat.to} className="profile-stat">
                <span className="profile-stat__icon">{stat.icon}</span>
                <span className="profile-stat__value">{stat.value}</span>
                <span className="profile-stat__label">{stat.label}</span>
              </Link>
            ))}
          </div>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Recent orders</h2>
              <Link to="/orders" className="link-more">
                View all
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="state">
                <p>You don&apos;t have any orders yet.</p>
                <Link to="/shop" className="btn btn--primary">
                  Continue shopping
                </Link>
              </div>
            ) : (
              <div className="orders-list orders-list--compact">
                {recentOrders.map((order) => (
                  <article key={order.id} className="order-card">
                    <div className="order-card__head">
                      <div>
                        <h3 className="order-card__number">{order.order_number}</h3>
                        <p className="muted">{formatDate(order.created_at)}</p>
                      </div>
                      <strong>{formatPrice(order.total)}</strong>
                    </div>
                    <div className="order-card__body">
                      <StatusPill status={order.order_status} />
                      <Link to={`/orders/${order.id}`} className="btn btn--ghost btn--sm">
                        View details
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
