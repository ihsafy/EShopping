import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiArrowRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import SectionRow from '../components/SectionRow';
import CategoryIcon from '../components/CategoryIcon';
import { fetchBanners, fetchHome } from '../services/catalog';

const SECTIONS = [
  ['featured', 'Featured products', ''],
  ['bestSellers', 'Best sellers', 'sort=popular'],
  ['newArrivals', 'New arrivals', 'sort=newest'],
  ['discounted', 'On discount', 'minDiscount=10&sort=discount'],
  ['topRated', 'Top rated', 'sort=rating'],
];

export default function Home() {
  // The layout already loads the category strip once for every page, so the
  // homepage reuses it instead of requesting /categories a second time.
  const { categories = [] } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [home, setHome] = useState(null);
  const [banners, setBanners] = useState([]);
  const [slide, setSlide] = useState(0);
  // Callback ref, not useRef: the strip only mounts once the home data has
  // loaded, and the effect below has to run when it actually appears.
  const [strip, setStrip] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchHome(), fetchBanners()])
      .then(([homeData, bannerData]) => {
        if (!alive) return;
        setHome(homeData);
        setBanners(bannerData || []);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return undefined;
    const id = setInterval(() => setSlide((s) => (s + 1) % banners.length), 6000);
    return () => clearInterval(id);
  }, [banners.length]);

  // The strip is a horizontal scroller, so the chevrons have to follow the
  // scroll offset, the viewport width and the category list.
  useEffect(() => {
    if (!strip) return undefined;

    const update = () => {
      const max = strip.scrollWidth - strip.clientWidth;
      setCanScrollLeft(strip.scrollLeft > 2);
      setCanScrollRight(strip.scrollLeft < max - 2);
    };

    update();
    strip.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      strip.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [strip, categories.length]);

  const nudgeStrip = (direction) => {
    if (!strip) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    strip.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  if (loading) return <div className="state state--loading">Loading the store…</div>;
  if (error) return <div className="state state--error">Could not load the store: {error}</div>;

  const sections = home?.sections || {};
  const active = banners.filter((b) => b.status !== 'hidden');
  const hero = active[slide];

  return (
    <div className="home">
      <Helmet>
        <title>EShopping — everything you love, delivered</title>
      </Helmet>
      {hero && (
        <section className="hero" style={{ backgroundImage: `url(${hero.image_url})` }}>
          <div className="hero__overlay" />
          <div className="container hero__content">
            <span className="hero__eyebrow">{hero.subtitle}</span>
            <h1>{hero.title}</h1>
            <Link to={hero.button_link || '/shop'} className="btn btn--primary">
              {hero.button_text || 'Shop now'}
            </Link>
          </div>
          {active.length > 1 && (
            <>
              <button
                type="button"
                className="hero__nav hero__nav--prev"
                aria-label="Previous banner"
                onClick={() => setSlide((s) => (s - 1 + active.length) % active.length)}
              >
                <FiArrowLeft size={18} />
              </button>
              <button
                type="button"
                className="hero__nav hero__nav--next"
                aria-label="Next banner"
                onClick={() => setSlide((s) => (s + 1) % active.length)}
              >
                <FiArrowRight size={18} />
              </button>
              <div className="hero__dots">
                {active.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    className={i === slide ? 'is-active' : ''}
                    aria-label={`Go to banner ${i + 1}`}
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <section className="container category-strip">
        <div className="category-strip__inner">
          <button
            type="button"
            className="category-strip__nav category-strip__nav--prev"
            onClick={() => nudgeStrip('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll categories left"
          >
            <FiChevronLeft aria-hidden="true" />
          </button>

          <div className="category-strip__track no-scrollbar" ref={setStrip}>
            {categories.map((category) => (
              <Link key={category.id} to={`/category/${category.slug}`} className="category-chip">
                <span className="category-chip__icon">
                  <CategoryIcon name={category.icon} />
                </span>
                <span className="category-chip__body">
                  <span className="category-chip__name">{category.name}</span>
                  <span className="category-chip__count">
                    {category.product_count ?? 0}{' '}
                    {(category.product_count ?? 0) === 1 ? 'item' : 'items'}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <button
            type="button"
            className="category-strip__nav category-strip__nav--next"
            onClick={() => nudgeStrip('right')}
            disabled={!canScrollRight}
            aria-label="Scroll categories right"
          >
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      </section>

      <div className="container home__sections">
        {SECTIONS.map(([key, label, query]) => (
          <SectionRow
            key={key}
            title={label}
            products={sections[key]}
            moreLink={query ? `/shop?${query}` : '/shop'}
          />
        ))}
      </div>

      <section className="container perks">
        <div><strong>Fast delivery</strong><span>Inside Dhaka {`৳60`}, outside {`৳120`}</span></div>
        <div><strong>Free shipping</strong><span>On orders over ৳5,000</span></div>
        <div><strong>Secure payment</strong><span>Cash on delivery supported</span></div>
        <div><strong>Easy returns</strong><span>Cancellable before shipping</span></div>
      </section>
    </div>
  );
}
