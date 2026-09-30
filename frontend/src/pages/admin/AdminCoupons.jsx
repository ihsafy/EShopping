import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import Modal from '../../components/admin/Modal';
import Confirm from '../../components/admin/Confirm';
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
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="coupon-form" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create coupon'}
          </button>
        </>
      }
    >
      <form id="coupon-form" className="admin-form" onSubmit={submit} noValidate>
        <div className="admin-form__row">
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cp-code">
              Code *
            </label>
            <input
              id="cp-code"
              type="text"
              value={values.code}
              onChange={set('code')}
              placeholder="WELCOME10"
              className={errors.code ? 'is-invalid' : ''}
            />
            {errors.code && <span className="admin-field__error">{errors.code}</span>}
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cp-type">
              Discount type
            </label>
            <select id="cp-type" value={values.discountType} onChange={set('discountType')}>
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed amount (৳)</option>
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cp-value">
              Value *
            </label>
            <input
              id="cp-value"
              type="number"
              min="0"
              step="0.01"
              value={values.discountValue}
              onChange={set('discountValue')}
              placeholder={values.discountType === 'percent' ? '10' : '200'}
              className={errors.discountValue ? 'is-invalid' : ''}
            />
            {errors.discountValue && <span className="admin-field__error">{errors.discountValue}</span>}
          </div>
        </div>

        <div className="admin-field">
          <label className="admin-field__label" htmlFor="cp-description">
            Description
          </label>
          <input
            id="cp-description"
            type="text"
            value={values.description}
            onChange={set('description')}
            placeholder="10% off for new customers"
          />
        </div>

        <div className="admin-form__row">
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cp-min">
              Minimum order (৳)
            </label>
            <input id="cp-min" type="number" min="0" value={values.minimumOrder} onChange={set('minimumOrder')} placeholder="0" />
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cp-max">
              Max discount (৳)
            </label>
            <input
              id="cp-max"
              type="number"
              min="0"
              value={values.maximumDiscount}
              onChange={set('maximumDiscount')}
              placeholder="No cap"
            />
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cp-usage">
              Total usage limit
            </label>
            <input
              id="cp-usage"
              type="number"
              min="0"
              value={values.usageLimit}
              onChange={set('usageLimit')}
              placeholder="Unlimited"
            />
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cp-user">
              Per-customer limit
            </label>
            <input id="cp-user" type="number" min="1" value={values.perUserLimit} onChange={set('perUserLimit')} />
          </div>
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
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cp-status">
              Status
            </label>
            <select id="cp-status" value={values.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <FiPlus size={15} /> Add promotion
        </button>
      </div>

      {error && (
        <div className="alert alert--error">
          {error}{' '}
          <button type="button" className="admin-linkbtn" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <p className="muted admin-page__loading">Loading promotions…</p>
      ) : coupons.length === 0 ? (
        <div className="admin-panel admin-empty">
          <h2>No promotions yet</h2>
          <p className="muted">Create a code like WELCOME10 to give shoppers a discount.</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <FiPlus size={15} /> Add promotion
          </button>
        </div>
      ) : (
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
                    <span
                      className="admin-pill"
                      data-status={coupon.status === 'active' ? 'delivered' : 'cancelled'}
                    >
                      {coupon.status}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          setEditing(coupon);
                          setFormOpen(true);
                        }}
                        aria-label={`Edit ${coupon.code}`}
                      >
                        <FiEdit2 size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm admin-actions__danger"
                        onClick={() => setConfirming(coupon)}
                        aria-label={`Delete ${coupon.code}`}
                      >
                        <FiTrash2 size={13} /> Delete
                      </button>
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
