import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiSliders, FiTag, FiX } from 'react-icons/fi';
import FilterSidebar from '../components/FilterSidebar';
import ProductGrid from '../components/ProductGrid';
import Pagination from '../components/Pagination';
import CategoryIcon from '../components/CategoryIcon';
import { fetchCategory, fetchFilters, fetchProducts } from '../services/catalog';

const DEFAULT_SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'discount', label: 'Biggest discount' },
];

export default function Catalog({ categorySlug = null, preset = null, heading = null, headingHint = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories = [] } = useOutletContext();
  const [meta, setMeta] = useState(null);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [categoryError, setCategoryError] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const topRef = useRef(null);

  const filters = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const isCategory = Boolean(categorySlug);
  const sorts = meta?.sorts?.length ? meta.sorts : DEFAULT_SORTS;

  useEffect(() => {
    let alive = true;
    fetchFilters()
      .then((d) => alive && setMeta(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setCategoryInfo(null);
    setCategoryError('');
    if (!categorySlug) return () => { alive = false; };

    fetchCategory(categorySlug)
      .then((d) => alive && setCategoryInfo(d))
      .catch((err) => alive && setCategoryError(err.status === 404 ? 'Category not found' : err.message));
    return () => {
      alive = false;
    };
  }, [categorySlug]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    // URL state always wins; `preset` only fills in what the URL has not set
    // (used by /offers so a deep link can still override the preset sort).
    const params = { ...preset, ...filters };
    // The URL uses the friendly `q`; the API calls it `search`.
    if (params.q) {
      params.search = params.q;
      delete params.q;
    }
    if (categorySlug) params.category = categorySlug;

    fetchProducts(params)
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [filters, categorySlug, preset]);

  /** Updates URL state; any filter change resets pagination unless page itself changed. */
  const update = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) next.delete(key);
      else next.set(key, String(value));
    });
    if (!Object.prototype.hasOwnProperty.call(patch, 'page')) next.delete('page');
    setSearchParams(next);
  };

  const clearAll = () => setSearchParams(new URLSearchParams());

  const goToPage = (page) => {
    update({ page });
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const categoryName = categories.find((c) => c.slug === filters.category)?.name || filters.category;

  const chips = [];
  if (filters.q) chips.push({ id: 'q', label: `Search: “${filters.q}”`, patch: { q: '' } });
  if (!isCategory && filters.category) {
    chips.push({ id: 'category', label: categoryName, patch: { category: '', subcategory: '' } });
  }
  if (filters.subcategory) {
    chips.push({ id: 'subcategory', label: `Sub: ${filters.subcategory}`, patch: { subcategory: '' } });
  }
  String(filters.brand || '')
    .split(',')
    .filter(Boolean)
    .forEach((brand) => chips.push({ id: `brand-${brand}`, label: brand, patch: { brand: removeBrand(filters.brand, brand) } }));
  if (filters.minPrice || filters.maxPrice) {
    chips.push({
      id: 'price',
      label: `৳${filters.minPrice || 0} – ৳${filters.maxPrice || '∞'}`,
      patch: { minPrice: '', maxPrice: '' },
    });
  }
  if (filters.availability) {
    chips.push({
      id: 'availability',
      label: filters.availability === 'in_stock' ? 'In stock' : 'Out of stock',
      patch: { availability: '' },
    });
  }
  if (filters.minDiscount) {
    chips.push({ id: 'discount', label: `${filters.minDiscount}%+ off`, patch: { minDiscount: '' } });
  }

  if (categoryError) {
    return (
      <div className="container state">
        <h1>Category not found</h1>
        <p>{categoryError}</p>
        <Link to="/shop" className="btn btn--primary">
          Browse all products
        </Link>
      </div>
    );
  }

  const title = heading || (isCategory
    ? categoryInfo?.category?.name || 'Category'
    : filters.q
      ? `Search: ${filters.q}`
      : filters.category
        ? categoryName
        : 'All products');

  return (
    <div className="container catalog">
      <Helmet>
        <title>{title} | EShopping</title>
      </Helmet>

      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        {isCategory ? (
          <>
            <Link to="/shop">Shop</Link>
            <span>/</span>
            <span aria-current="page">{categoryInfo?.category?.name || categorySlug}</span>
          </>
        ) : (
          <span aria-current="page">{heading || 'Shop'}</span>
        )}
      </nav>

      {heading && !isCategory && (
        <header className="catalog__hero">
          <span className="catalog__hero-icon">
            <FiTag size={26} />
          </span>
          <div>
            <h1>{heading}</h1>
            <p>{headingHint}</p>
          </div>
        </header>
      )}

      {isCategory && (
        <header className="catalog__hero">
          <span className="catalog__hero-icon">
            <CategoryIcon name={categoryInfo?.category?.icon} size={26} />
          </span>
          <div>
            <h1>{categoryInfo?.category?.name || 'Loading…'}</h1>
            <p>{categoryInfo?.category?.description}</p>
          </div>
        </header>
      )}

      <div className="catalog__layout" ref={topRef}>
        <div className={`catalog__aside ${showFilters ? 'is-open' : ''}`}>
          <FilterSidebar
            key={`${filters.minPrice || ''}|${filters.maxPrice || ''}`}
            mode={isCategory ? 'category' : 'all'}
            categories={categories}
            subcategories={categoryInfo?.subcategories || []}
            brands={meta?.brands || []}
            priceRange={meta?.priceRange}
            filters={filters}
            onChange={update}
            onClear={clearAll}
            onClose={() => setShowFilters(false)}
          />
        </div>

        <div className="catalog__main">
          <div className="catalog__toolbar">
            <span className="catalog__count">
              {loading
                ? 'Loading…'
                : `${data?.pagination?.total ?? 0} ${data?.pagination?.total === 1 ? 'product' : 'products'}`}
            </span>
            <div className="catalog__tools">
              <button
                type="button"
                className="btn btn--ghost catalog__filter-toggle"
                onClick={() => setShowFilters((v) => !v)}
              >
                <FiSliders size={15} /> Filters
              </button>
              <label className="sort-select">
                <span className="muted">Sort</span>
                <select
                  value={filters.sort || preset?.sort || 'newest'}
                  onChange={(e) => update({ sort: e.target.value })}
                >
                  {sorts.map((sort) => (
                    <option key={sort.value} value={sort.value}>
                      {sort.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="chips">
              {chips.map((chip) => (
                <button type="button" key={chip.id} className="chip" onClick={() => update(chip.patch)}>
                  {chip.label} <FiX size={13} />
                </button>
              ))}
              <button type="button" className="chip chip--clear" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          <ProductGrid
            products={data?.products}
            loading={loading}
            error={error}
            emptyMessage="No products matched your filters. Try removing a filter or searching for something else."
          />

          <Pagination pagination={data?.pagination} onPage={goToPage} />
        </div>
      </div>

      {showFilters && <div className="filters__backdrop" onClick={() => setShowFilters(false)} />}
    </div>
  );
}

function removeBrand(value, brand) {
  return String(value || '')
    .split(',')
    .filter((b) => b && b !== brand)
    .join(',');
}
