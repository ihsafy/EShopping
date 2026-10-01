import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiPackage } from 'react-icons/fi';
import Button from '../../components/ui/Button';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { fetchAdminProducts, updateProduct, fetchAdminSettings, saveSettings } from '../../services/admin';
import { formatPrice } from '../../utils/format';

const LIMITS = [
  { key: 'featured_limit', label: 'Featured products per page' },
  { key: 'best_seller_limit', label: 'Best sellers per page' },
  { key: 'new_arrival_limit', label: 'New arrivals per page' },
];

const TOGGLES = [
  { key: 'featured', column: 'Featured', field: 'featured' },
  { key: 'best_seller', column: 'Best seller', field: 'bestSeller' },
  { key: 'new_arrival', column: 'New arrival', field: 'newArrival' },
];

export default function AdminFeatured() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [savingLimits, setSavingLimits] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [result, storeSettings] = await Promise.all([
        fetchAdminProducts({ page: 1, limit: 60, status: 'active' }),
        fetchAdminSettings(),
      ]);
      setProducts(result.products || []);
      setSettings(storeSettings);
      setDraft({
        featured_limit: storeSettings.featured_limit || '8',
        best_seller_limit: storeSettings.best_seller_limit || '8',
        new_arrival_limit: storeSettings.new_arrival_limit || '8',
      });
    } catch (err) {
      setError(err.message || 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (product, toggleDef) => {
    const key = `${product.id}:${toggleDef.key}`;
    setSavingKey(key);
    try {
      const next = !Number(product[toggleDef.key]);
      await updateProduct(product.id, { [toggleDef.field]: next });
      setProducts((prev) =>
        prev.map((row) => (row.id === product.id ? { ...row, [toggleDef.key]: next ? 1 : 0 } : row))
      );
      toast.success(`${product.name}: ${toggleDef.column} ${next ? 'on' : 'off'}`);
    } catch (err) {
      toast.error(err.message || 'Could not update the product.');
    } finally {
      setSavingKey('');
    }
  };

  const saveLimits = async (event) => {
    event.preventDefault();
    if (savingLimits) return;
    setSavingLimits(true);
    try {
      const patch = {};
      LIMITS.forEach(({ key }) => {
        patch[key] = String(Math.max(1, Number(draft[key]) || 1));
      });
      const result = await saveSettings(patch);
      setSettings(result.settings || settings);
      setDraft((prev) => ({ ...prev, ...patch }));
      toast.success(result.message || 'Section limits saved');
    } catch (err) {
      toast.error(err.message || 'Could not save the limits.');
    } finally {
      setSavingLimits(false);
    }
  };

  const filtered = search
    ? products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <section className="admin-page">
      <Helmet>
        <title>Featured products | EShopping Admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Featured products</h1>
          <p className="muted">Choose which products fill the homepage rows shoppers see first.</p>
        </div>
      </div>

      {error && !settings && (
        <ErrorState title="Could not load products" text={error} onRetry={load} retrying={loading} />
      )}

      {error && settings && (
        <div className="alert alert-error" role="alert">
          {error}{' '}
          <Button variant="ghost" size="sm" onClick={load}>
            Try again
          </Button>
        </div>
      )}

      <form className="admin-panel admin-form" onSubmit={saveLimits}>
        <div className="admin-form__row">
          {LIMITS.map(({ key, label }) => (
            <div className="admin-field" key={key}>
              <label className="admin-field__label" htmlFor={key}>
                {label}
              </label>
              <input
                id={key}
                type="number"
                min="1"
                value={draft[key] ?? ''}
                onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))}
              />
            </div>
          ))}
          <div className="admin-field admin-field--action">
            <Button type="submit" variant="primary" loading={savingLimits} disabled={!settings}>
              {savingLimits ? 'Saving…' : 'Save limits'}
            </Button>
          </div>
        </div>
      </form>

      <div className="admin-filters">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter products by name"
          aria-label="Filter products"
        />
      </div>

      {loading ? (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--rows">
            <tbody>
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonRow key={i} columns={5} />
              ))}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FiPackage}
          title="No products match"
          text="Add products first, then flag them here."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--rows">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                {TOGGLES.map(({ column }) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="admin-prod">
                      <span className="admin-prod__media">
                        {product.image ? (
                          <img src={product.image} alt={product.name} />
                        ) : (
                          <span className="admin-prod__noimg">—</span>
                        )}
                      </span>
                      <span className="admin-prod__meta">
                        <strong>{product.name}</strong>
                        <em>{product.category_name}</em>
                      </span>
                    </div>
                  </td>
                  <td>{formatPrice(product.sale_price)}</td>
                  {TOGGLES.map((toggleDef) => (
                    <td key={toggleDef.key}>
                      <label className="admin-switch">
                        <input
                          type="checkbox"
                          checked={Boolean(Number(product[toggleDef.key]))}
                          disabled={savingKey === `${product.id}:${toggleDef.key}`}
                          onChange={() => toggle(product, toggleDef)}
                        />
                        <span aria-hidden="true" />
                        <em>
                          {Number(product[toggleDef.key]) ? 'On' : 'Off'}
                        </em>
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
