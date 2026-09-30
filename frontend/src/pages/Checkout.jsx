import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiLock, FiShoppingBag } from 'react-icons/fi';
import useAuth from '../context/useAuth';
import { fetchOrders, previewCheckout, createOrder } from '../services/orders';
import { formatPrice } from '../utils/format';

const ZONES = [
  { value: 'inside_dhaka', label: 'Inside Dhaka' },
  { value: 'outside_dhaka', label: 'Outside Dhaka' },
];

/** Manual checkout: the methods the store is configured for (no gateway). */
const PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on Delivery', hint: 'Pay in cash when your order arrives.' },
];

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  area: '',
  notes: '',
};

const normalisePhone = (value) => {
  let phone = String(value || '').replace(/[\s\-()]/g, '');
  if (phone.startsWith('+880')) phone = `0${phone.slice(4)}`;
  else if (phone.startsWith('880') && phone.length === 13) phone = `0${phone.slice(3)}`;
  return phone;
};

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

/** Mirrors the rules the API enforces so mistakes are caught before the request. */
function validate(form) {
  const errors = {};
  const name = form.name.trim();
  const address = form.address.trim();

  if (!name) errors.name = 'This field is required';
  else if (name.length < 2) errors.name = 'Enter your full name';

  const phone = normalisePhone(form.phone);
  if (!phone) errors.phone = 'This field is required';
  else if (!/^01[3-9]\d{8}$/.test(phone)) errors.phone = 'Enter a valid mobile number (e.g. 01712345678)';

  if (form.email.trim() && !isEmail(form.email.trim())) errors.email = 'Enter a valid email address';

  if (!address) errors.address = 'This field is required';
  else if (address.length < 5) errors.address = 'Enter your full delivery address';

  if (!form.city.trim()) errors.city = 'This field is required';
  if (!form.area.trim()) errors.area = 'This field is required';
  if (form.notes.length > 1000) errors.notes = 'Must be at most 1000 characters';

  return errors;
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [zone, setZone] = useState('inside_dhaka');
  const [payment, setPayment] = useState('cod');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applying, setApplying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // React state only updates after the render that follows an event, so a
  // second click landing in the same tick would still read `submitting ===
  // false`. This ref flips synchronously and is what actually blocks a
  // duplicate order.
  const submittingRef = useRef(false);

  // Signed-in customers start from their account details, falling back to the
  // shipping details of their last order when the profile has none yet.
  useEffect(() => {
    let alive = true;
    const next = {
      name: user?.name || '',
      phone: user?.mobile || '',
      email: user?.email || '',
      address: user?.address || '',
      city: user?.city || '',
      area: user?.area || '',
      notes: '',
    };

    const fill = async () => {
      if (next.address && next.city && next.area) {
        if (alive) setForm(next);
        return;
      }
      try {
        const recent = await fetchOrders({ limit: 1, page: 1 });
        const last = recent?.orders?.[0];
        if (last && alive) {
          setForm({
            ...next,
            name: next.name || last.customer_name || '',
            phone: next.phone || last.customer_phone || '',
            address: next.address || last.customer_address || '',
            city: next.city || last.city || '',
            area: next.area || last.area || '',
          });
          return;
        }
      } catch {
        /* the account details alone are enough */
      }
      if (alive) setForm(next);
    };

    fill();
    return () => {
      alive = false;
    };
  }, [user]);

  // Totals always come from the API: re-priced whenever the delivery zone or
  // the applied coupon changes.
  useEffect(() => {
    let alive = true;
    const run = async () => {
      setRefreshing(true);
      setBanner('');
      try {
        const data = await previewCheckout({
          deliveryZone: zone,
          ...(coupon ? { couponCode: coupon } : {}),
        });
        if (!alive) return;
        setSummary(data);
        if (data?.coupon?.code) setCouponInput(data.coupon.code);
      } catch (err) {
        if (!alive) return;
        if (/cart is empty|nothing to check out/i.test(err.message || '')) {
          setSummary(null);
        } else {
          setSummary(null);
          setBanner(err.message || 'We could not load your order summary.');
        }
      } finally {
        if (alive) {
          setRefreshing(false);
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [zone, coupon]);

  const setField = (key) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // The coupon control is deliberately not a <form>: it lives inside the
  // checkout form and a nested <form> would submit the page instead of
  // running this handler.
  const applyCoupon = async (event) => {
    event?.preventDefault?.();
    const code = couponInput.trim();
    if (!code || applying) return;

    setApplying(true);
    setCouponError('');
    try {
      const data = await previewCheckout({ deliveryZone: zone, couponCode: code });
      if (!data?.coupon) throw new Error('That coupon could not be applied');
      setSummary(data);
      setCoupon(data.coupon.code);
      setCouponInput(data.coupon.code);
      toast.success(`Coupon ${data.coupon.code} applied`);
    } catch (err) {
      setCouponError(err.message || 'That coupon could not be applied.');
      setCoupon('');
      setCouponInput('');
      toast.error(err.message || 'That coupon could not be applied.');
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = () => {
    setCoupon('');
    setCouponInput('');
    setCouponError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    // Ref guard first: a double click can land before React re-renders the
    // disabled button, so state alone cannot stop a duplicate order.
    if (submittingRef.current || submitting) return;

    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error('Please correct the highlighted fields');
      const first = document.querySelector('.field--invalid input, .field--invalid textarea');
      if (first) first.focus();
      return;
    }

    if (!summary?.items?.length) {
      toast.error('Your cart is empty');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setBanner('');
    try {
      const { order, message } = await createOrder({
        name: form.name.trim(),
        phone: normalisePhone(form.phone),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        address: form.address.trim(),
        city: form.city.trim(),
        area: form.area.trim(),
        deliveryZone: zone,
        ...(coupon ? { couponCode: coupon } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        paymentMethod: payment,
      });

      // The backend cleared the cart with the order - only now do we tell the
      // header badge and the cart cache about it.
      window.dispatchEvent(
        new CustomEvent('eshopping:cart-changed', { detail: { count: 0 } })
      );
      toast.success(message || 'Order placed successfully');
      navigate(order?.id ? `/orders/${order.id}` : '/orders', { replace: true });
    } catch (err) {
      const fieldErrors = err.payload?.errors || {};
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      const extra = ['deliveryZone', 'paymentMethod']
        .map((key) => fieldErrors[key])
        .filter(Boolean)
        .join(' ');
      const text = extra || err.message || 'We could not place your order.';
      setBanner(text);
      toast.error(text);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const items = summary?.items || [];
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const emptyCart = !loading && !banner && items.length === 0;

  return (
    <div className="container page checkout-page">
      <Helmet>
        <title>Checkout - {import.meta.env.VITE_STORE_NAME || 'EShopping'}</title>
      </Helmet>

      <div className="page__head page__head--split">
        <div>
          <h1>Checkout</h1>
          <p className="muted">
            {loading
              ? 'Loading your order…'
              : `${itemCount} item${itemCount === 1 ? '' : 's'} · confirm your details and place the order`}
          </p>
        </div>
        <Link to="/cart" className="btn btn--ghost">
          <FiArrowLeft size={15} /> Back to cart
        </Link>
      </div>

      {loading && (
        <div className="state" role="status">
          <p>Loading your order summary…</p>
        </div>
      )}

      {!loading && emptyCart && (
        <div className="state">
          <p>Your cart is empty.</p>
          <div className="state__actions">
            <Link to="/shop" className="btn btn--primary">
              Continue shopping
            </Link>
            <Link to="/cart" className="btn btn--ghost">
              View cart
            </Link>
          </div>
        </div>
      )}

      {!loading && !emptyCart && (
        <form className="checkout-layout" onSubmit={submit} noValidate>
          <div className="checkout-main">
            {banner && (
              <div className="alert alert--error" role="alert">
                {banner}
              </div>
            )}

            <section className="checkout-panel">
              <h2>Customer information</h2>
              <p className="checkout-panel__hint">
                Loaded from your account - update anything that changed before you order.
              </p>

              <div className="checkout-grid">
                <label className={`field ${errors.name ? 'field--invalid' : ''}`}>
                  <span>Full name</span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={setField('name')}
                    placeholder="Your full name"
                  />
                  {errors.name && <em className="field__error">{errors.name}</em>}
                </label>

                <div className="form-row">
                  <label className={`field ${errors.phone ? 'field--invalid' : ''}`}>
                    <span>Mobile number</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={14}
                      autoComplete="tel"
                      value={form.phone}
                      onChange={setField('phone')}
                      placeholder="01712345678"
                    />
                    {errors.phone && <em className="field__error">{errors.phone}</em>}
                  </label>

                  <label className={`field ${errors.email ? 'field--invalid' : ''}`}>
                    <span>Email (optional)</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={setField('email')}
                      placeholder="you@example.com"
                    />
                    {errors.email && <em className="field__error">{errors.email}</em>}
                  </label>
                </div>

                <label className={`field ${errors.address ? 'field--invalid' : ''}`}>
                  <span>Delivery address</span>
                  <input
                    type="text"
                    autoComplete="street-address"
                    value={form.address}
                    onChange={setField('address')}
                    placeholder="House, road, area"
                  />
                  {errors.address && <em className="field__error">{errors.address}</em>}
                </label>

                <div className="form-row">
                  <label className={`field ${errors.city ? 'field--invalid' : ''}`}>
                    <span>City / area</span>
                    <input
                      type="text"
                      autoComplete="address-level2"
                      value={form.city}
                      onChange={setField('city')}
                      placeholder="Dhaka"
                    />
                    {errors.city && <em className="field__error">{errors.city}</em>}
                  </label>

                  <label className={`field ${errors.area ? 'field--invalid' : ''}`}>
                    <span>Area / locality</span>
                    <input
                      type="text"
                      value={form.area}
                      onChange={setField('area')}
                      placeholder="Banani"
                    />
                    {errors.area && <em className="field__error">{errors.area}</em>}
                  </label>
                </div>

                <label className={`field ${errors.notes ? 'field--invalid' : ''}`}>
                  <span>Order notes (optional)</span>
                  <textarea
                    rows={3}
                    maxLength={1200}
                    value={form.notes}
                    onChange={setField('notes')}
                    placeholder="Anything the rider should know?"
                  />
                  {errors.notes && <em className="field__error">{errors.notes}</em>}
                </label>
              </div>
            </section>

            <section className="checkout-panel">
              <h2>Delivery</h2>
              <p className="checkout-panel__hint">
                The delivery charge is recalculated for the zone you pick.
              </p>
              <div className="checkout-options">
                {ZONES.map((option) => (
                  <label
                    key={option.value}
                    className={`checkout-option ${zone === option.value ? 'checkout-option--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="delivery-zone"
                      value={option.value}
                      checked={zone === option.value}
                      onChange={() => setZone(option.value)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <span>
                        {option.value === 'inside_dhaka'
                          ? 'Delivered across the city'
                          : 'Delivered anywhere outside the city'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="checkout-panel">
              <h2>Payment method</h2>
              <p className="checkout-panel__hint">
                This store collects payment on delivery - no online payment is required.
              </p>
              <div className="checkout-options">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`checkout-option ${payment === method.value ? 'checkout-option--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={method.value}
                      checked={payment === method.value}
                      onChange={() => setPayment(method.value)}
                    />
                    <span>
                      <strong>{method.label}</strong>
                      <span>{method.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <aside className="cart-summary checkout-summary">
            <h2>Order summary</h2>

            <div className="checkout-summary__items">
              {items.map((item) => (
                <article key={item.productId} className="checkout-line">
                  <Link to={`/product/${item.slug}`} className="checkout-line__media">
                    {item.image ? (
                      <img src={item.image} alt={item.name} loading="lazy" />
                    ) : (
                      <span className="checkout-line__placeholder">No image</span>
                    )}
                  </Link>
                  <div className="checkout-line__body">
                    <Link to={`/product/${item.slug}`} className="checkout-line__name">
                      {item.name}
                    </Link>
                    <p className="checkout-line__meta">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <strong className="checkout-line__total">{formatPrice(item.lineTotal)}</strong>
                </article>
              ))}
            </div>

            <div className="checkout-coupon">
              <input
                type="text"
                value={couponInput}
                onChange={(event) => {
                  setCouponInput(event.target.value.toUpperCase());
                  setCouponError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applyCoupon();
                  }
                }}
                placeholder="Coupon code"
                aria-label="Coupon code"
              />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={applyCoupon}
                disabled={applying || !couponInput.trim()}
              >
                {applying ? 'Checking…' : 'Apply'}
              </button>
            </div>
            {couponError && <p className="checkout-coupon__error">{couponError}</p>}
            {coupon && !couponError && (
              <p className="checkout-coupon__applied">
                Coupon <strong>{coupon}</strong> applied ·{' '}
                <button type="button" onClick={removeCoupon}>
                  Remove
                </button>
              </p>
            )}

            <div className="cart-summary__row">
              <span>Subtotal ({itemCount} item{itemCount === 1 ? '' : 's'})</span>
              <span>{formatPrice(summary?.subtotal)}</span>
            </div>
            {Number(summary?.productSavings) > 0 && (
              <div className="cart-summary__row cart-summary__row--savings">
                <span>You save</span>
                <span>-{formatPrice(summary.productSavings)}</span>
              </div>
            )}
            {Number(summary?.discount) > 0 && (
              <div className="cart-summary__row cart-summary__row--savings">
                <span>Coupon discount</span>
                <span>-{formatPrice(summary.discount)}</span>
              </div>
            )}
            <div className="cart-summary__row">
              <span>Delivery ({ZONES.find((z) => z.value === zone)?.label})</span>
              <span>
                {Number(summary?.deliveryFee) === 0 ? 'Free' : formatPrice(summary?.deliveryFee)}
              </span>
            </div>
            <div className="cart-summary__row cart-summary__row--total">
              <span>Total</span>
              <strong>{formatPrice(summary?.total)}</strong>
            </div>

            <p className="cart-summary__note">
              {Number(summary?.freeDeliveryOver) > 0 &&
              Number(summary?.subtotal) < Number(summary?.freeDeliveryOver)
                ? `Free delivery on orders over ${formatPrice(summary.freeDeliveryOver)}.`
                : 'Delivery charge is included in the total above.'}
            </p>

            <button
              type="submit"
              className="btn btn--primary btn--block checkout-summary__place"
              disabled={submitting || refreshing || items.length === 0}
            >
              {submitting ? (
                'Placing your order…'
              ) : (
                <>
                  <FiLock size={15} /> Place Order
                </>
              )}
            </button>

            <p className="checkout-summary__secure">
              <FiShoppingBag size={14} /> Your order is created only after the server confirms it.
            </p>
          </aside>
        </form>
      )}
    </div>
  );
}
