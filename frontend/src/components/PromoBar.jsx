import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCheck, FiCopy, FiX, FiZap } from 'react-icons/fi';
import { fetchActivePromotions } from '../services/catalog';
import useAuth from '../context/useAuth';

const DISMISS_KEY = 'eshopping:promo-dismissed';
const PENDING_KEY = 'eshopping:pending-coupon';
const ROTATE_MS = 6000;

const trim = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

/**
 * Slim members-only announcement bar pinned above the storefront header. It
 * renders nothing for guests, then surfaces the best live promotion created in
 * the admin panel with a personal greeting, lets members copy the code in one
 * tap or apply it straight at checkout, and stays out of the way once dismissed
 * (remembered per session).
 */
export default function PromoBar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [promos, setPromos] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Members-only bar: never fetch or render for guests.
  useEffect(() => {
    if (!user || dismissed) return undefined;
    let alive = true;
    fetchActivePromotions()
      .then((list) => {
        if (alive) setPromos(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, dismissed]);

  // Rotate through the offers when the shop has more than one live.
  useEffect(() => {
    if (promos.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % promos.length);
      setCopied(false);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [promos.length]);

  const promo = promos[index];

  // Hand the code to checkout via storage + a live event so it can prefill and
  // validate whether or not the checkout page is already mounted.
  const stageCoupon = (code) => {
    try {
      window.localStorage.setItem(PENDING_KEY, code);
    } catch {
      /* storage may be unavailable */
    }
    window.dispatchEvent(new CustomEvent('eshopping:apply-coupon', { detail: { code } }));
  };

  const copy = async () => {
    if (!promo) return;
    try {
      await navigator.clipboard.writeText(promo.code);
    } catch {
      const field = document.createElement('textarea');
      field.value = promo.code;
      field.setAttribute('readonly', '');
      field.style.position = 'absolute';
      field.style.left = '-9999px';
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand('copy');
      } catch {
        toast.error('Could not copy the code');
        document.body.removeChild(field);
        return;
      }
      document.body.removeChild(field);
    }
    setCopied(true);
    toast.success(`Copied ${promo.code}`);
    stageCoupon(promo.code);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const applyNow = () => {
    if (!promo) return;
    stageCoupon(promo.code);
    toast.success(`Applying ${promo.code} at checkout`);
    navigate('/checkout');
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* storage may be unavailable; dismiss still works for this page */
    }
  };

  // STRICT AUTH GUARD: guests and dismissed bars render nothing.
  if (!user || dismissed || !promo) return null;

  const firstName = String(user.name || '').trim().split(/\s+/)[0] || 'Member';

  const off =
    promo.discountType === 'percent'
      ? `${trim(promo.discountValue)}% OFF`
      : `৳${trim(promo.discountValue)} OFF`;

  return (
    <div className="promo-bar" role="region" aria-label="Promotional offer">
      <div className="promo-bar__inner" key={promo.code}>
        <FiZap className="promo-bar__spark" aria-hidden="true" />
        <p className="promo-bar__msg">
          Welcome back, <span className="promo-bar__name">{firstName}</span>! Use code{' '}
          <strong>{promo.code}</strong> for {off} on your order!
        </p>

        <button type="button" className={`promo-bar__copy ${copied ? 'is-copied' : ''}`} onClick={copy}>
          <FiCopy aria-hidden="true" />
          <span className="promo-bar__copy-label">{copied ? 'Copied!' : 'Copy code'}</span>
        </button>

        <button type="button" className="promo-bar__apply" onClick={applyNow}>
          <FiCheck aria-hidden="true" />
          <span>Apply</span>
        </button>

        <button type="button" className="promo-bar__close" aria-label="Dismiss promotion" onClick={dismiss}>
          <FiX aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
