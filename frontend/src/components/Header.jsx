import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  FiChevronDown,
  FiChevronRight,
  FiGrid,
  FiHeart,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiPackage,
  FiSearch,
  FiShoppingCart,
  FiTruck,
  FiUser,
} from 'react-icons/fi';
import useAuth from '../context/useAuth';
import { fetchCartCount } from '../services/cart';
import { fetchChatUnread } from '../services/chat';
import Overlay, { ModalHead } from './ui/Overlay';
import ThemeToggle from './ui/ThemeToggle';
import BrandMark from './BrandMark';

const GUEST_MENU = [
  { to: '/login', label: 'Sign in', icon: FiUser },
  { to: '/register', label: 'Create account', icon: FiUser },
];

const MEMBER_MENU = [
  { to: '/profile', label: 'My account', icon: FiUser },
  { to: '/orders', label: 'My orders', icon: FiPackage },
  { to: '/track-order', label: 'Track order', icon: FiTruck },
  { to: '/wishlist', label: 'Wishlist', icon: FiHeart },
  { to: '/chat', label: 'Chat with us', icon: FiMessageSquare },
];

/** First badge refresh is delayed so page loads stay cheap. */
const CHAT_FIRST_MS = 3000;
const CHAT_POLL_MS = 60000;

/**
 * Storefront header.
 *
 * One `<a class="skip-link">` at the top of the document lets keyboard users
 * jump past the nav. Search is a real form with its own label, every icon-only
 * control carries an aria-label, and the phone menu is a focus-trapping dialog
 * rather than an off-canvas panel that leaves focus stranded behind it.
 */
