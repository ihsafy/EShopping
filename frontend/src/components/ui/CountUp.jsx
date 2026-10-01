import { useEffect, useRef, useState } from 'react';

/**
 * Counts a metric up to its final value.
 * Only runs once per value, is skipped for reduced motion, and always renders
 * the real number as text for assistive tech.
 */
export default function CountUp({ value, duration = 900, format = (n) => Math.round(n).toLocaleString('en-US') }) {
  const [display, setDisplay] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? value : 0
  );
  const frame = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    if (typeof window === 'undefined') return undefined;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target);
      return undefined;
    }

    const from = 0;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo keeps the last digits from crawling.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(from + (target - from) * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return (
    <>
      <span aria-hidden="true">{format(display)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}