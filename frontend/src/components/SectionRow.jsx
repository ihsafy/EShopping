import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';

/**
 * Horizontal "see also" shelf. `compact` renders it as a responsive grid of
 * small recommendation cards (home stays a scrolling shelf) - used by the
 * product page's "You may also like".
 */
export default function SectionRow({ title, products, moreLink, compact = false }) {
  if (!products?.length) return null;

  return (
    <section className={`section-row${compact ? ' section-row--compact' : ''}`}>
      <div className="section-row__head">
        <h2>{title}</h2>
        {moreLink && (
          <Link to={moreLink} className="section-row__more">
            See all
          </Link>
        )}
      </div>
      <div className="section-row__track">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
