import { Skeleton, SkeletonText } from './Skeleton';

/**
 * Route-level loading surface shown while a lazy chunk downloads.
 * It mirrors the shape of a typical page so the swap to real content is calm
 * rather than a layout jump.
 */
export function PageFallback() {
  return (
    <div className="container" style={{ paddingBlock: 'var(--sp-10)' }}>
      <div role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading page</span>
        <Skeleton className="skeleton-title" style={{ width: '34%', height: '1.7rem' }} />
        <div style={{ height: 'var(--sp-3)' }} />
        <SkeletonText lines={2} widths={['62%', '42%']} />
        <div className="product-grid" style={{ marginTop: 'var(--sp-8)' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div className="card sk-card" key={i} aria-hidden="true">
              <Skeleton className="sk-card__media" />
              <SkeletonText lines={2} widths={['88%', '54%']} />
              <Skeleton height={18} width="42%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PageFallback;