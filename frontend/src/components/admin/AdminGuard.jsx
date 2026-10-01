import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiLock } from 'react-icons/fi';
import useAuth from '../../context/useAuth';
import AdminLayout from '../../layouts/AdminLayout';
import Button from '../ui/Button';

/** Session is still being restored: never bounce a valid session to login. */
function Booting() {
  return (
    <div className="admin-boot">
      <Helmet>
        <title>Admin sign in | EShopping</title>
      </Helmet>
      <span className="admin-boot__spinner" aria-hidden="true" />
      <p>Restoring your session…</p>
    </div>
  );
}

/** Signed in, but not an administrator: deny instead of leaking admin screens. */
function AccessDenied({ user, onSignOut }) {
  return (
    <div className="admin-deny">
      <Helmet>
        <title>Access denied | EShopping</title>
      </Helmet>
      <div className="admin-deny__card">
        <span className="admin-deny__icon">
          <FiLock size={26} />
        </span>
        <h1>Administrator access required</h1>
        <p className="muted">
          You are signed in as <strong>{user?.name}</strong> ({user?.mobile}), which is a customer
          account. Administrator sign-in is restricted to staff accounts.
        </p>
        <div className="admin-deny__actions">
          <Button variant="primary" onClick={onSignOut}>
            Sign out
          </Button>
          <Button as={Link} to="/" variant="ghost">
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Server-side guard: the API refuses non-admin tokens, this only stops the
 * UI from rendering admin screens for guests and customers.
 */
export default function AdminGuard() {
  const { user, booting, signOut } = useAuth();
  const location = useLocation();

  if (booting) return <Booting />;

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/admin/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (user.role !== 'admin') {
    return <AccessDenied user={user} onSignOut={signOut} />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
