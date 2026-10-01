import api from './client';
import { cached, dedupe } from './cache';

/** Public catalog endpoints used by the storefront shell. */
export const fetchStore = () =>
  cached('store', async () => (await api.get('/store')).data, 5 * 60 * 1000);

export const fetchHome = () =>
  cached('home', async () => (await api.get('/products/home')).data, 30 * 1000);

/** Both endpoints nest the list inside a named key: { data: { banners: [] } }. */
export const fetchBanners = () =>
  cached('banners', async () => (await api.get('/banners')).data.banners || [], 60 * 1000);

export const fetchCategories = () =>
  cached('categories', async () => (await api.get('/categories')).data.categories || [], 60 * 1000);

/**
 * Active admin-created promo codes, shared by the storefront notice bar and the
 * /profile vouchers card so both always show the same live codes.
 */
export const fetchActivePromotions = () =>
  cached('promotions', async () => (await api.get('/promotions/active')).data.promotions || [], 60 * 1000);

export const fetchProducts = (params = {}) =>
  dedupe(`products:${JSON.stringify(params)}`, async () => (await api.get('/products', { params })).data);

/** Filter metadata: brands, price bounds and the supported sort orders. */
export const fetchFilters = () =>
  cached('filters', async () => (await api.get('/products/filters')).data, 30 * 1000);

/** Category header + its subcategories: { category, subcategories }. */
export const fetchCategory = (slug) =>
  dedupe(`category:${slug}`, async () => (await api.get(`/categories/${slug}`)).data);

/** Product detail: { product, reviews, inWishlist, related }. */
export const fetchProductDetail = (idOrSlug) =>
  dedupe(`detail:${idOrSlug}`, async () => (await api.get(`/products/${idOrSlug}`)).data);

/** Review eligibility for the signed-in user (401 when signed out). */
export const fetchReviewEligibility = async (idOrSlug) =>
  (await api.get(`/products/${idOrSlug}/can-review`)).data;

/** Creates or updates the signed-in customer's review (verified purchase only). */
export const submitReview = async (productId, payload) =>
  (await api.post(`/products/${productId}/reviews`, payload)).data;

export const healthCheck = async () => api.get('/health');
