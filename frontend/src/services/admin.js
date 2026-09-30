import api from './client';

/**
 * Admin API surface. Every call is admin-only on the server
 * (`protect` + `requireRole('admin')`), nothing here is cached so the
 * management screens always show fresh database state.
 */

// ---- dashboard + analytics ------------------------------------------------
export const fetchAdminDashboard = async () => (await api.get('/admin/dashboard')).data;

/** period: today | week | 30d | month | 6m | year | all */
export const fetchRevenueSeries = async (period = 'month') =>
  (await api.get('/admin/analytics/revenue', { params: { period } })).data;

export const fetchOrderAnalytics = async () => (await api.get('/admin/analytics/orders')).data;

export const fetchProductAnalytics = async () => (await api.get('/admin/analytics/products')).data;

export const fetchCustomerAnalytics = async () => (await api.get('/admin/analytics/customers')).data;

// ---- products -------------------------------------------------------------
export const fetchAdminProducts = async (params = {}) =>
  (await api.get('/admin/products', { params })).data;

export const fetchAdminProduct = async (id) => (await api.get(`/admin/products/${id}`)).data.product;

export const createProduct = async (payload) => (await api.post('/admin/products', payload)).data;

export const updateProduct = async (id, payload) =>
  (await api.put(`/admin/products/${id}`, payload)).data;

export const deleteProduct = async (id) => api.delete(`/admin/products/${id}`);

export const setProductStatus = async (id, status) =>
  (await api.post(`/admin/products/${id}/status`, { status })).data;

// ---- categories -----------------------------------------------------------
export const fetchAdminCategories = async () => (await api.get('/admin/categories')).data.categories;

export const createCategory = async (payload) => (await api.post('/admin/categories', payload)).data;

export const updateCategory = async (id, payload) =>
  (await api.put(`/admin/categories/${id}`, payload)).data;

export const deleteCategory = async (id) => api.delete(`/admin/categories/${id}`);

// ---- orders ---------------------------------------------------------------
/** → { orders, pagination, statuses } */
export const fetchAdminOrders = async (params = {}) =>
  (await api.get('/admin/orders', { params })).data;

export const fetchAdminOrder = async (id) => (await api.get(`/admin/orders/${id}`)).data.order;

export const setOrderStatus = async (id, status, note = '') =>
  (await api.put(`/admin/orders/${id}/status`, { status, note })).data;

// ---- customers ------------------------------------------------------------
/** → { rows, total } */
export const fetchAdminCustomers = async (params = {}) =>
  (await api.get('/admin/customers', { params })).data;

export const fetchAdminCustomer = async (id) => (await api.get(`/admin/customers/${id}`)).data;

export const setCustomerStatus = async (id, status) =>
  (await api.put(`/admin/customers/${id}/status`, { status })).data;

export const deleteCustomer = async (id) => api.delete(`/admin/customers/${id}`);

// ---- content: banners -----------------------------------------------------
export const fetchAdminBanners = async () => (await api.get('/admin/banners')).data.banners;

export const createBanner = async (payload) => (await api.post('/admin/banners', payload)).data;

export const updateBanner = async (id, payload) =>
  (await api.put(`/admin/banners/${id}`, payload)).data;

export const deleteBanner = async (id) => api.delete(`/admin/banners/${id}`);

// ---- content: settings / branding ----------------------------------------
export const fetchAdminSettings = async () => (await api.get('/admin/settings')).data.settings;

export const saveSettings = async (patch) => (await api.put('/admin/settings', patch)).data;

// ---- content: coupons (promotions) ---------------------------------------
export const fetchAdminCoupons = async () => (await api.get('/admin/coupons')).data.coupons;

export const createCoupon = async (payload) => (await api.post('/admin/coupons', payload)).data;

export const updateCoupon = async (id, payload) =>
  (await api.put(`/admin/coupons/${id}`, payload)).data;

export const deleteCoupon = async (id) => api.delete(`/admin/coupons/${id}`);

// ---- uploads --------------------------------------------------------------
/** POST /api/uploads - stores the file and returns its public URL(s). */
export const uploadImages = async (files) => {
  const form = new FormData();
  const list = Array.isArray(files) ? files : [files];
  list.forEach((file) => form.append('files', file));
  return (await api.post('/uploads', form)).data;
};
