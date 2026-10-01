import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Reveals children once they scroll into view.
 * Falls back to visible immediately when IntersectionObserver is missing, and
 * respects prefers-reduced-motion by skipping the transform entirely.
 */
export default function Reveal({ as: As = 'div', delay = 0, className = '', style, children, ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const mergedStyle = useMemo(
    () => (delay ? { ...style, transitionDelay: `${delay}ms` } : style),
    [delay, style]
  );

  return (
    <As
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </As>
  );
}