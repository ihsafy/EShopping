import api from './client';
import { dedupe } from './cache';

/**
 * Broadcasts the new cart size so the header badge updates immediately -
 * the same pattern the auth layer uses for `eshopping:unauthorized`.
 */
const announce = (cart) => {
  window.dispatchEvent(
    new CustomEvent('eshopping:cart-changed', {
      detail: { count: Number(cart?.itemCount) || 0 },
    })
  );
  return cart;
};

/** GET /api/cart - items, per-line totals and cart-level totals. */
export const fetchCart = () => dedupe('cart', async () => (await api.get('/cart')).data);

/** Current number of units in the cart (shared with the header badge). */
export const fetchCartCount = async () => Number((await fetchCart()).itemCount) || 0;

/** POST /api/cart - adds, or increases the quantity of an existing line. */
export const addToCart = async (productId, quantity = 1) =>
  announce((await api.post('/cart', { productId, quantity })).data);

/** PUT /api/cart/:itemId */
export const updateCartItem = async (itemId, quantity) =>
  announce((await api.put(`/cart/${itemId}`, { quantity })).data);

/** DELETE /api/cart/:itemId */
export const removeCartItem = async (itemId) =>
  announce((await api.delete(`/cart/${itemId}`)).data);

/** DELETE /api/cart */
export const clearCart = async () => announce((await api.delete('/cart')).data);
