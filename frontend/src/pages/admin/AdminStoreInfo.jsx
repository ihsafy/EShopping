import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { fetchAdminSettings, saveSettings } from '../../services/admin';
import { formatPrice } from '../../utils/format';

const FIELDS = [
  { key: 'store_phone', label: 'Phone', placeholder: '+8801XXXXXXXXX', type: 'tel' },
  { key: 'store_email', label: 'Email', placeholder: 'hello@example.com', type: 'email' },
  { key: 'store_address', label: 'Address', placeholder: 'House 12, Road 5, Dhanmondi, Dhaka', type: 'text' },
];

const FEES = [
  { key: 'inside_dhaka_fee', label: 'Inside Dhaka delivery fee', placeholder: '60' },
  { key: 'outside_dhaka_fee', label: 'Outside Dhaka delivery fee', placeholder: '120' },
  { key: 'free_delivery_over', label: 'Free delivery on orders over', placeholder: '5000' },
];

export default function AdminStoreInfo() {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminSettings()
      .then(setValues)
      .catch((err) => setError(err.message || 'Could not load the store information.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (event) => setValues((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const phone = String(values.store_phone || '').trim();
    const email = String(values.store_email || '').trim();
    if (!phone && !email) {
      toast.error('Add at least a phone number or an email');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      const payload = {};
      FIELDS.forEach(({ key }) => {
        payload[key] = String(values[key] || '').trim();
      });
      FEES.forEach(({ key }) => {
        const value = String(values[key] ?? '').trim();
        if (value !== '' && Number.isNaN(Number(value))) {
          throw new Error('Delivery charges must be numbers');
        }
        payload[key] = value;
      });

      const result = await saveSettings(payload);
      setValues(result.settings || values);
      toast.success(result.message || 'Store information saved');
    } catch (err) {
      toast.error(err.message || 'Could not save the store information.');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <section className="admin-page" aria-busy="true">
        <div className="admin-page__head">
          <div>
            <Skeleton className="skeleton-title" width={200} />
            <Skeleton className="skeleton-text" width="52%" />
          </div>
        </div>
        <div className="admin-panel admin-form">
          <div className="admin-form__row">
            {FIELDS.map(({ key }) => (
              <div className="admin-field" key={key}>
                <Skeleton className="skeleton-text" width="34%" />
                <Skeleton height={42} radius="var(--r-md)" />
              </div>
            ))}
          </div>
          <Skeleton className="skeleton-title" width={160} />
          <div className="admin-form__row">
            {FEES.map(({ key }) => (
              <div className="admin-field" key={key}>
                <Skeleton className="skeleton-text" width="46%" />
                <Skeleton height={42} radius="var(--r-md)" />
              </div>
            ))}
          </div>
          <div className="admin-form__actions">
            <Skeleton height={42} width={190} radius="var(--r-md)" />
          </div>
        </div>
      </section>
    );

  return (
    <section className="admin-page">
      <Helmet>
        <title>Store information | EShopping Admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Store information</h1>
          <p className="muted">Contact details and delivery charges used across the storefront.</p>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Could not load the store information"
          text={error}
          onRetry={() => window.location.reload()}
          retrying={loading}
        />
      )}

      <form className="admin-panel admin-form" onSubmit={submit}>
        <div className="admin-form__row">
          {FIELDS.map((field) => (
            <div className="admin-field" key={field.key}>
              <label className="admin-field__label" htmlFor={field.key}>
                {field.label}
              </label>
              <input
                id={field.key}
                type={field.type}
                value={values[field.key] || ''}
                onChange={set(field.key)}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>

        <h3 className="admin-form__heading">Delivery charges</h3>
        <div className="admin-form__row">
          {FEES.map((field) => (
            <div className="admin-field" key={field.key}>
              <label className="admin-field__label" htmlFor={field.key}>
                {field.label}
              </label>
              <input
                id={field.key}
                type="number"
                min="0"
                value={values[field.key] ?? ''}
                onChange={set(field.key)}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>

        <div className="admin-form__actions">
          <Button type="submit" variant="primary" loading={saving}>
            {saving ? 'Saving…' : 'Save store information'}
          </Button>
          {values.free_delivery_over ? (
            <span className="muted">
              Free delivery above {formatPrice(values.free_delivery_over)} · inside Dhaka{' '}
              {formatPrice(values.inside_dhaka_fee)} / outside {formatPrice(values.outside_dhaka_fee)}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
