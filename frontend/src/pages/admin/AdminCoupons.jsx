import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiEdit2, FiPlus, FiTag, FiTrash2 } from 'react-icons/fi';
import Modal from '../../components/admin/Modal';
import Confirm from '../../components/admin/Confirm';
import Button from '../../components/ui/Button';
import StatusPill from '../../components/ui/StatusPill';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { fetchAdminCoupons, createCoupon, updateCoupon, deleteCoupon } from '../../services/admin';
import { formatPrice, formatDate } from '../../utils/format';

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: '',
  minimumOrder: '',
  maximumDiscount: '',
  startDate: '',
  expiryDate: '',
  usageLimit: '',
  perUserLimit: '1',
  status: 'active',
};

/** Input with a label that floats above the field on focus or when filled. */
function FloatField({ id, label, error, hint, className = '', ...inputProps }) {
  return (
    <label
      className={`admin-field admin-float ${error ? 'is-invalid' : ''} ${className}`.trim()}
      htmlFor={id}
    >
      <input id={id} className={error ? 'is-invalid' : ''} placeholder=" " {...inputProps} />
      <span className="admin-float__label">{label}</span>
      {error ? (
        <span className="admin-field__error">{error}</span>
      ) : hint ? (
        <span className="admin-field__hint">{hint}</span>
      ) : null}
    </label>
  );
}

