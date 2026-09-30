import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiHeart, FiShoppingCart } from 'react-icons/fi';
import { fetchWishlist, removeFromWishlist, moveToCart } from '../services/wishlist';
import { formatPrice } from '../utils/format';

export default function Wishlist() {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setProducts(await fetchWishlist());
    } catch (err) {
      setError(err.message || 'We could not load your wishlist.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (product) => {
    if (busyId) return;
    setBusyId(product.id);
    try {
      await removeFromWishlist(product.id);
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      toast.success('Removed from your wishlist');
    } catch (err) {
      toast.error(err.message || 'Could not update your wishlist.');
    } finally {
      setBusyId(null);
    }
  };

  const move = async (product) => {
    if (busyId) return;
    setBusyId(product.id);
    try {
      await moveToCart(product.id);
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      toast.success('Moved to your cart');
    } catch (err) {
      toast.error(err.message || 'Could not move the item to your cart.');
    } finally {
      setBusyId(null);
    }
  };

  const items = products || [];

  return (
    <div className="container page wishlist-page">
      <Helmet>
        <title>My Wishlist - {import.meta.env.VITE_STORE_NAME || 'EShopping'}</title>
      </Helmet>

      <div className="page__head">
        <h1>My wishlist</h1>
        <p className="muted">
          {loading ? 'Loading…' : `${items.length} saved item${items.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {loading && (
        <div className="state" role="status">
          <p>Loading your wishlist…</p>
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

      {!loading && !error && items.length === 0 && (
        <div className="state">
          <p>Your wishlist is empty.</p>
          <Link to="/shop" className="btn btn--primary">
            Continue shopping
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="wish-grid">
          {items.map((product) => (
            <article key={product.id} className="wish-card">
              <Link to={`/product/${product.slug}`} className="wish-card__media">
                <img src={product.image} alt={product.name} loading="lazy" />
              </Link>

              <div className="wish-card__body">
                <Link to={`/product/${product.slug}`} className="wish-card__name">
                  {product.name}
                </Link>
                <p className="wish-card__price">
                  <strong>{formatPrice(product.sale_price)}</strong>
                  {Number(product.original_price) > Number(product.sale_price) && (
                    <s>{formatPrice(product.original_price)}</s>
                  )}
                  {Number(product.stock) <= 0 && <span className="wish-card__stock">Out of stock</span>}
                </p>

                <div className="wish-card__actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => move(product)}
                    disabled={busyId === product.id || Number(product.stock) <= 0}
                  >
                    <FiShoppingCart size={14} /> Move to cart
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => remove(product)}
                    disabled={busyId === product.id}
                    aria-label={`Remove ${product.name} from wishlist`}
                  >
                    <FiHeart size={14} /> Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
