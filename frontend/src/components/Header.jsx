import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiSearch, FiHeart, FiShoppingCart, FiUser, FiMenu, FiX, FiChevronDown, FiLogOut } from 'react-icons/fi';
import useAuth from '../context/useAuth';
import { fetchCartCount } from '../services/cart';

/** Account menu entries per auth state (the guest menu is deliberately short). */
const GUEST_MENU = [
  { to: '/login', label: 'Sign in' },
  { to: '/register', label: 'Create account' },
];
const MEMBER_MENU = [
  { to: '/profile', label: 'My account' },
  { to: '/orders', label: 'My orders' },
  { to: '/cart', label: 'Cart' },
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/track-order', label: 'Track order' },
];

export default function Header({ store, categories }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const navigate = useNavigate();
  const { user, booting, signOut } = useAuth();

  // Everything the account UI shows is derived from the session state: while
  // it is still being resolved nothing authenticated is rendered.
  const signedIn = !booting && Boolean(user);
  const menuItems = booting ? [] : signedIn ? MEMBER_MENU : GUEST_MENU;

  // Live cart badge: fetched once per session, then kept in step through the
  // `eshopping:cart-changed` event dispatched by every cart mutation. A guest
  // never triggers a request.
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (!signedIn) {
      setCartCount(0);
      return undefined;
    }
    let alive = true;
    const apply = (count) => {
      if (alive) setCartCount(Number(count) || 0);
    };
    const refresh = () => {
      fetchCartCount().then(apply).catch(() => {});
    };
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

  // The search box only routes; the listing page performs the query.
  const submitSearch = (event) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    navigate(`/shop?q=${encodeURIComponent(term)}`);
  };

  const closeMenu = () => {
    setOpen(false);
    setCatsOpen(false);
    setAccountOpen(false);
  };

  // Close the account dropdown on outside click or Escape.
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

  const handleSignOut = () => {
    closeMenu();
    signOut();
  };

  const nav = categories || [];

  return (
    <header className="header">
      <div className="container header__main">
        <button
          type="button"
          className="header__burger"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>

        <Link to="/" className="brand">
          {store?.logo ? (
            <img className="brand__logo" src={store.logo} alt="" />
          ) : (
            <span className="brand__mark">E</span>
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
          />
          <button type="submit" aria-label="Search">
            <FiSearch size={17} />
          </button>
        </form>

        <div className="header__actions">
          {signedIn && (
            <>
              <Link to="/wishlist" className="icon-btn" aria-label="Wishlist">
                <FiHeart size={19} />
                <span className="icon-btn__label">Wishlist</span>
              </Link>
              <Link
                to="/cart"
                className="icon-btn"
                aria-label={cartCount > 0 ? `Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Cart'}
              >
                <span className="icon-btn__icon">
                  <FiShoppingCart size={19} />
                  {cartCount > 0 && <span className="icon-btn__badge">{cartCount > 99 ? '99+' : cartCount}</span>}
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
              <FiUser size={19} />
              <span className="icon-btn__label header__account-label">
                {signedIn ? user.name.split(' ')[0] : 'Account'}
                <FiChevronDown size={12} />
              </span>
            </button>

            <div className="header__account-panel" role="menu">
              {booting ? (
                <p className="header__account-note" role="status">
                  Checking your session…
                </p>
              ) : (
                <>
                  {menuItems.map((item) => (
                    <Link key={item.to} to={item.to} role="menuitem" onClick={closeMenu}>
                      {item.label}
                    </Link>
                  ))}
                  {signedIn && (
                    <>
                      <span className="header__account-sep" role="separator" />
                      <button type="button" role="menuitem" aria-label="Sign out" onClick={handleSignOut}>
                        <FiLogOut size={14} /> Sign out
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <nav className={`header__nav ${open ? 'is-open' : ''}`}>
        <div className="container header__nav-inner">
          <NavLink to="/" end onClick={closeMenu}>
            Home
          </NavLink>
          <NavLink to="/shop" onClick={closeMenu}>
            Shop
          </NavLink>
          <div className={`nav-dropdown ${catsOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="nav-dropdown__toggle"
              aria-expanded={catsOpen}
              onClick={() => setCatsOpen((v) => !v)}
            >
              Categories <FiChevronDown size={13} />
            </button>
            <div className="nav-dropdown__panel">
              <NavLink to="/shop" onClick={closeMenu}>
                All categories
              </NavLink>
              {nav.map((category) => (
                <NavLink key={category.id} to={`/category/${category.slug}`} onClick={closeMenu}>
                  {category.name}
                </NavLink>
              ))}
            </div>
          </div>
          <NavLink to="/offers" onClick={closeMenu}>
            Offers
          </NavLink>

          {!booting && (
            <div className="header__nav-account">
              {signedIn ? (
                <NavLink to="/profile" onClick={closeMenu}>
                  My account
                </NavLink>
              ) : (
                <NavLink to="/login" onClick={closeMenu}>
                  Sign in
                </NavLink>
              )}
              {signedIn &&
                MEMBER_MENU.filter((item) => item.to !== '/profile').map((item) => (
                  <NavLink key={item.to} to={item.to} onClick={closeMenu}>
                    {item.label}
                  </NavLink>
                ))}
              {!signedIn && (
                <NavLink to="/register" onClick={closeMenu}>
                  Create account
                </NavLink>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
