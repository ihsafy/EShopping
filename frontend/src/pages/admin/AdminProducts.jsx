import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiChevronLeft, FiChevronRight, FiEdit2, FiPlus, FiPackage, FiSearch, FiTrash2 } from 'react-icons/fi';
import Modal from '../../components/admin/Modal';
import Confirm from '../../components/admin/Confirm';
import ImagePicker from '../../components/admin/ImagePicker';
import Button from '../../components/ui/Button';
import StatusPill from '../../components/ui/StatusPill';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import { SkeletonRow } from '../../components/ui/Skeleton';
import {
  fetchAdminProducts,
  fetchAdminProduct,
  fetchAdminCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImages,
} from '../../services/admin';
import { formatPrice, formatDate } from '../../utils/format';

const EMPTY_FORM = {
  name: '',
  sku: '',
  categoryId: '',
  description: '',
  originalPrice: '',
  salePrice: '',
  stock: '',
  status: 'active',
};

function FieldError({ message }) {
  return message ? <span className="admin-field__error">{message}</span> : null;
}

/** Add / edit dialog shared by both flows. */
function ProductForm({ open, product, categories, onClose, onSaved }) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState([]);
  const [kept, setKept] = useState([]);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(product);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFiles([]);
    setSaving(false);
    if (product) {
      setValues({
        name: product.name || '',
        sku: product.sku || '',
        categoryId: product.category_id ? String(product.category_id) : '',
        description: product.description || '',
        originalPrice: product.original_price != null ? String(product.original_price) : '',
        salePrice: product.price_override ? String(product.sale_price) : '',
        stock: String(product.stock ?? 0),
        status: product.status || 'active',
      });
      setKept((product.images || []).map((img) => img.image_url).filter(Boolean));
    } else {
      setValues(EMPTY_FORM);
      setKept([]);
    }
  }, [open, product]);

  if (!open) return null;

  const set = (key) => (event) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    const name = values.name.trim();
    if (!name) next.name = 'Product name is required';
    else if (name.length > 200) next.name = 'Must be at most 200 characters';
    if (!values.categoryId) next.categoryId = 'Choose a category';

    const price = Number(values.originalPrice);
    if (values.originalPrice === '' || Number.isNaN(price)) next.originalPrice = 'Enter a valid price';
    else if (price < 0) next.originalPrice = 'Price cannot be negative';

    let sale = null;
    if (values.salePrice !== '') {
      sale = Number(values.salePrice);
      if (Number.isNaN(sale) || sale < 0) next.salePrice = 'Enter a valid discount price';
      else if (!next.originalPrice && sale > price) next.salePrice = 'Cannot be higher than the price';
    }

    const stock = Number(values.stock);
    if (values.stock === '' || !Number.isInteger(stock) || stock < 0) {
      next.stock = 'Stock must be a whole number (0 or more)';
    }

    setErrors(next);
    return { ok: Object.keys(next).length === 0, price, sale };
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const { ok, price, sale } = validate();
    if (!ok) return;

    setSaving(true);
    try {
      let uploaded = [];
      if (files.length) {
        const result = await uploadImages(files);
        uploaded = result.urls || [];
      }

      const discount =
        sale !== null && price > 0 ? Math.max(0, Math.round((1 - sale / price) * 100)) : 0;

      const payload = {
        name: values.name.trim(),
        sku: values.sku.trim() || undefined,
        categoryId: Number(values.categoryId),
        description: values.description.trim() || undefined,
        originalPrice: price,
        discount,
        salePrice: sale === null ? '' : sale,
        stock: Number(values.stock),
        status: values.status,
        images: [...kept, ...uploaded],
      };

      const result = editing
        ? await updateProduct(product.id, payload)
        : await createProduct(payload);
      toast.success(result.message || (editing ? 'Product updated' : 'Product created'));
      onSaved();
    } catch (err) {
      const fieldErrors = err.payload?.errors;
      if (fieldErrors) {
        setErrors(
          Object.fromEntries(
            Object.entries(fieldErrors).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
          )
        );
      }
      toast.error(err.message || 'Could not save the product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Edit product' : 'Add product'}
      onClose={saving ? undefined : onClose}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" variant="primary" loading={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
          </Button>
        </>
      }
    >
      <form id="product-form" className="admin-form" onSubmit={submit} noValidate>
        <div className="admin-form__row">
          <div className="admin-field admin-field--grow">
            <label className="admin-field__label" htmlFor="pf-name">
              Product name *
            </label>
            <input
              id="pf-name"
              type="text"
              value={values.name}
              onChange={set('name')}
              placeholder="e.g. Wireless Over-Ear Headphones"
              className={errors.name ? 'is-invalid' : ''}
            />
            <FieldError message={errors.name} />
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="pf-sku">
              SKU
            </label>
            <input id="pf-sku" type="text" value={values.sku} onChange={set('sku')} placeholder="Auto-generated if empty" />
          </div>
        </div>

        <div className="admin-form__row">
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="pf-category">
              Category *
            </label>
            <select
              id="pf-category"
              value={values.categoryId}
              onChange={set('categoryId')}
              className={errors.categoryId ? 'is-invalid' : ''}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.categoryId} />
          </div>

          <div className="admin-field">
            <label className="admin-field__label" htmlFor="pf-status">
              Status
            </label>
            <select id="pf-status" value={values.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="admin-field">
            <label className="admin-field__label" htmlFor="pf-stock">
              Stock quantity *
            </label>
            <input
              id="pf-stock"
              type="number"
              min="0"
              step="1"
              value={values.stock}
              onChange={set('stock')}
              className={errors.stock ? 'is-invalid' : ''}
            />
            <FieldError message={errors.stock} />
          </div>
        </div>

        <div className="admin-form__row">
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="pf-price">
              Price (৳) *
            </label>
            <input
              id="pf-price"
              type="number"
              min="0"
              step="0.01"
              value={values.originalPrice}
              onChange={set('originalPrice')}
              className={errors.originalPrice ? 'is-invalid' : ''}
            />
            <FieldError message={errors.originalPrice} />
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="pf-sale">
              Discount price (৳)
            </label>
            <input
              id="pf-sale"
              type="number"
              min="0"
              step="0.01"
              value={values.salePrice}
              onChange={set('salePrice')}
              placeholder="Optional"
              className={errors.salePrice ? 'is-invalid' : ''}
            />
            <FieldError message={errors.salePrice} />
          </div>
        </div>

        <div className="admin-field">
          <label className="admin-field__label" htmlFor="pf-description">
            Description
          </label>
          <textarea
            id="pf-description"
            rows="4"
            value={values.description}
            onChange={set('description')}
            placeholder="What makes this product worth buying?"
          />
        </div>

        <ImagePicker
          existing={kept}
          files={files}
          onFiles={setFiles}
          onRemoveExisting={(url) => setKept((prev) => prev.filter((item) => item !== url))}
          max={4}
        />
      </form>
    </Modal>
  );
}

