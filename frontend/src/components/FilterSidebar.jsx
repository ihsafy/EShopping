import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiX } from 'react-icons/fi';

const brandList = (value) => String(value || '').split(',').filter(Boolean);

export default function FilterSidebar({
  mode = 'all',
  categories = [],
  subcategories = [],
  brands = [],
  priceRange,
  filters,
  onChange,
  onClear,
  onClose,
}) {
  const [minInput, setMinInput] = useState(filters.minPrice || '');
  const [maxInput, setMaxInput] = useState(filters.maxPrice || '');
  const selectedBrands = brandList(filters.brand);

  const applyPrice = () => {
    const min = minInput === '' ? '' : Number(minInput);
    const max = maxInput === '' ? '' : Number(maxInput);
    if (min !== '' && max !== '' && Number(min) > Number(max)) {
      const next = { minPrice: max, maxPrice: min };
      setMinInput(next.minPrice);
      setMaxInput(next.maxPrice);
      onChange(next);
      return;
    }
    onChange({ minPrice: min, maxPrice: max });
  };

  const toggleBrand = (brand) => {
    const set = new Set(selectedBrands);
    if (set.has(brand)) set.delete(brand);
    else set.add(brand);
    onChange({ brand: [...set].join(',') });
  };

  const resetPrice = () => {
    setMinInput('');
    setMaxInput('');
    onChange({ minPrice: '', maxPrice: '' });
  };

  return (
    <aside className="filters">
      <div className="filters__head">
        <h2>Filters</h2>
        <button type="button" className="filters__close" onClick={onClose} aria-label="Close filters">
          <FiX size={18} />
        </button>
      </div>

      <section className="filters__group">
        <h3>{mode === 'category' ? 'Subcategory' : 'Category'}</h3>
        {mode === 'category' ? (
          <ul className="filters__list">
            <li>
              <button
                type="button"
                className={!filters.subcategory ? 'is-active' : ''}
                onClick={() => onChange({ subcategory: '' })}
              >
                All items
              </button>
            </li>
            {subcategories.map((sub) => (
              <li key={sub.id}>
                <button
                  type="button"
                  className={filters.subcategory === sub.slug ? 'is-active' : ''}
                  onClick={() => onChange({ subcategory: sub.slug })}
                >
                  {sub.name} <span className="muted">{sub.product_count}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="filters__list">
            <li>
              <button
                type="button"
                className={!filters.category ? 'is-active' : ''}
                onClick={() => onChange({ category: '', subcategory: '' })}
              >
                All categories
              </button>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/category/${category.slug}`}
                  className={filters.category === category.slug ? 'is-active' : ''}
                >
                  {category.name} <span className="muted">{category.product_count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="filters__group">
        <h3>Price</h3>
        <div className="price-inputs">
          <input
            type="number"
            min="0"
            placeholder="Min"
            aria-label="Minimum price"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
          />
          <span>–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            aria-label="Maximum price"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
          />
        </div>
        <div className="filters__range muted">
          {priceRange ? `৳${priceRange.minPrice} – ৳${priceRange.maxPrice}` : 'Loading range…'}
          {(filters.minPrice || filters.maxPrice) && (
            <button type="button" onClick={resetPrice}>
              Reset
            </button>
          )}
        </div>
      </section>

      <section className="filters__group">
        <h3>Brand</h3>
        {brands.length ? (
          <ul className="filters__checks">
            {brands.map((brand) => (
              <li key={brand}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleBrand(brand)}
                  />
                  <span>{brand}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Loading brands…</p>
        )}
      </section>

      <section className="filters__group">
        <h3>Availability</h3>
        <ul className="filters__checks">
          {[
            ['', 'Any'],
            ['in_stock', 'In stock'],
            ['out_of_stock', 'Out of stock'],
          ].map(([value, label]) => (
            <li key={label}>
              <label>
                <input
                  type="radio"
                  name="availability"
                  checked={(filters.availability || '') === value}
                  onChange={() => onChange({ availability: value })}
                />
                <span>{label}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className="btn btn--ghost filters__clear" onClick={onClear}>
        Clear all filters
      </button>
    </aside>
  );
}