function CouponForm({ open, coupon, onClose, onSaved }) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const editing = Boolean(coupon);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSaving(false);
    if (coupon) {
      setValues({
        code: coupon.code || '',
        description: coupon.description || '',
        discountType: coupon.discount_type || 'percent',
        discountValue: String(coupon.discount_value ?? ''),
        minimumOrder: String(coupon.minimum_order ?? '0'),
        maximumDiscount: coupon.maximum_discount != null ? String(coupon.maximum_discount) : '',
        startDate: coupon.start_date ? String(coupon.start_date).slice(0, 10) : '',
        expiryDate: coupon.expiry_date ? String(coupon.expiry_date).slice(0, 10) : '',
        usageLimit: coupon.usage_limit != null ? String(coupon.usage_limit) : '',
        perUserLimit: String(coupon.per_user_limit ?? '1'),
        status: coupon.status || 'active',
      });
    } else {
      setValues(EMPTY_FORM);
    }
  }, [open, coupon]);

  if (!open) return null;

  const set = (key) => (event) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const code = values.code.trim().toUpperCase();
    const value = Number(values.discountValue);
    const next = {};
    if (!code) next.code = 'A coupon code is required';
    else if (code.length > 40) next.code = 'Must be at most 40 characters';
    if (values.discountValue === '' || Number.isNaN(value) || value <= 0) {
      next.discountValue = 'Enter a discount greater than 0';
    } else if (values.discountType === 'percent' && value > 100) {
      next.discountValue = 'A percentage discount cannot exceed 100';
    }
    if (values.startDate && values.expiryDate && values.expiryDate < values.startDate) {
      next.expiryDate = 'Expiry must be after the start date';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const payload = {
        code,
        description: values.description.trim() || null,
        discountType: values.discountType,
        discountValue: value,
        minimumOrder: values.minimumOrder === '' ? 0 : Number(values.minimumOrder),
        maximumDiscount: values.maximumDiscount === '' ? null : Number(values.maximumDiscount),
        startDate: values.startDate || null,
        expiryDate: values.expiryDate || null,
        usageLimit: values.usageLimit === '' ? null : Number(values.usageLimit),
        perUserLimit: values.perUserLimit === '' ? 1 : Number(values.perUserLimit),
        status: values.status,
      };

      if (editing) await updateCoupon(coupon.id, payload);
      else await createCoupon(payload);

      toast.success(editing ? 'Coupon updated' : 'Coupon created');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Could not save the coupon.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? `Edit ${coupon.code}` : 'Add promotion'}
      onClose={saving ? undefined : onClose}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="coupon-form" variant="primary" loading={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create coupon'}
          </Button>
        </>
      }
    >
      <form id="coupon-form" className="admin-form admin-form--card" onSubmit={submit} noValidate>
        <div className="admin-form__row">
          <FloatField
            id="cp-code"
            label="Code *"
            value={values.code}
            onChange={set('code')}
            autoComplete="off"
            spellCheck="false"
            error={errors.code}
            hint="Shown to shoppers, e.g. WELCOME10"
          />
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cp-type">
              Discount type
            </label>
            <select id="cp-type" value={values.discountType} onChange={set('discountType')}>
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed amount (৳)</option>
            </select>
          </div>
          <FloatField
            id="cp-value"
            label="Value *"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={values.discountValue}
            onChange={set('discountValue')}
            error={errors.discountValue}
            hint={values.discountType === 'percent' ? 'Percentage off' : 'Amount off in ৳'}
          />
        </div>

        <FloatField
          id="cp-description"
          label="Description"
          value={values.description}
          onChange={set('description')}
          hint="Optional note shown next to the code"
        />

        <div className="admin-form__row">
          <FloatField
            id="cp-min"
            label="Minimum order (৳)"
            type="number"
            min="0"
            inputMode="decimal"
            value={values.minimumOrder}
            onChange={set('minimumOrder')}
          />
          <FloatField
            id="cp-max"
            label="Max discount (৳)"
            type="number"
            min="0"
            inputMode="decimal"
            value={values.maximumDiscount}
            onChange={set('maximumDiscount')}
          />
          <FloatField
            id="cp-usage"
            label="Total usage limit"
            type="number"
            min="0"
            inputMode="numeric"
            value={values.usageLimit}
            onChange={set('usageLimit')}
          />
          <FloatField
            id="cp-user"
            label="Per-customer limit"
            type="number"
            min="1"
            inputMode="numeric"
            value={values.perUserLimit}
            onChange={set('perUserLimit')}
          />
        </div>

        <div className="admin-form__row">
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cp-start">
              Starts on
            </label>
            <input id="cp-start" type="date" value={values.startDate} onChange={set('startDate')} />
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cp-expiry">
              Expires on
            </label>
            <input
              id="cp-expiry"
              type="date"
              value={values.expiryDate}
              onChange={set('expiryDate')}
              className={errors.expiryDate ? 'is-invalid' : ''}
            />
            {errors.expiryDate && <span className="admin-field__error">{errors.expiryDate}</span>}
          </div>
          <div className="admin-field admin-field--switch">
            <span className="admin-field__label">Active status</span>
            <label className="admin-switch" htmlFor="cp-status">
              <input
                id="cp-status"
                type="checkbox"
                checked={values.status === 'active'}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, status: event.target.checked ? 'active' : 'inactive' }))
                }
              />
              <span aria-hidden="true" />
              <em>{values.status === 'active' ? 'Active' : 'Inactive'}</em>
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCoupons(await fetchAdminCoupons());
    } catch (err) {
      setError(err.message || 'Could not load promotions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    if (!confirming || busy) return;
    setBusy(true);
    try {
      const result = await deleteCoupon(confirming.id);
      toast.success(result.message || 'Promotion deleted');
      setConfirming(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete the promotion.');
    } finally {
      setBusy(false);
    }
  };

  const hasCoupons = coupons.length > 0;

  return (
    <section className="admin-page">
      <Helmet>
        <title>Promotions | EShopping Admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Promotions</h1>
          <p className="muted">Discount codes customers can apply at checkout.</p>
        </div>
        <Button
          variant="primary"
          icon={FiPlus}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Add promotion
        </Button>
      </div>

      {error && !hasCoupons && (
        <ErrorState title="Could not load promotions" text={error} onRetry={load} retrying={loading} />
      )}

      {error && hasCoupons && (
        <div className="alert alert-error" role="alert">
          {error}{' '}
          <Button variant="ghost" size="sm" onClick={load}>
            Try again
          </Button>
        </div>
      )}

      {loading && !hasCoupons && (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--rows">
            <tbody>
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonRow key={i} columns={6} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && !hasCoupons && (
        <EmptyState
          icon={FiTag}
          title="No promotions yet"
          text="Create a code like WELCOME10 to give shoppers a discount."
          action={
            <Button
              variant="primary"
              icon={FiPlus}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add promotion
            </Button>
          }
        />
      )}

      {hasCoupons && (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--rows">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Validity</th>
                <th>Usage</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <strong className="admin-code">{coupon.code}</strong>
                    <em className="admin-sub">{coupon.description || 'No description'}</em>
                  </td>
                  <td>
                    {coupon.discount_type === 'percent'
                      ? `${Number(coupon.discount_value)}% off`
                      : `${formatPrice(coupon.discount_value)} off`}
                    <em className="admin-sub">
                      {Number(coupon.minimum_order) > 0
                        ? `Min ${formatPrice(coupon.minimum_order)}`
                        : 'No minimum'}
                      {coupon.maximum_discount ? ` · cap ${formatPrice(coupon.maximum_discount)}` : ''}
                    </em>
                  </td>
                  <td>
                    {coupon.start_date ? `From ${formatDate(coupon.start_date)}` : 'Immediate'}
                    <em className="admin-sub">
                      {coupon.expiry_date ? `Until ${formatDate(coupon.expiry_date)}` : 'No expiry'}
                    </em>
                  </td>
                  <td>
                    {Number(coupon.used_count) || 0}
                    <em className="admin-sub">
                      {coupon.usage_limit ? `of ${coupon.usage_limit}` : 'unlimited uses'}
                    </em>
                  </td>
                  <td>
                    <StatusPill status={coupon.status} />
                  </td>
                  <td>
                    <div className="admin-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={FiEdit2}
                        onClick={() => {
                          setEditing(coupon);
                          setFormOpen(true);
                        }}
                        aria-label={`Edit ${coupon.code}`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="admin-actions__danger"
                        icon={FiTrash2}
                        onClick={() => setConfirming(coupon)}
                        aria-label={`Delete ${coupon.code}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CouponForm
        open={formOpen}
        coupon={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setEditing(null);
          load();
        }}
      />

      <Confirm
        open={Boolean(confirming)}
        title="Delete promotion"
        message={`Delete the code "${confirming?.code}"? Shoppers will no longer be able to use it.`}
        confirmLabel="Delete promotion"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}
