import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiArrowRight, FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi';
import { fetchCart, updateCartItem, removeCartItem } from '../services/cart';
import { formatPrice } from '../utils/format';

export default function Cart() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setCart(await fetchCart());
    } catch (err) {
      setError(err.message || 'We could not load your cart.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeQty = async (item, next) => {
    if (next < 1 || busyId) return;
    if (next > item.stock) {
      toast.error(`Only ${item.stock} left in stock`);
      return;
    }
    setBusyId(item.id);
    try {
      setCart(await updateCartItem(item.id, next));
    } catch (err) {
      toast.error(err.message || 'Could not update the quantity.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      setCart(await removeCartItem(item.id));
      toast.success('Item removed from your cart');
    } catch (err) {
      toast.error(err.message || 'Could not remove the item.');
    } finally {
      setBusyId(null);
    }
  };

  const items = cart?.items || [];
  const itemCount = Number(cart?.itemCount) || 0;
  const subtotal = Number(cart?.subtotal) || 0;
  const savings = Number(cart?.savings) || 0;

  return (
    <div className="container page cart-page">
      <Helmet>
        <title>Shopping Cart - {import.meta.env.VITE_STORE_NAME || 'EShopping'}</title>
      </Helmet>

      <div className="page__head">
        <h1>Your cart</h1>
        <p className="muted">
          {loading ? 'Loading…' : `${itemCount} item${itemCount === 1 ? '' : 's'} in your cart`}
        </p>
      </div>

      {loading && (
        <div className="state" role="status">
          <p>Loading your cart…</p>
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
          <p>Your cart is empty.</p>
          <Link to="/shop" className="btn btn--primary">
            Continue shopping
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="cart-layout">
          <div className="cart-list">
            {cart.hasStockIssue && (
              <p className="cart-warning" role="alert">
                Some items in your cart exceed the available stock. Please review the quantities.
              </p>
            )}

            {items.map((item) => (
              <article key={item.id} className="cart-item">
                <Link to={`/product/${item.slug}`} className="cart-item__media">
                  <img src={item.image} alt={item.name} loading="lazy" />
                </Link>

                <div className="cart-item__body">
                  <div className="cart-item__top">
                    <div>
                      <Link to={`/product/${item.slug}`} className="cart-item__name">
                        {item.name}
                      </Link>
                      <p className="cart-item__unit">{formatPrice(item.unitPrice)} each</p>
                    </div>
                    <button
                      type="button"
                      className="cart-item__remove"
                      aria-label={`Remove ${item.name} from cart`}
                      onClick={() => remove(item)}
                      disabled={busyId === item.id}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>

                  <div className="cart-item__bottom">
                    <div className="qty" role="group" aria-label={`Quantity of ${item.name}`}>
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => changeQty(item, item.quantity - 1)}
                        disabled={busyId === item.id || item.quantity <= 1}
                      >
                        <FiMinus size={13} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => changeQty(item, item.quantity + 1)}
                        disabled={busyId === item.id || item.quantity >= item.stock}
                      >
                        <FiPlus size={13} />
                      </button>
                    </div>
                    <strong className="cart-item__line">{formatPrice(item.lineTotal)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="cart-summary">
            <h2>Order summary</h2>
            <div className="cart-summary__row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {savings > 0 && (
              <div className="cart-summary__row cart-summary__row--savings">
                <span>You save</span>
                <span>-{formatPrice(savings)}</span>
              </div>
            )}
            <div className="cart-summary__row cart-summary__row--total">
              <span>Total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <p className="cart-summary__note">Delivery fee is calculated at checkout.</p>

            <Link to="/checkout" className="btn btn--primary btn--block">
              Proceed to checkout <FiArrowRight size={16} />
            </Link>
            <Link to="/shop" className="btn btn--ghost btn--block">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