export default function Header({ store, categories }) {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const accountRef = useRef(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const { user, booting, signOut } = useAuth();

  const signedIn = !booting && Boolean(user);
  const menuItems = booting ? [] : signedIn ? MEMBER_MENU : GUEST_MENU;

  // The header gains a shadow once the page scrolls under it.
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Live cart badge: fetched once per session, then kept in step through the
  // `eshopping:cart-changed` event dispatched by every cart mutation.
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (!signedIn) {
      setCartCount(0);
      return undefined;
    }
    let alive = true;
    const apply = (count) => {
      if (!alive) return;
      const next = Number(count) || 0;
      setCartCount((prev) => {
        // Bump the badge only when the number actually changed.
        if (prev === next) return prev;
        window.requestAnimationFrame(() => {
          const node = document.querySelector('[data-cart-badge]');
          node?.classList.remove('is-bump');
          void node?.offsetWidth;
          node?.classList.add('is-bump');
        });
        return next;
      });
    };
    const refresh = () => fetchCartCount().then(apply).catch(() => {});
    const onCartChanged = (event) => {
      const count = event?.detail?.count;
      if (typeof count === 'number') apply(count);
      else refresh();
    };

    refresh();
    window.addEventListener('eshopping:cart-changed', onCartChanged);
    return () => {
      alive = false;
      window.removeEventListener('eshopping:cart-changed', onCartChanged);
    };
  }, [signedIn]);

  // Unread support messages badge: one delayed request, then a slow poll that
  // sleeps while the tab is hidden (never floods the API).
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    if (!signedIn) {
      setChatUnread(0);
      return undefined;
    }
    let alive = true;
    let timer = null;
    const apply = (value) => {
      if (alive) setChatUnread(Number(value) || 0);
    };
    const refresh = () => fetchChatUnread().then(apply).catch(() => {});
    const schedule = (delay) => {
      timer = window.setTimeout(() => {
        if (!document.hidden) refresh();
        schedule(CHAT_POLL_MS);
      }, delay);
    };
    const onUnread = (event) => apply(event?.detail?.unread);

    schedule(CHAT_FIRST_MS);
    window.addEventListener('eshopping:chat-unread', onUnread);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.removeEventListener('eshopping:chat-unread', onUnread);
    };
  }, [signedIn]);

  const closeAll = () => {
    setMenuOpen(false);
    setAccountOpen(false);
    setSearchOpen(false);
  };

  // Search routes only; the listing page runs the query.
  const submitSearch = (event) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    setSearchOpen(false);
    navigate(`/shop?q=${encodeURIComponent(term)}`);
  };

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!accountOpen) return undefined;
    const onDocClick = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  // Focus the field when the phone search sheet opens.
  useEffect(() => {
    if (searchOpen) window.setTimeout(() => searchRef.current?.focus(), 60);
  }, [searchOpen]);

  const handleSignOut = () => {
    closeAll();
    signOut();
  };

  const nav = categories || [];
  const firstName = user?.name ? String(user.name).split(' ')[0] : '';

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className={`header ${stuck ? 'is-stuck' : ''}`}>
        <div className="container header__main">
          <button
            type="button"
            className="header__burger"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            <FiMenu size={20} aria-hidden="true" />
          </button>

          <Link to="/" className="brand" aria-label={`${store?.storeName || 'EShopping'} home`}>
            {store?.logo ? (
              <img className="brand__logo" src={store.logo} alt="" />
            ) : (
              <span className="brand__mark" aria-hidden="true">
                <BrandMark />
              </span>
            )}
            <span className="brand__name">{store?.storeName || 'EShopping'}</span>
          </Link>

          <form className="search" onSubmit={submitSearch} role="search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, brands and categories"
              aria-label="Search products"
              enterKeyHint="search"
            />
            <button type="submit" aria-label="Search">
              <FiSearch size={16} aria-hidden="true" />
            </button>
          </form>

          <div className="header__actions">
            <button
              type="button"
              className="icon-btn header__search-btn"
              aria-label="Search"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <FiSearch className="icon-btn__icon" aria-hidden="true" />
              <span className="icon-btn__label">Search</span>
            </button>

            <ThemeToggle variant="icon" className="header__theme" />

            {signedIn && (
              <Link
                to="/chat"
                className="icon-btn"
                aria-label={chatUnread > 0 ? `Support chat, ${chatUnread} unread` : 'Support chat'}
              >
                <span className="icon-btn__icon">
                  <FiMessageSquare size={19} aria-hidden="true" />
                  {chatUnread > 0 && (
                    <span className="icon-btn__badge">{chatUnread > 99 ? '99+' : chatUnread}</span>
                  )}
                </span>
                <span className="icon-btn__label">Chat</span>
              </Link>
            )}

            {signedIn && (
              <>
                <Link to="/wishlist" className="icon-btn" aria-label="Wishlist">
                  <FiHeart className="icon-btn__icon" aria-hidden="true" />
                  <span className="icon-btn__label">Wishlist</span>
                </Link>
                <Link
                  to="/cart"
                  className="icon-btn"
                  aria-label={cartCount > 0 ? `Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Cart'}
                >
                  <span className="icon-btn__icon">
                    <FiShoppingCart size={19} aria-hidden="true" />
                    {cartCount > 0 && (
                      <span className="icon-btn__badge" data-cart-badge="true">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </span>
                  <span className="icon-btn__label">Cart</span>
                </Link>
              </>
            )}

            <div className={`header__account ${accountOpen ? 'is-open' : ''}`} ref={accountRef}>
              <button
                type="button"
                className="icon-btn header__account-btn"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((v) => !v)}
              >
                <FiUser className="icon-btn__icon" aria-hidden="true" />
                <span className="icon-btn__label header__account-label">
                  {signedIn ? firstName : 'Account'}
                  <FiChevronDown size={12} aria-hidden="true" />
                </span>
              </button>

              {accountOpen && (
                <div className="header__account-panel" role="menu">
                  {booting ? (
                    <p className="header__account-note" role="status">
                      Checking your session…
                    </p>
                  ) : (
                    <>
                      {menuItems.map((item) => {
                        const Icon = item.icon || FiUser;
                        return (
                          <Link key={item.to} to={item.to} role="menuitem" onClick={closeAll}>
                            <Icon size={15} aria-hidden="true" /> {item.label}
                          </Link>
                        );
                      })}
                      <span className="header__account-sep" role="separator" />
                      <span className="dropdown-label">Appearance</span>
                      <ThemeToggle variant="menu" />
                      {signedIn && (
                        <>
                          <span className="header__account-sep" role="separator" />
                          <button type="button" role="menuitem" onClick={handleSignOut}>
                            <FiLogOut size={14} aria-hidden="true" /> Sign out
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="header__nav" aria-label="Primary">
          <div className="container header__nav-inner">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/shop">Shop</NavLink>
            <NavLink to="/category/all">Categories</NavLink>
            <NavLink to="/offers">Offers</NavLink>
            {signedIn && <NavLink to="/track-order">Track order</NavLink>}
            <NavLink to="/chat">Support</NavLink>
          </div>
        </nav>
      </header>

      {/* ---- phone menu: a real dialog so focus is never stranded ------- */}
      <Overlay
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        variant="drawer"
        size="sm"
        className="drawer-left"
      >
        <ModalHead title={store?.storeName || 'EShopping'} subtitle="Browse the store" onClose={() => setMenuOpen(false)} />
        <div className="drawer-body">
            <nav className="header__drawer-nav" aria-label="Store sections">
              <NavLink to="/" end onClick={closeAll}>
                <FiGrid aria-hidden="true" /> Home
              </NavLink>
              <NavLink to="/shop" onClick={closeAll}>
                <FiSearch aria-hidden="true" /> Shop all
              </NavLink>
              <NavLink to="/offers" onClick={closeAll}>
                <FiShoppingCart aria-hidden="true" /> Special offers
              </NavLink>
              {signedIn && (
                <NavLink to="/track-order" onClick={closeAll}>
                  <FiTruck aria-hidden="true" /> Track order
                </NavLink>
              )}
            </nav>

            {nav.length > 0 && (
              <>
                <p className="dropdown-label header__drawer-label">Categories</p>
                <nav className="header__drawer-nav" aria-label="Categories">
                  {nav.slice(0, 8).map((category) => (
                    <NavLink key={category.id} to={`/category/${category.slug}`} onClick={closeAll}>
                      <FiChevronRight aria-hidden="true" /> {category.name}
                    </NavLink>
                  ))}
                </nav>
              </>
            )}

            {!booting && (
              <>
                <p className="dropdown-label header__drawer-label">Account</p>
                <nav className="header__drawer-nav" aria-label="Account">
                  {menuItems.map((item) => {
                    const Icon = item.icon || FiUser;
                    return (
                      <NavLink key={item.to} to={item.to} onClick={closeAll}>
                        <Icon aria-hidden="true" /> {item.label}
                      </NavLink>
                    );
                  })}
                  {signedIn && (
                    <button type="button" className="header__drawer-signout" onClick={handleSignOut}>
                      <FiLogOut aria-hidden="true" /> Sign out
                    </button>
                  )}
                </nav>
              </>
            )}

            <div className="header__drawer-theme">
              <span className="dropdown-label">Appearance</span>
              <ThemeToggle variant="menu" />
            </div>
        </div>
      </Overlay>

      {/* ---- phone search sheet ----------------------------------------- */}
      <Overlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        variant="backdrop"
        size="sm"
      >
        <ModalHead title="Search" onClose={() => setSearchOpen(false)} />
        <div className="modal-body">
          <form className="header__sheet-search" onSubmit={submitSearch} role="search">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products and categories"
              aria-label="Search products"
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
          <p className="hint" style={{ marginTop: 'var(--sp-3)' }}>
            Try a brand, a category, or a product name.
          </p>
        </div>
      </Overlay>
    </>
  );
}