import ProductCard from './ProductCard';

const SKELETONS = [0, 1, 2, 3, 4, 5, 6, 7];

export default function ProductGrid({ products, loading, error, emptyMessage }) {
  if (loading) {
    return (
      <div className="product-grid" aria-busy="true">
        {SKELETONS.map((n) => (
          <div className="product-card product-card--skeleton" key={n}>
            <div className="skeleton skeleton--media" />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line skeleton--short" />
            <div className="skeleton skeleton--price" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="state state--error">Could not load products: {error}</div>;
  }

  if (!products?.length) {
    return <div className="state">{emptyMessage || 'No products matched your filters.'}</div>;
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
