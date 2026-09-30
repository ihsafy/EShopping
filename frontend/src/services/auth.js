import api, { getToken, setToken } from './client';
import { dedupe } from './cache';

/** POST /api/auth/login - returns the customer's token. */
export const login = async (payload) => (await api.post('/auth/login', payload)).data;

/**
 * POST /api/auth/admin-login - administrator session (admins only).
 * The API answers 401 for customers, so the role check lives on the server.
 */
export const adminLogin = async (payload) => (await api.post('/auth/admin-login', payload)).data;

/** POST /api/auth/register - creates the account and signs it in. */
export const register = async (payload) => (await api.post('/auth/register', payload)).data;

/**
 * GET /api/auth/me - current user from the stored token.
 * Returns null when signed out (and drops an expired token).
 * Concurrent calls (StrictMode double-mount, layout + page) share one request.
 */
export const fetchMe = () =>
  dedupe('auth:me', async () => {
    if (!getToken()) return null;
    try {
      const res = await api.get('/auth/me');
      return res.data.user;
    } catch (err) {
      if (err.status === 401) {
        setToken('');
        return null;
      }
      throw err;
    }
  });

/** Best-effort server-side logout; the local token is cleared regardless. */
export const logout = async () => {
  // Ask the server first - clearing the token first would make the request
  // unauthenticated and answer 401 in the console for no reason.
  if (getToken()) {
    try {
      await api.post('/auth/logout');
    } catch {
      // Token already rejected or expired; the local session is going anyway.
    }
  }
  setToken('');
};

export const updateProfile = async (payload) =>
  (await api.patch('/auth/profile', payload)).data;

export const changePassword = async (payload) =>
  (await api.post('/auth/change-password', payload)).data;
