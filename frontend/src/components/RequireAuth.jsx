import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth';

/**
 * Guards the post-login routes (cart, wishlist, orders, profile).
 * Guests are sent to the login screen with a `next` target so they land
 * back on the page they asked for; the boot state is never bypassed, so a
 * refreshed tab does not flash the sign-in redirect while the session is
 * still being restored.
 */
export default function RequireAuth() {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="container state" role="status">
        <p>Restoring your session…</p>
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
