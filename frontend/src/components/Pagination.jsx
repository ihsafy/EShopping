import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

/** Builds a compact page list: 1 … 4 5 6 … 12 */
const pageList = (page, totalPages) => {
  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const list = [];
  let previous = 0;
  sorted.forEach((p) => {
    if (p - previous > 1) list.push('…');
    list.push(p);
    previous = p;
  });
  return list;
};

export default function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages } = pagination;

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__btn"
        disabled={!pagination.hasPrev}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
      >
        <FiChevronLeft size={16} />
      </button>

      {pageList(page, totalPages).map((item, index) =>
        item === '…' ? (
          <span className="pagination__gap" key={`gap-${index}`}>
            …
          </span>
        ) : (
          <button
            type="button"
            key={item}
            className={`pagination__btn ${item === page ? 'is-active' : ''}`}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onPage(item)}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        className="pagination__btn"
        disabled={!pagination.hasNext}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
      >
        <FiChevronRight size={16} />
      </button>
    </nav>
  );
}
