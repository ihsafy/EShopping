import axios from 'axios';

export const TOKEN_KEY = 'eshopping.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

/**
 * Shared axios instance.
 * VITE_API_URL may point at an absolute API origin (production). When it is
 * unset the relative "/api" base is used, so the Vite dev proxy (or a
 * same-origin production server) forwards /api to Express with no CORS setup.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // A FormData body has to keep the browser-generated multipart boundary, so
  // the JSON default set above must not be sent along with it.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData && config.headers) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
      config.headers.delete('content-type');
    } else {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const payload = error.response?.data;
    const message = payload?.message || error.message || 'Request failed';
    const err = new Error(message);
    err.status = error.response?.status || 0;
    err.payload = payload;
    // The API rejected our token: drop it and tell the auth context so the
    // signed-in UI disappears instead of staying up on an expired session.
    if (err.status === 401 && getToken()) {
      setToken('');
      window.dispatchEvent(new Event('eshopping:unauthorized'));
    }
    return Promise.reject(err);
  }
);

export default api;
