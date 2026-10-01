import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCheck, FiCopy, FiGift } from 'react-icons/fi';
import { fetchActivePromotions } from '../services/catalog';
import { formatDate, formatPrice } from '../utils/format';

const trim = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

/** Writes text to the clipboard, falling back where the async API is blocked. */
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'absolute';
    field.style.left = '-9999px';
    document.body.appendChild(field);
    field.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      document.body.removeChild(field);
    }
  }
};

/**
 * "Available vouchers & promos" card for /profile. Lists the live codes created
 * in the admin panel so a signed-in shopper can copy one without leaving their
 * account page. Reads the same endpoint as the storefront notice bar.
 */
export default function UserVouchers() {
  // null until the request settles, so the card can show a loading line.
  const [promos, setPromos] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    let alive = true;
    fetchActivePromotions()
      .then((list) => alive && setPromos(list))
      .catch(() => alive && setPromos([]));
    return () => {
      alive = false;
    };
  }, []);

  const copy = async (code) => {
    const ok = await copyText(code);
    if (!ok) {
      toast.error('Could not copy the code');
      return;
    }
    setCopied(code);
    toast.success(`Copied ${code}`);
    window.setTimeout(() => setCopied((current) => (current === code ? '' : current)), 2000);
  };

  const discountLabel = (promo) =>
    promo.discountType === 'percent'
      ? `${trim(promo.discountValue)}% off`
      : `${formatPrice(promo.discountValue)} off`;

  return (
    <section className="panel profile-vouchers">
      <div className="panel__head">
        <h2 className="panel__title">
          <FiGift aria-hidden="true" /> Available vouchers &amp; promos
        </h2>
      </div>

      {promos === null && <p className="muted">Loading your codes…</p>}

      {promos !== null && promos.length === 0 && (
        <p className="muted">No active promo codes right now. Check back soon!</p>
      )}

      {promos !== null && promos.length > 0 && (
        <div className="vouchers-grid">
          {promos.map((promo) => (
            <article key={promo.code} className="voucher">
              <div className="voucher__body">
                <p className="voucher__value">{discountLabel(promo)}</p>
                <p className="voucher__code">{promo.code}</p>
                {promo.description && <p className="voucher__desc">{promo.description}</p>}
                <p className="voucher__meta">
                  {Number(promo.minimumOrder) > 0 && (
                    <span>Min. order {formatPrice(promo.minimumOrder)}</span>
                  )}
                  {promo.expiryDate && <span>Ends {formatDate(promo.expiryDate)}</span>}
                </p>
              </div>

              <button
                type="button"
                className={`btn btn--ghost btn--sm voucher__copy${copied === promo.code ? ' is-copied' : ''}`}
                onClick={() => copy(promo.code)}
                aria-label={`Copy promo code ${promo.code}`}
              >
                {copied === promo.code ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
                <span>{copied === promo.code ? 'Copied' : 'Copy code'}</span>
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
