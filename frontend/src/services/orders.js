import api from './client';
import { dedupe, invalidate } from './cache';

/** GET /api/orders - { orders, pagination } for the signed-in customer. */
export const fetchOrders = (params = {}) =>
  dedupe(`orders:${JSON.stringify(params)}`, async () =>
    (await api.get('/orders', { params })).data
  );

/** GET /api/orders/:id - one order with its items (owner only). */
export const fetchOrder = (id) =>
  dedupe(`order:${id}`, async () => (await api.get(`/orders/${id}`)).data.order);

/**
 * POST /api/checkout/preview - prices the cart on the server: unit prices,
 * subtotal, coupon discount, delivery fee and the final total always come
 * from the backend, never from what the page believes.
 * Without `items` the signed-in customer's cart is used.
 */
export const previewCheckout = async (payload = {}) =>
  (await api.post('/checkout/preview', payload)).data;

/**
 * POST /api/orders - creates the order (items priced server-side) and clears
 * the cart in the same request, so the cart only empties once the backend
 * has confirmed the order.
 */
export const createOrder = async (payload) => {
  const body = await api.post('/orders', payload);
  invalidate('cart');
  return { order: body?.data?.order || null, message: body?.message };
};
