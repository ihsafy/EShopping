import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiHeart, FiMinus, FiPlus, FiShoppingCart, FiTruck, FiShield, FiRefreshCw } from 'react-icons/fi';
import Stars from '../components/Stars';
import SectionRow from '../components/SectionRow';
import ProductGallery from '../components/ProductGallery';
import { fetchProductDetail, fetchReviewEligibility, submitReview } from '../services/catalog';
import { addToCart } from '../services/cart';
import { addToWishlist } from '../services/wishlist';
import { getToken, setToken } from '../services/client';
import { formatPrice, discountPercent, formatDate } from '../utils/format';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { store } = useOutletContext();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = getToken();
  const product = data?.product;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setData(null);
    setQty(1);

    fetchProductDetail(slug)
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err.status === 404 ? 'Product not found' : err.message))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    setEligibility(null);
    if (!token || !product) return undefined;
    let alive = true;
    fetchReviewEligibility(product.slug)
      .then((d) => alive && setEligibility(d))
      .catch(() => alive && setEligibility(null));
    return () => {
      alive = false;
    };
  }, [token, product]);

  const requireSignIn = () => {
    toast.error('Please sign in to continue');
    navigate('/login');
  };

  const handleAddToCart = async () => {
    if (!token) return requireSignIn();
    setBusy(true);
    try {
      await addToCart(product.id, qty);
      toast.success(`${product.name} added to your cart`);
    } catch (err) {
      if (err.status === 401) {
        setToken('');
        requireSignIn();
      } else {
        toast.error(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleWishlist = async () => {
    if (!token) return requireSignIn();
    setBusy(true);
    try {
      const result = await addToWishlist(product.id);
      toast.success(result.message || 'Added to your wishlist');
    } catch (err) {
      if (err.status === 401) {
        setToken('');
        requireSignIn();
      } else {
        toast.error(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReview = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitReview(product.id, { rating: Number(rating), review: reviewText });
      toast.success(result.message || 'Thanks for your review!');
      setReviewText('');
      const fresh = await fetchProductDetail(slug);
      setData(fresh);
      setEligibility(await fetchReviewEligibility(product.slug).catch(() => null));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container detail">
        <Helmet>
          <title>Loading product… | EShopping</title>
        </Helmet>
        <div className="detail__grid">
          <div className="skeleton skeleton--media detail__gallery-main" />
          <div className="detail__info">
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--price" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container state">
        <Helmet>
          <title>{error === 'Product not found' ? 'Product not found' : 'Error'} | EShopping</title>
        </Helmet>
        <h1>{error === 'Product not found' ? 'Product not found' : 'Something went wrong'}</h1>
        <p>{error === 'Product not found' ? 'This product may have been removed or the link is wrong.' : error}</p>
        <Link to="/shop" className="btn btn--primary">
          Browse products
        </Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [{ image_url: product.image, alt_text: product.name }];
  const discount = discountPercent(product);
  const inStock = Number(product.stock) > 0;
  const reviews = data.reviews || { reviews: [], total: 0, average: 0, breakdown: {} };
  const maxBreakdown = Math.max(1, ...Object.values(reviews.breakdown || {}));

  return (
    <div className="container detail">
      <Helmet>
        <title>{product.name} | EShopping</title>
        {product.seo_description && <meta name="description" content={product.seo_description} />}
      </Helmet>

      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/shop">Shop</Link>
        <span>/</span>
        {product.category_slug && (
          <>
            <Link to={`/category/${product.category_slug}`}>{product.category_name}</Link>
            <span>/</span>
          </>
        )}
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="detail__grid">
        <ProductGallery key={slug} images={images} alt={product.name} discount={discount} />

        <div className="detail__info">
          <div className="detail__meta">
            {product.brand && <span className="detail__brand">{product.brand}</span>}
            <span className="muted">SKU: {product.sku}</span>
          </div>

          <h1 className="detail__title">{product.name}</h1>

          <div className="detail__rating">
            <Stars value={product.rating_avg} showValue />
            <span className="muted">
              {reviews.total} {reviews.total === 1 ? 'review' : 'reviews'}
            </span>
            <span className={`stock ${inStock ? 'stock--in' : 'stock--out'}`}>
              {inStock ? `In stock (${product.stock})` : 'Out of stock'}
            </span>
          </div>

          {product.short_description && <p className="detail__short">{product.short_description}</p>}

          <div className="detail__price">
            <strong>{formatPrice(product.sale_price)}</strong>
            {Number(product.original_price) > Number(product.sale_price) && (
              <s>{formatPrice(product.original_price)}</s>
            )}
            {discount > 0 && <span className="detail__save">Save {discount}%</span>}
          </div>

          <div className="detail__actions">
            <div className="qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                <FiMinus size={14} />
              </button>
              <span>{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(Number(product.stock) || 1, q + 1))}
                aria-label="Increase quantity"
              >
                <FiPlus size={14} />
              </button>
            </div>

            <button
              type="button"
              className="btn btn--primary detail__buy"
              disabled={!inStock || busy}
              onClick={handleAddToCart}
            >
              <FiShoppingCart size={16} />
              {!token ? 'Sign in to buy' : inStock ? 'Add to cart' : 'Out of stock'}
            </button>

            <button
              type="button"
              className="btn btn--ghost detail__wish"
              disabled={busy}
              onClick={handleWishlist}
              aria-label="Add to wishlist"
            >
              <FiHeart size={16} />
            </button>
          </div>

          <ul className="detail__shipping">
            <li>
              <FiTruck size={15} />
              {store ? `Delivery ৳${store.insideDhakaFee} inside Dhaka · ৳${store.outsideDhakaFee} outside` : 'Delivery calculated at checkout'}
            </li>
            <li>
              <FiShield size={15} />
              {store?.freeDeliveryOver ? `Free delivery on orders over ${formatPrice(store.freeDeliveryOver)}` : 'Cash on delivery available'}
            </li>
            <li>
              <FiRefreshCw size={15} />
              {store?.allowCancel ? 'Cancel before shipping' : 'Contact support for returns'}
            </li>
          </ul>
        </div>
      </div>

      <div className="detail__panels">
        <section className="panel">
          <h2>Description</h2>
          <p className="panel__text">{product.description || product.short_description || 'No description available.'}</p>

          {product.specs?.length > 0 && (
            <>
              <h3>Specifications</h3>
              <table className="specs">
                <tbody>
                  {product.specs.map((spec) => (
                    <tr key={`${spec.spec_key}-${spec.spec_value}`}>
                      <th>{spec.spec_key}</th>
                      <td>{spec.spec_value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {product.tags && (
            <p className="detail__tags">
              <span className="muted">Tags:</span>{' '}
              {String(product.tags)
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
                .map((tag) => (
                  <Link key={tag} to={`/shop?q=${encodeURIComponent(tag)}`} className="tag">
                    {tag}
                  </Link>
                ))}
            </p>
          )}
        </section>

        <section className="panel">
          <h2>
            Reviews <span className="muted">({reviews.total})</span>
          </h2>

          <div className="reviews__summary">
            <div className="reviews__score">
              <strong>{Number(reviews.average).toFixed(1)}</strong>
              <Stars value={reviews.average} />
              <span className="muted">{reviews.total} ratings</span>
            </div>
            <div className="reviews__bars">
              {[5, 4, 3, 2, 1].map((star) => (
                <div className="reviews__bar" key={star}>
                  <span>{star}★</span>
                  <div className="reviews__track">
                    <div
                      className="reviews__fill"
                      style={{ width: `${((reviews.breakdown?.[star] || 0) / maxBreakdown) * 100}%` }}
                    />
                  </div>
                  <span className="muted">{reviews.breakdown?.[star] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {reviews.reviews.length ? (
            <ul className="reviews__list">
              {reviews.reviews.map((review) => (
                <li key={review.id} className="review">
                  <div className="review__head">
                    <strong>{review.user_name}</strong>
                    <Stars value={review.rating} size={13} />
                    <span className="muted">{formatDate(review.created_at)}</span>
                  </div>
                  {review.review && <p>{review.review}</p>}
                  {review.order_status && <span className="muted">Verified purchase</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No reviews yet for this product.</p>
          )}

          <div className="review__form">
            <h3>Write a review</h3>
            {!token ? (
              <p className="hint">Sign in to check whether you can review this product.</p>
            ) : eligibility?.alreadyReviewed ? (
              <p className="hint">You have already reviewed this product. Your rating is shown above.</p>
            ) : eligibility?.purchased ? (
              <form onSubmit={handleReview}>
                <label className="review__rating">
                  <span>Your rating</span>
                  <select value={rating} onChange={(e) => setRating(e.target.value)}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} star{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <textarea
                  rows={4}
                  maxLength={2000}
                  placeholder="Share how it worked for you…"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                />
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit review'}
                </button>
              </form>
            ) : eligibility ? (
              <p className="hint">Only customers who purchased this product can write a review.</p>
            ) : (
              <p className="hint">Checking whether you can review this product…</p>
            )}
          </div>
        </section>
      </div>

      <SectionRow
        compact
        title="You may also like"
        products={data.related}
        moreLink={`/shop?category=${product.category_slug || ''}`}
      />
    </div>
  );
}