export default function AdminProducts() {
  const [draft, setDraft] = useState({ search: '', category: '', status: '', availability: '' });
  const [filters, setFilters] = useState({ search: '', category: '', status: '', availability: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchAdminCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 10 };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.availability) params.availability = filters.availability;
      setData(await fetchAdminProducts(params));
    } catch (err) {
      setError(err.message || 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = (event) => {
    event?.preventDefault?.();
    setPage(1);
    setFilters(draft);
  };

  const clearFilters = () => {
    setDraft({ search: '', category: '', status: '', availability: '' });
    setPage(1);
    setFilters({ search: '', category: '', status: '', availability: '' });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = async (product) => {
    try {
      const full = await fetchAdminProduct(product.id);
      setEditing(full);
      setFormOpen(true);
    } catch (err) {
      toast.error(err.message || 'Could not open the product.');
    }
  };

  const remove = async () => {
    if (!confirming || busy) return;
    setBusy(true);
    try {
      const result = await deleteProduct(confirming.id);
      toast.success(result.message || 'Product deleted');
      setConfirming(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete the product.');
    } finally {
      setBusy(false);
    }
  };

  const products = data?.products || [];
  const pagination = data?.pagination || {};
  const totalPages = Number(pagination.totalPages) || 1;
  const hasFilters = Boolean(filters.search || filters.category || filters.status || filters.availability);

  return (
    <section className="admin-page">
      <Helmet>
        <title>Products | EShopping Admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Products</h1>
          <p className="muted">
            {loading ? 'Loading products…' : `${pagination.total ?? products.length} product(s) in the catalogue`}
          </p>
        </div>
        <Button variant="primary" icon={FiPlus} onClick={openCreate}>
          Add product
        </Button>
      </div>

      <form className="admin-filters" onSubmit={applyFilters}>
        <input
          type="search"
          value={draft.search}
          onChange={(event) => setDraft((prev) => ({ ...prev, search: event.target.value }))}
          placeholder="Search name, SKU, brand or category"
          aria-label="Search products"
        />
        <select
          value={draft.category}
          onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={draft.status}
          onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={draft.availability}
          onChange={(event) => setDraft((prev) => ({ ...prev, availability: event.target.value }))}
          aria-label="Filter by stock"
        >
          <option value="">Any stock</option>
          <option value="in_stock">In stock</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
        <Button type="submit" variant="primary" size="sm" icon={FiSearch}>
          Apply
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Reset
          </Button>
        )}
      </form>

      {error && !data && (
        <ErrorState title="Could not load products" text={error} onRetry={load} retrying={loading} />
      )}

      {loading && !data && (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--rows">
            <tbody>
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonRow key={i} columns={7} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <>
          {products.length === 0 ? (
            <EmptyState
              icon={FiPackage}
              title={hasFilters ? 'No products match these filters' : 'No products yet'}
              text={
                hasFilters
                  ? 'Adjust the search or filters and try again.'
                  : 'Add your first product to start selling.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" icon={FiPlus} onClick={openCreate}>
                    Add product
                  </Button>
                )
              }
            />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--rows">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="admin-prod">
                          <span className="admin-prod__media">
                            {product.image ? (
                              <img src={product.image} alt={product.name} />
                            ) : (
                              <span className="admin-prod__noimg">No image</span>
                            )}
                          </span>
                          <span className="admin-prod__meta">
                            <strong>{product.name}</strong>
                            <em>{product.sku}</em>
                          </span>
                        </div>
                      </td>
                      <td>{product.category_name || '—'}</td>
                      <td>
                        <strong>{formatPrice(product.sale_price)}</strong>
                        {Number(product.original_price) > Number(product.sale_price) && (
                          <s className="admin-strike">{formatPrice(product.original_price)}</s>
                        )}
                      </td>
                      <td>
                        <span className={Number(product.stock) <= 0 ? 'admin-stock admin-stock--out' : 'admin-stock'}>
                          {Number(product.stock) <= 0 ? 'Out of stock' : `${product.stock} left`}
                        </span>
                      </td>
                      <td>
                        <StatusPill status={product.status} />
                      </td>
                      <td>{formatDate(product.created_at)}</td>
                      <td>
                        <div className="admin-actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={FiEdit2}
                            onClick={() => openEdit(product)}
                            aria-label={`Edit ${product.name}`}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={FiTrash2}
                            className="admin-actions__danger"
                            onClick={() => setConfirming(product)}
                            aria-label={`Delete ${product.name}`}
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

          {products.length > 0 && totalPages > 1 && (
            <div className="admin-pager">
              <Button
                variant="ghost"
                size="sm"
                icon={FiChevronLeft}
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="muted">
                Page {pagination.page || page} of {totalPages} · {pagination.total} total
              </span>
              <Button
                variant="ghost"
                size="sm"
                iconEnd={FiChevronRight}
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <ProductForm
        open={formOpen}
        product={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setEditing(null);
          load();
        }}
      />

      <Confirm
        open={Boolean(confirming)}
        title="Delete product"
        message={`Are you sure you want to delete "${confirming?.name}"? This removes the product and its images from the catalogue.`}
        confirmLabel="Delete product"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}