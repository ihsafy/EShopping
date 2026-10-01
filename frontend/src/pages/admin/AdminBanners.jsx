import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiArrowDown, FiArrowUp, FiEdit2, FiEye, FiImage, FiPlus, FiTrash2 } from 'react-icons/fi';
import Modal from '../../components/admin/Modal';
import Confirm from '../../components/admin/Confirm';
import ImagePicker from '../../components/admin/ImagePicker';
import Button from '../../components/ui/Button';
import StatusPill from '../../components/ui/StatusPill';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { fetchAdminBanners, createBanner, updateBanner, deleteBanner, uploadImages } from '../../services/admin';

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  imageUrl: '',
  mobileImageUrl: '',
  buttonText: '',
  buttonLink: '',
  theme: 'default',
  status: 'active',
  sortOrder: '0',
};

function BannerForm({ open, banner, onClose, onSaved }) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState([]);
  const [mobileFiles, setMobileFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(banner);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFiles([]);
    setMobileFiles([]);
    setSaving(false);
    if (banner) {
      setValues({
        title: banner.title || '',
        subtitle: banner.subtitle || '',
        imageUrl: banner.image_url || '',
        mobileImageUrl: banner.mobile_image_url || '',
        buttonText: banner.button_text || '',
        buttonLink: banner.button_link || '',
        theme: banner.theme || 'default',
        status: banner.status || 'active',
        sortOrder: String(banner.sort_order ?? 0),
      });
    } else {
      setValues(EMPTY_FORM);
    }
  }, [open, banner]);

  if (!open) return null;

  const set = (key) => (event) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const next = {};
    if (!values.title.trim()) next.title = 'A banner title is required';
    else if (values.title.trim().length > 200) next.title = 'Must be at most 200 characters';
    if (values.subtitle.length > 300) next.subtitle = 'Must be at most 300 characters';
    if (values.buttonText.length > 60) next.buttonText = 'Must be at most 60 characters';
    if (values.buttonLink.length > 255) next.buttonLink = 'Must be at most 255 characters';
    if (!editing && !values.imageUrl && files.length === 0) next.image = 'Upload a banner image';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      let imageUrl;
      let mobileImageUrl;
      if (files.length) [imageUrl] = (await uploadImages(files)).urls;
      if (mobileFiles.length) [mobileImageUrl] = (await uploadImages(mobileFiles)).urls;

      const payload = {
        title: values.title.trim(),
        subtitle: values.subtitle.trim() || null,
        buttonText: values.buttonText.trim() || null,
        buttonLink: values.buttonLink.trim() || null,
        theme: values.theme,
        status: values.status,
        sortOrder: Number(values.sortOrder) || 0,
      };

      if (editing) {
        if (imageUrl !== undefined || values.imageUrl !== banner.image_url) {
          payload.imageUrl = imageUrl !== undefined ? imageUrl : values.imageUrl;
        }
        if (mobileImageUrl !== undefined || values.mobileImageUrl !== banner.mobile_image_url) {
          payload.mobileImageUrl =
            mobileImageUrl !== undefined ? mobileImageUrl : values.mobileImageUrl;
        }
        await updateBanner(banner.id, payload);
      } else {
        payload.imageUrl = imageUrl !== undefined ? imageUrl : values.imageUrl || null;
        payload.mobileImageUrl =
          mobileImageUrl !== undefined ? mobileImageUrl : values.mobileImageUrl || null;
        await createBanner(payload);
      }

      toast.success(editing ? 'Banner updated' : 'Banner created');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Could not save the banner.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Edit banner' : 'Add banner'}
      onClose={saving ? undefined : onClose}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="banner-form" variant="primary" loading={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create banner'}
          </Button>
        </>
      }
    >
      <form id="banner-form" className="admin-form" onSubmit={submit} noValidate>
        <div className="admin-form__row">
          <div className="admin-field admin-field--grow">
            <label className="admin-field__label" htmlFor="bf-title">
              Title *
            </label>
            <input
              id="bf-title"
              type="text"
              value={values.title}
              onChange={set('title')}
              placeholder="Mid-season mega sale"
              className={errors.title ? 'is-invalid' : ''}
            />
            {errors.title && <span className="admin-field__error">{errors.title}</span>}
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="bf-order">
              Sort order
            </label>
            <input
              id="bf-order"
              type="number"
              value={values.sortOrder}
              onChange={set('sortOrder')}
              placeholder="0"
            />
            <span className="admin-field__hint">Lower numbers appear first</span>
          </div>
        </div>

        <div className="admin-field">
          <label className="admin-field__label" htmlFor="bf-subtitle">
            Subtitle (eyebrow text)
          </label>
          <input
            id="bf-subtitle"
            type="text"
            value={values.subtitle}
            onChange={set('subtitle')}
            placeholder="Up to 70% off · this week only"
            className={errors.subtitle ? 'is-invalid' : ''}
          />
          {errors.subtitle && <span className="admin-field__error">{errors.subtitle}</span>}
        </div>

        <div className="admin-form__row">
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="bf-button-text">
              Button label
            </label>
            <input
              id="bf-button-text"
              type="text"
              value={values.buttonText}
              onChange={set('buttonText')}
              placeholder="Shop now"
              className={errors.buttonText ? 'is-invalid' : ''}
            />
            {errors.buttonText && <span className="admin-field__error">{errors.buttonText}</span>}
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="bf-button-link">
              Button link
            </label>
            <input
              id="bf-button-link"
              type="text"
              value={values.buttonLink}
              onChange={set('buttonLink')}
              placeholder="/shop?category=electronics"
              className={errors.buttonLink ? 'is-invalid' : ''}
            />
            {errors.buttonLink && <span className="admin-field__error">{errors.buttonLink}</span>}
          </div>
        </div>

        <div className="admin-form__row">
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="bf-theme">
              Theme
            </label>
            <select id="bf-theme" value={values.theme} onChange={set('theme')}>
              <option value="default">Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="bf-status">
              Status
            </label>
            <select id="bf-status" value={values.status} onChange={set('status')}>
              <option value="active">Active (shown on the homepage)</option>
              <option value="inactive">Inactive (hidden)</option>
            </select>
          </div>
        </div>

        <ImagePicker
          label="Desktop image *"
          hint="Served as the homepage hero background — landscape image works best (max 4MB)"
          existing={values.imageUrl ? [values.imageUrl] : []}
          files={files}
          onFiles={setFiles}
          onRemoveExisting={() => setValues((prev) => ({ ...prev, imageUrl: '' }))}
          max={1}
        />
        {errors.image && <span className="admin-field__error">{errors.image}</span>}

        <ImagePicker
          label="Mobile image (optional)"
          hint="Shown instead of the desktop image on small screens"
          existing={values.mobileImageUrl ? [values.mobileImageUrl] : []}
          files={mobileFiles}
          onFiles={setMobileFiles}
          onRemoveExisting={() => setValues((prev) => ({ ...prev, mobileImageUrl: '' }))}
          max={1}
        />
      </form>
    </Modal>
  );
}

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
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
      setBanners(await fetchAdminBanners());
    } catch (err) {
      setError(err.message || 'Could not load banners.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const move = async (banner, direction) => {
    const index = banners.findIndex((item) => item.id === banner.id);
    const swap = banners[index + direction];
    if (!swap) return;
    try {
      await updateBanner(banner.id, { sortOrder: Number(swap.sort_order) });
      await updateBanner(swap.id, { sortOrder: Number(banner.sort_order) });
      toast.success('Banner order updated');
      load();
    } catch (err) {
      toast.error(err.message || 'Could not change the order.');
    }
  };

  const remove = async () => {
    if (!confirming || busy) return;
    setBusy(true);
    try {
      const result = await deleteBanner(confirming.id);
      toast.success(result.message || 'Banner deleted');
      setConfirming(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete the banner.');
    } finally {
      setBusy(false);
    }
  };

  const hasBanners = banners.length > 0;

  return (
    <section className="admin-page">
      <Helmet>
        <title>Homepage banners | EShopping Admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Homepage banners</h1>
          <p className="muted">Manage the hero carousel on the storefront homepage.</p>
        </div>
        <Button
          variant="primary"
          icon={FiPlus}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Add banner
        </Button>
      </div>

      {error && !hasBanners && (
        <ErrorState title="Could not load banners" text={error} onRetry={load} retrying={loading} />
      )}

      {error && hasBanners && (
        <div className="alert alert-error" role="alert">
          {error}{' '}
          <Button variant="ghost" size="sm" onClick={load}>
            Try again
          </Button>
        </div>
      )}

      {loading && !hasBanners && (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--rows">
            <tbody>
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonRow key={i} columns={5} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && !hasBanners && (
        <EmptyState
          icon={FiImage}
          title="No banners yet"
          text="Add a banner to show a promo on the homepage hero."
          action={
            <Button
              variant="primary"
              icon={FiPlus}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add banner
            </Button>
          }
        />
      )}

      {hasBanners && (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--rows">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Banner</th>
                <th>Order</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {banners.map((banner, index) => (
                <tr key={banner.id}>
                  <td>
                    <span className="admin-prod__media admin-prod__media--banner">
                      {banner.image_url ? (
                        <img src={banner.image_url} alt={banner.title} />
                      ) : (
                        <span className="admin-prod__noimg">No image</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <strong>{banner.title}</strong>
                    <em className="admin-sub">{banner.subtitle || 'No subtitle'}</em>
                    <em className="admin-sub">
                      {banner.button_text || 'Shop now'} → {banner.button_link || '/shop'}
                    </em>
                  </td>
                  <td>
                    <div className="admin-order-input">
                      <button
                        type="button"
                        aria-label={`Move ${banner.title} up`}
                        disabled={index === 0 || busy}
                        onClick={() => move(banner, -1)}
                      >
                        <FiArrowUp size={13} />
                      </button>
                      <span>{banner.sort_order}</span>
                      <button
                        type="button"
                        aria-label={`Move ${banner.title} down`}
                        disabled={index === banners.length - 1 || busy}
                        onClick={() => move(banner, 1)}
                      >
                        <FiArrowDown size={13} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <StatusPill status={banner.status} />
                  </td>
                  <td>
                    <div className="admin-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={FiEdit2}
                        onClick={() => {
                          setEditing(banner);
                          setFormOpen(true);
                        }}
                        aria-label={`Edit ${banner.title}`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={FiEye}
                        onClick={() => {
                          if (banner.image_url) window.open(banner.image_url, '_blank', 'noopener');
                        }}
                        aria-label={`Preview ${banner.title}`}
                        disabled={!banner.image_url}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="admin-actions__danger"
                        icon={FiTrash2}
                        onClick={() => setConfirming(banner)}
                        aria-label={`Delete ${banner.title}`}
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

      <BannerForm
        open={formOpen}
        banner={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setEditing(null);
          load();
        }}
      />

      <Confirm
        open={Boolean(confirming)}
        title="Delete banner"
        message={`Are you sure you want to delete "${confirming?.title}"?`}
        confirmLabel="Delete banner"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}
