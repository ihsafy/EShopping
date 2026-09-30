import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import Modal from '../../components/admin/Modal';
import Confirm from '../../components/admin/Confirm';
import ImagePicker from '../../components/admin/ImagePicker';
import {
  fetchAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadImages,
} from '../../services/admin';

const EMPTY_FORM = { name: '', description: '', icon: '', imageUrl: '', status: 'active', sortOrder: '0' };

function CategoryForm({ open, category, onClose, onSaved }) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(category);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFiles([]);
    setSaving(false);
    if (category) {
      setValues({
        name: category.name || '',
        description: category.description || '',
        icon: category.icon || '',
        imageUrl: category.image_url || '',
        status: category.status || 'active',
        sortOrder: String(category.sort_order ?? 0),
      });
    } else {
      setValues(EMPTY_FORM);
    }
  }, [open, category]);

  if (!open) return null;

  const set = (key) => (event) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const name = values.name.trim();
    const next = {};
    if (!name) next.name = 'Category name is required';
    else if (name.length > 120) next.name = 'Must be at most 120 characters';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      let imageUrl;
      if (files.length) [imageUrl] = (await uploadImages(files)).urls;

      const payload = {
        name,
        description: values.description.trim() || null,
        icon: values.icon.trim() || null,
        status: values.status,
        sortOrder: Number(values.sortOrder) || 0,
      };

      if (editing) {
        if (imageUrl !== undefined || values.imageUrl !== category.image_url) {
          payload.imageUrl = imageUrl !== undefined ? imageUrl : values.imageUrl;
        }
        await updateCategory(category.id, payload);
      } else {
        payload.imageUrl = imageUrl !== undefined ? imageUrl : values.imageUrl || null;
        await createCategory(payload);
      }

      toast.success(editing ? 'Category updated' : 'Category created');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Could not save the category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Edit category' : 'Add category'}
      onClose={saving ? undefined : onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="category-form" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create category'}
          </button>
        </>
      }
    >
      <form id="category-form" className="admin-form" onSubmit={submit} noValidate>
        <div className="admin-form__row">
          <div className="admin-field admin-field--grow">
            <label className="admin-field__label" htmlFor="cf-name">
              Name *
            </label>
            <input
              id="cf-name"
              type="text"
              value={values.name}
              onChange={set('name')}
              placeholder="Electronics"
              className={errors.name ? 'is-invalid' : ''}
            />
            {errors.name && <span className="admin-field__error">{errors.name}</span>}
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cf-icon">
              Icon
            </label>
            <input id="cf-icon" type="text" value={values.icon} onChange={set('icon')} placeholder="smartphone" />
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cf-order">
              Sort order
            </label>
            <input id="cf-order" type="number" value={values.sortOrder} onChange={set('sortOrder')} placeholder="0" />
          </div>
        </div>

        <div className="admin-form__row">
          <div className="admin-field admin-field--grow">
            <label className="admin-field__label" htmlFor="cf-description">
              Description
            </label>
            <textarea
              id="cf-description"
              rows="3"
              value={values.description}
              onChange={set('description')}
              placeholder="Short blurb shown on the category page"
            />
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="cf-status">
              Status
            </label>
            <select id="cf-status" value={values.status} onChange={set('status')}>
              <option value="active">Visible</option>
              <option value="inactive">Hidden</option>
            </select>
          </div>
        </div>

        <ImagePicker
          label="Category image"
          hint="Shown on the category strip and category page"
          existing={values.imageUrl ? [values.imageUrl] : []}
          files={files}
          onFiles={setFiles}
          onRemoveExisting={() => setValues((prev) => ({ ...prev, imageUrl: '' }))}
          max={1}
        />
      </form>
    </Modal>
  );
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
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
      setCategories(await fetchAdminCategories());
    } catch (err) {
      setError(err.message || 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (category) => {
    try {
      await updateCategory(category.id, {
        status: category.status === 'active' ? 'inactive' : 'active',
      });
      toast.success(category.status === 'active' ? 'Category hidden' : 'Category is now visible');
      load();
    } catch (err) {
      toast.error(err.message || 'Could not update the category.');
    }
  };

  const remove = async () => {
    if (!confirming || busy) return;
    setBusy(true);
    try {
      const result = await deleteCategory(confirming.id);
      toast.success(result.message || 'Category deleted');
      setConfirming(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete the category.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-page">
      <Helmet>
        <title>Categories | EShopping Admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Categories</h1>
          <p className="muted">Control which categories shoppers see, and in what order.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <FiPlus size={15} /> Add category
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
        <p className="muted admin-page__loading">Loading categories…</p>
      ) : categories.length === 0 ? (
        <div className="admin-panel admin-empty">
          <h2>No categories yet</h2>
          <p className="muted">Create a category to start grouping products.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--rows">
            <thead>
              <tr>
                <th>Category</th>
                <th>Order</th>
                <th>Products</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className={category.status !== 'active' ? 'admin-row--muted' : ''}>
                  <td>
                    <div className="admin-prod">
                      <span className="admin-prod__media">
                        {category.image_url ? (
                          <img src={category.image_url} alt={category.name} />
                        ) : (
                          <span className="admin-prod__noimg">{category.name.slice(0, 2)}</span>
                        )}
                      </span>
                      <span className="admin-prod__meta">
                        <strong>{category.name}</strong>
                        <em>{category.description || 'No description'}</em>
                      </span>
                    </div>
                  </td>
                  <td>{category.sort_order}</td>
                  <td>{Number(category.product_count) || 0}</td>
                  <td>
                    <span
                      className="admin-pill"
                      data-status={category.status === 'active' ? 'delivered' : 'cancelled'}
                    >
                      {category.status === 'active' ? 'visible' : 'hidden'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          setEditing(category);
                          setFormOpen(true);
                        }}
                        aria-label={`Edit ${category.name}`}
                      >
                        <FiEdit2 size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => toggleStatus(category)}
                      >
                        {category.status === 'active' ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm admin-actions__danger"
                        onClick={() => setConfirming(category)}
                        aria-label={`Delete ${category.name}`}
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

      <CategoryForm
        open={formOpen}
        category={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setEditing(null);
          load();
        }}
      />

      <Confirm
        open={Boolean(confirming)}
        title="Delete category"
        message={`Delete "${confirming?.name}"? Only empty categories can be removed — delete their products or subcategories first.`}
        confirmLabel="Delete category"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}
