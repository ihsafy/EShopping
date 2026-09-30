import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiGrid, FiBox, FiShoppingBag, FiUsers, FiImage, FiLogOut, FiExternalLink } from 'react-icons/fi';
import useAuth from '../context/useAuth';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: FiGrid, end: true },
  { to: '/admin/products', label: 'Products', icon: FiBox },
  { to: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
  { to: '/admin/customers', label: 'Customers', icon: FiUsers },
  { to: '/admin/content', label: 'Content', icon: FiImage },
];

/** Admin shell: dark brand bar, section nav and the signed-in administrator. */
export default function AdminLayout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin">
      <header className="admin__bar">
        <div className="admin__bar-inner">
          <Link to="/admin" className="brand admin__brand">
            <span className="brand__mark">E</span>
            <span className="brand__name">EShopping</span>
            <span className="admin__badge">Admin</span>
          </Link>

          <nav className="admin__nav" aria-label="Admin sections">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}>
                <Icon size={15} /> {label}
              </NavLink>
            ))}
          </nav>

          <div className="admin__who">
            <Link to="/" className="admin__store" title="View the storefront">
              <FiExternalLink size={14} /> Store
            </Link>
            <span className="admin__user" title={user?.email || user?.mobile || ''}>
              {user?.name}
            </span>
            <button type="button" className="btn btn--ghost admin__out" onClick={handleSignOut}>
              <FiLogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="admin__main">{children}</main>

      <footer className="admin__foot">
        <span>EShopping admin · signed in as {user?.email || user?.mobile}</span>
        <span>Administrator sessions expire automatically.</span>
      </footer>
    </div>
  );
}
