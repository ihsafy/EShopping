import api from './client';
import { dedupe } from './cache';

/** GET /api/wishlist - full product rows for the signed-in customer. */
export const fetchWishlist = () =>
  dedupe('wishlist', async () => (await api.get('/wishlist')).data.products || []);

/** GET /api/wishlist/ids - used to flag hearts in listings. */
export const fetchWishlistIds = () =>
  dedupe('wishlist:ids', async () => (await api.get('/wishlist/ids')).data.ids || []);

/** POST /api/wishlist */
export const addToWishlist = async (productId) => (await api.post('/wishlist', { productId })).data;

/** DELETE /api/wishlist/:productId */
export const removeFromWishlist = async (productId) =>
  (await api.delete(`/wishlist/${productId}`)).data;

/** POST /api/wishlist/:productId/move-to-cart - moves the line into the cart. */
export const moveToCart = async (productId) => {
  const data = (await api.post(`/wishlist/${productId}/move-to-cart`)).data;
  window.dispatchEvent(
    new CustomEvent('eshopping:cart-changed', {
      detail: { count: Number(data?.cart?.itemCount) || 0 },
    })
  );
  return data;
};
