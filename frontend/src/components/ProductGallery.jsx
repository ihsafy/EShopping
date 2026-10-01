import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronLeft, FiChevronRight, FiMaximize, FiX } from 'react-icons/fi';

/** Moderate magnification (the spec forbids aggressive zoom). */
const ZOOM = 1.9;
const VIEWER_MIN = 1;
const VIEWER_MAX = 4;
const DOUBLE_TAP_MS = 280;
const SWIPE_PX = 55;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Product image area: thumbnails (only when there is more than one picture),
 * a hover magnifier for pointer devices and a full-screen viewer for touch
 * devices. The artwork itself is always the original file - nothing is
 * cropped, upscaled or re-fetched, and the frame keeps a fixed size so
 * switching pictures never shifts the page.
 */
export default function ProductGallery({ images, alt = 'Product image', discount = 0 }) {
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Full-screen viewer transform (kept in a ref: touchmove must never wait
  // for a React render).
  const stageRef = useRef(null);
  const viewerImgRef = useRef(null);
  const zoomRef = useRef({ scale: 1, x: 0, y: 0 });
  const gestureRef = useRef(null);
  const lastTapRef = useRef(0);

  // Desktop magnifier.
  const mainRef = useRef(null);
  const imgRef = useRef(null);

  const count = images.length;
  const current = images[index] || images[0];

  const go = useCallback(
    (next) => {
      if (!count) return;
      setIndex((next + count) % count);
    },
    [count]
  );

  /* ------------------------------------------------------------------ *
   * Desktop hover magnifier
   * ------------------------------------------------------------------ */
  const supportsHover =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const zoomAt = (clientX, clientY) => {
    const box = mainRef.current?.getBoundingClientRect();
    const img = imgRef.current;
    if (!box || !img) return;
    const x = clientX - box.left;
    const y = clientY - box.top;
    // Keep the point under the pointer fixed while scaling around (0,0).
    img.style.transformOrigin = '0 0';
    img.style.transform = `translate(${(1 - ZOOM) * x}px, ${(1 - ZOOM) * y}px) scale(${ZOOM})`;
    mainRef.current.classList.add('is-zooming');
  };

  const zoomOff = () => {
    const img = imgRef.current;
    if (img) img.style.transform = 'none';
    mainRef.current?.classList.remove('is-zooming');
  };

  /* ------------------------------------------------------------------ *
   * Full-screen viewer
   * ------------------------------------------------------------------ */
  const applyTransform = useCallback(() => {
    const img = viewerImgRef.current;
    if (!img) return;
    const { scale, x, y } = zoomRef.current;
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }, []);

  const setZoom = useCallback(
    (scale, x = 0, y = 0) => {
      const next = clamp(scale, VIEWER_MIN, VIEWER_MAX);
      const stage = stageRef.current;
      const maxX = stage ? (stage.clientWidth * (next - 1)) / 2 : 0;
      const maxY = stage ? (stage.clientHeight * (next - 1)) / 2 : 0;
      zoomRef.current = {
        scale: next,
        x: next === 1 ? 0 : clamp(x, -maxX, maxX),
        y: next === 1 ? 0 : clamp(y, -maxY, maxY),
      };
      applyTransform();
    },
    [applyTransform]
  );

  const resetZoom = useCallback(() => {
    zoomRef.current = { scale: 1, x: 0, y: 0 };
    applyTransform();
  }, [applyTransform]);

  const closeViewer = useCallback(() => {
    if (window.history.state?.eshoppingViewer) window.history.back();
    else {
      setViewerOpen(false);
      resetZoom();
    }
  }, [resetZoom]);

  const openViewer = useCallback(
    (nextIndex) => {
      setIndex(nextIndex ?? index);
      resetZoom();
      setViewerOpen(true);
      window.history.pushState({ ...(window.history.state || {}), eshoppingViewer: 1 }, '');
    },
    [index, resetZoom]
  );

  // Browser back closes the viewer instead of leaving the product page.
  useEffect(() => {
    if (!viewerOpen) return undefined;
    const onPopState = () => {
      setViewerOpen(false);
      resetZoom();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') closeViewer();
      if (event.key === 'ArrowRight') go(index + 1);
      if (event.key === 'ArrowLeft') go(index - 1);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKey);
    };
  }, [viewerOpen, closeViewer, go, index, resetZoom]);

  const stagePoint = (event) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.getBoundingClientRect();
    return {
      x: event.clientX - (rect.left + rect.width / 2),
      y: event.clientY - (rect.top + rect.height / 2),
    };
  };

  const onTouchStart = (event) => {
    const touches = event.touches;
    if (touches.length >= 2) {
      const [a, b] = [touches[0], touches[1]];
      gestureRef.current = {
        mode: 'pinch',
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        scale: zoomRef.current.scale,
        mid: { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 },
      };
      return;
    }
    const t = touches[0];
    gestureRef.current = {
      mode: zoomRef.current.scale > 1 ? 'pan' : 'swipe',
      startX: t.clientX,
      startY: t.clientY,
      originX: zoomRef.current.x,
      originY: zoomRef.current.y,
    };
  };

  const onTouchMove = (event) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    if (gesture.mode === 'pinch') {
      const [a, b] = [event.touches[0], event.touches[1]];
      if (!a || !b) return;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const stage = stageRef.current;
      const rect = stage?.getBoundingClientRect();
      const mid = rect
        ? { x: (a.clientX + b.clientX) / 2 - (rect.left + rect.width / 2), y: (a.clientY + b.clientY) / 2 - (rect.top + rect.height / 2) }
        : { x: 0, y: 0 };
      const scale = clamp(gesture.scale * (dist / (gesture.dist || dist)), VIEWER_MIN, VIEWER_MAX);
      setZoom(scale, (1 - scale) * mid.x, (1 - scale) * mid.y);
      event.preventDefault();
      return;
    }
    if (gesture.mode === 'pan') {
      const t = event.touches[0];
      setZoom(zoomRef.current.scale, gesture.originX + (t.clientX - gesture.startX), gesture.originY + (t.clientY - gesture.startY));
      event.preventDefault();
      return;
    }
    // Horizontal swipe preview while the picture is at 1x.
    const t = event.touches[0];
    const dx = t.clientX - gesture.startX;
    const dy = t.clientY - gesture.startY;
    if (Math.abs(dx) > Math.abs(dy)) {
      const img = viewerImgRef.current;
      if (img) img.style.transform = `translateX(${dx * 0.35}px)`;
      event.preventDefault();
    }
  };

  const onTouchEnd = (event) => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    const img = viewerImgRef.current;
    if (gesture?.mode === 'swipe' && img) {
      const t = event.changedTouches[0];
      const dx = (t?.clientX || 0) - gesture.startX;
      const dy = (t?.clientY || 0) - gesture.startY;
      img.style.transform = '';
      if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
        go(index + (dx < 0 ? 1 : -1));
      }
      return;
    }
    if (gesture?.mode === 'pinch' || gesture?.mode === 'pan') return;

    // Double tap: zoom in around the tapped point (or back out).
    const now = Date.now();
    const t = event.changedTouches?.[0];
    if (t && now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      const point = stagePoint({ clientX: t.clientX, clientY: t.clientY });
      const next = zoomRef.current.scale > 1 ? 1 : 2.2;
      setZoom(next, (1 - next) * point.x, (1 - next) * point.y);
    } else {
      lastTapRef.current = now;
    }
  };

  const onDoubleClick = (event) => {
    const point = stagePoint(event);
    const next = zoomRef.current.scale > 1 ? 1 : 2.2;
    setZoom(next, (1 - next) * point.x, (1 - next) * point.y);
  };

  // Mouse drag to pan while zoomed in.
  const dragRef = useRef(null);
  const onMouseDown = (event) => {
    if (zoomRef.current.scale <= 1) return;
    dragRef.current = { x: event.clientX, y: event.clientY, ox: zoomRef.current.x, oy: zoomRef.current.y };
  };
  const onMouseMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    setZoom(zoomRef.current.scale, drag.ox + (event.clientX - drag.x), drag.oy + (event.clientY - drag.y));
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  if (!count) return null;

  return (
    <div className="detail__gallery">
      {count > 1 && (
        <div className="detail__thumbs" role="tablist" aria-label="Product images">
          {images.map((img, i) => (
            <button
              type="button"
              key={img.id || i}
              role="tab"
              aria-selected={i === index}
              className={`detail__thumb ${i === index ? 'is-active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`View image ${i + 1}`}
            >
              <img src={img.image_url} alt={img.alt_text || alt} loading={i === 0 ? 'eager' : 'lazy'} />
            </button>
          ))}
        </div>
      )}

      <div
        className="detail__main-image"
        ref={mainRef}
        onClick={() => openViewer(index)}
        onMouseMove={supportsHover ? (e) => zoomAt(e.clientX, e.clientY) : undefined}
        onMouseLeave={supportsHover ? zoomOff : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openViewer(index);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Open full-screen image"
      >
        {discount > 0 && <span className="badge badge--discount">-{discount}%</span>}
        <img
          ref={imgRef}
          src={current.image_url}
          alt={current.alt_text || alt}
          draggable={false}
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden';
          }}
        />
        <span className="detail__main-image__hint">
          <FiMaximize size={12} /> Click to enlarge
        </span>
      </div>

      {viewerOpen &&
        createPortal(
          <div
            className="pviewer"
            role="dialog"
            aria-modal="true"
            aria-label={`${alt} - full screen`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onDoubleClick={onDoubleClick}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            <div className="pviewer__bar">
              <span className="pviewer__count">
                {index + 1} / {count}
              </span>
              <button type="button" className="pviewer__close" aria-label="Close image viewer" onClick={closeViewer}>
                <FiX size={22} />
              </button>
            </div>

            <div className="pviewer__stage" ref={stageRef}>
              <img ref={viewerImgRef} src={current.image_url} alt={current.alt_text || alt} draggable={false} />
            </div>

            {count > 1 && (
              <>
                <button type="button" className="pviewer__nav pviewer__nav--prev" aria-label="Previous image" onClick={() => go(index - 1)}>
                  <FiChevronLeft size={26} />
                </button>
                <button type="button" className="pviewer__nav pviewer__nav--next" aria-label="Next image" onClick={() => go(index + 1)}>
                  <FiChevronRight size={26} />
                </button>
              </>
            )}

            <p className="pviewer__hint">Pinch to zoom · double-tap to enlarge · swipe to change picture</p>
          </div>,
          document.body
        )}
    </div>
  );
}
