import { FiStar } from 'react-icons/fi';

export default function Stars({ value = 0, size = 14, showValue = false }) {
  const rating = Number(value) || 0;
  const full = Math.round(rating);

  return (
    <span className="stars" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <FiStar key={n} size={size} className={n <= full ? 'star star--on' : 'star'} />
      ))}
      {showValue && <span className="stars__value">{rating.toFixed(1)}</span>}
    </span>
  );
}
