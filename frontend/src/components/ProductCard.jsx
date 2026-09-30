import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiHeart, FiStar, FiShoppingCart } from 'react-icons/fi';
import { addToCart } from '../services/cart';
import { addToWishlist } from '../services/wishlist';
import { getToken } from '../services/client';
import { formatPrice, formatRating, discountPercent } from '../utils/format';

export default function ProductCard({ product }) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (!product) return null;

  const discount = discountPercent(product);
  const rating = Number(product.rating_avg) || 0;
  const outOfStock = Number(product.stock) === 0;

  const requireSignIn = () => {
    toast.error('Please sign in to continue');
    navigate('/login');
  };

  const handleAddToCart = async () => {
    if (!getToken()) return requireSignIn();
    setBusy(true);
    try {
      const result = await addToCart(product.id, 1);
      toast.success(result?.message || `${product.name} added to your cart`);
    } catch (err) {
      if (err.status === 401) requireSignIn();
      else toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleWishlist = async () => {
    if (!getToken()) return requireSignIn();
    setBusy(true);
    try {
      const result = await addToWishlist(product.id);
      toast.success(result?.message || 'Added to your wishlist');
    } catch (err) {
      if (err.status === 401) requireSignIn();
      else toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="product-card">
      <Link to={`/product/${product.slug}`} className="product-card__media">
        {discount > 0 && <span className="badge badge--discount">-{discount}%</span>}
        <span className="badge badge--stock">{outOfStock ? 'Out of stock' : 'In stock'}</span>
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <div className="product-card__placeholder">No image</div>
        )}
      </Link>

      <div className="product-card__body">
        <span className="product-card__category">
          {product.category_name || 'General'}
        </span>
        <h3 className="product-card__title">
          <Link to={`/product/${product.slug}`}>{product.name}</Link>
        </h3>

        <div className="product-card__rating">
          <FiStar size={13} className={rating > 0 ? 'star star--on' : 'star'} />
          <span>{rating > 0 ? formatRating(product.rating_avg) : 'New'}</span>
          {Number(product.rating_count) > 0 && (
            <span className="muted">({product.rating_count})</span>
          )}
        </div>

        <div className="product-card__price">
          <strong>{formatPrice(product.sale_price)}</strong>
          {Number(product.original_price) > Number(product.sale_price) && (
            <s>{formatPrice(product.original_price)}</s>
          )}
        </div>

        <div className="product-card__actions">
          <button
            type="button"
            className="btn btn--primary product-card__cart"
            onClick={handleAddToCart}
            disabled={busy || outOfStock}
          >
            <FiShoppingCart size={15} />
            {outOfStock ? 'Out of stock' : 'Add to cart'}
          </button>
        </div>
      </div>

      <button
        type="button"
        className="product-card__wish"
        aria-label="Add to wishlist"
        onClick={handleWishlist}
        disabled={busy}
      >
        <FiHeart size={16} />
      </button>
    </article>
  );
}
