/**
 * Loading placeholders that mirror the real layout, so content arriving never
 * shifts the page. Blocks are inert (aria-hidden) because the loading state is
 * announced once by the region that owns them.
 */

export function Skeleton({ width, height, radius, circle = false, className = '', style }) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton ${circle ? 'skeleton-circle' : ''} ${className}`.trim()}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function SkeletonText({ lines = 3, widths, className = '' }) {
  const pattern = widths || Array.from({ length: lines }, (_, i) => (i === lines - 1 ? '62%' : '100%'));
  return (
    <span className={`stack gap-2 ${className}`.trim()} aria-hidden="true">
      {pattern.map((w, i) => (
        <Skeleton key={i} className="skeleton-text" style={{ width: w }} />
      ))}
    </span>
  );
}

export function SkeletonCard() {
  return (
    <div className="card card-pad sk-card" aria-hidden="true">
      <Skeleton className="sk-card__media" />
      <SkeletonText lines={2} widths={['90%', '55%']} />
      <Skeleton height={20} width="44%" />
    </div>
  );
}

export function SkeletonRow({ columns = 5 }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: columns }, (_, i) => (
        <td key={i}>
          <Skeleton className="skeleton-text" width={i === 0 ? '70%' : '52%'} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 6, columns = 5 }) {
  return (
    <table className="table" aria-hidden="true">
      <tbody>
        {Array.from({ length: rows }, (_, i) => (
          <SkeletonRow key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  );
}

/** Announces "loading" once without spamming the screen reader per block. */
export function LoadingRegion({ label = 'Loading', children }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}