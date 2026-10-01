import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  FiBox,
  FiGrid,
  FiImage,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiShoppingBag,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import useAuth from '../context/useAuth';
import ThemeToggle from '../components/ui/ThemeToggle';
import { fetchConversations } from '../services/chat';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: FiGrid, end: true },
  { to: '/admin/products', label: 'Products', icon: FiBox },
  { to: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
  { to: '/admin/customers', label: 'Customers', icon: FiUsers },
  { to: '/admin/messages', label: 'Messages', icon: FiMessageSquare, chat: true },
  { to: '/admin/content', label: 'Content', icon: FiImage },
];

const BADGE_MS = 60000;

/**
 * Admin shell.
 *
 * There is deliberately no "Store" link here - the admin lives in its own
 * space. The phone menu is a focus-trapping dialog; Escape closes it and focus
 * returns to the burger that opened it.
 */
export default function AdminLayout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  const handleSignOut = () => {
    setMenuOpen(false);
    signOut();
    navigate('/admin/login', { replace: true });
  };

  // Unread customer messages badge: a slow, visibility-aware poll.
  useEffect(() => {
    let alive = true;
    let timer = null;
    const check = async () => {
      try {
        const data = await fetchConversations({ limit: 1 });
        if (alive) setChatUnread(Number(data?.unread) || 0);
      } catch {
        /* badge is best-effort; never surface an error for it */
      }
    };
    const schedule = () => {
      timer = window.setTimeout(async () => {
        if (!document.hidden) await check();
        schedule();
      }, BADGE_MS);
    };
    check();
    schedule();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  // Escape closes the mobile menu; body scroll is locked while it is open.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [menuOpen]);

  const links = (extraClass = '') =>
    NAV.map(({ to, label, icon: Icon, end, chat }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        className={extraClass}
        onClick={() => setMenuOpen(false)}
      >
        <Icon size={16} aria-hidden="true" />
        <span>{label}</span>
        {chat && chatUnread > 0 && (
          <span className="admin__nav-badge">{chatUnread > 99 ? '99+' : chatUnread}</span>
        )}
      </NavLink>
    ));

  return (
    <div className="admin">
      <header className="admin__bar">
        <div className="admin__bar-inner">
          <button
            type="button"
            className="admin__burger"
            aria-label="Open admin menu"
            aria-expanded={menuOpen}
            aria-controls="admin-menu"
            onClick={() => setMenuOpen(true)}
          >
            <FiMenu size={20} aria-hidden="true" />
          </button>

          <Link to="/admin" className="brand admin__brand">
            <span className="brand__mark" aria-hidden="true">
              E
            </span>
            <span className="admin__name">EShopping</span>
            <span className="admin__badge">Admin</span>
          </Link>

          <nav className="admin__nav" aria-label="Admin sections">
            {links()}
          </nav>

          <div className="admin__who">
            <ThemeToggle variant="icon" className="admin__theme" />
            <span className="admin__user" title={user?.email || user?.mobile || ''}>
              {user?.name}
            </span>
            <button type="button" className="btn btn-ghost btn-sm admin__out" onClick={handleSignOut}>
              <FiLogOut size={14} aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="admin__backdrop" role="presentation" onClick={() => setMenuOpen(false)} />
      )}
      <div
        className={`admin__drawer ${menuOpen ? 'is-open' : ''}`}
        id="admin-menu"
        role="dialog"
        aria-modal={menuOpen ? 'true' : undefined}
        aria-label="Admin sections"
        {...(menuOpen ? {} : { inert: '' })}
      >
        <div className="admin__drawer-head">
          <span>Sections</span>
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <FiX size={18} aria-hidden="true" />
          </button>
        </div>
        <nav className="admin__drawer-nav" aria-label="Admin sections (menu)">
          {links()}
        </nav>
        <div className="admin__drawer-foot">
          <button type="button" onClick={handleSignOut}>
            <FiLogOut size={14} aria-hidden="true" /> Sign out
          </button>
        </div>
      </div>

      <main className="admin__main">{children}</main>

      <footer className="admin__foot">
        <span>EShopping admin · signed in as {user?.email || user?.mobile}</span>
        <span>Administrator sessions expire automatically.</span>
      </footer>
    </div>
  );
}