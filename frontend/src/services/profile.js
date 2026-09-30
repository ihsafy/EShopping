import api from './client';
import { dedupe } from './cache';

/** GET /api/profile/summary - order totals, wishlist count and recent orders. */
export const fetchProfileSummary = () =>
  dedupe('profile:summary', async () => (await api.get('/profile/summary')).data);
