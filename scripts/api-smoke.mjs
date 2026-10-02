/**
 * End-to-end API smoke test. Run with API on :5000:
 *   node scripts/api-smoke.mjs
 *
 * Reads/writes a temporary customer (TEMP.mobile) and temporary entities it
 * creates and deletes itself. Prints every failure with its status + message.
 */
const API = process.env.SMOKE_API_URL || 'http://localhost:5000/api';

// Admin credentials come from the environment (or backend/.env) so no login is
// committed to the repository. The tests only ever run against a local API.
const ADMIN = {
  identifier: process.env.ADMIN_EMAIL || '',
  password: process.env.ADMIN_PASSWORD || '',
};
const CUSTOMER = { mobile: '01712345678', password: 'Password123' };
const TEMP = {
  name: 'Smoke Test',
  mobile: '01799990011',
  email: 'smoke@test.local',
  password: 'Password123',
  confirmPassword: 'Password123',
};

const results = [];
let userToken = '';
let adminToken = '';
let tempToken = '';

async function hit(label, method, path, { token = '', body, expect = [200, 201] } = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    results.push({ label, status: 0, ok: false, msg: err.message });
    console.log(`FAIL  ${label} -> network error: ${err.message}`);
    return null;
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }

  const any = expect === 'any';
  const ok = any ? res.status < 500 : expect.includes(res.status);
  const msg = json?.message || json?.error || '';
  results.push({ label, status: res.status, ok, msg });
  if (!ok) {
    console.log(`FAIL  ${label} -> ${res.status} ${msg ? `- ${msg}` : ''} ${JSON.stringify(json).slice(0, 220)}`);
  }
  return { status: res.status, json };
}

const data = (r) => r?.json?.data;

async function main() {
  // ---------- public ----------
  await hit('GET /health', 'GET', '/health');
  await hit('GET /store', 'GET', '/store');
  await hit('GET /products/home', 'GET', '/products/home');
  await hit('GET /banners', 'GET', '/banners');
  await hit('GET /categories', 'GET', '/categories');
  await hit('GET /categories/electronics', 'GET', '/categories/electronics');
  await hit('GET /categories/electronics/products', 'GET', '/categories/electronics/products');
  await hit('GET /categories/electronics/subcategories', 'GET', '/categories/electronics/subcategories');
  await hit('GET /categories/nope -> 404', 'GET', '/categories/nope', { expect: [404] });
  await hit('GET /products?limit=5', 'GET', '/products?limit=5');
  await hit('GET /products/filters', 'GET', '/products/filters');
  await hit('GET /products/suggest?q=pho', 'GET', '/products/suggest?q=pho');
  await hit('GET /products/offers', 'GET', '/products/offers');
  await hit('GET /products/wireless-over-ear-headphones', 'GET', '/products/wireless-over-ear-headphones');
  await hit('GET /products/nope -> 404', 'GET', '/products/nope', { expect: [404] });
  await hit('GET /products/12/similar', 'GET', '/products/12/similar');
  await hit('GET /products/12/reviews', 'GET', '/products/12/reviews');
  await hit('GET /reviews/mine unauth -> 401', 'GET', '/reviews/mine', { expect: [401] });

  // ---------- auth ----------
  const login = await hit('POST /auth/login', 'POST', '/auth/login', {
    body: CUSTOMER,
  });
  userToken = data(login)?.token || '';
  await hit('POST /auth/login wrong password -> 401', 'POST', '/auth/login', {
    body: { mobile: CUSTOMER.mobile, password: 'nope' },
    expect: [401],
  });
  await hit('GET /auth/me', 'GET', '/auth/me', { token: userToken });
  await hit('GET /auth/me unauth -> 401', 'GET', '/auth/me', { expect: [401] });

  if (ADMIN.identifier && ADMIN.password) {
    const adminLogin = await hit('POST /auth/admin-login', 'POST', '/auth/admin-login', { body: ADMIN });
    adminToken = data(adminLogin)?.token || '';
    await hit('POST /auth/admin-login wrong -> 401', 'POST', '/auth/admin-login', {
      body: { identifier: ADMIN.identifier, password: 'wrong' },
      expect: [401],
    });
  } else {
    console.log('  ! ADMIN_EMAIL / ADMIN_PASSWORD not set - skipping the admin half of the smoke test.');
  }

  await hit('POST /auth/register duplicate -> 409', 'POST', '/auth/register', {
    body: { name: 'Dup', mobile: CUSTOMER.mobile, password: 'Password123', confirmPassword: 'Password123' },
    expect: [409],
  });

  const reg = await hit('POST /auth/register (temp customer)', 'POST', '/auth/register', {
    body: TEMP,
    expect: [201, 409],
  });
  tempToken = data(reg)?.token || '';
  if (!tempToken) {
    // The temp account already exists from a previous run - sign in instead.
    const tempLogin = await hit('POST /auth/login (existing temp customer)', 'POST', '/auth/login', {
      body: { mobile: TEMP.mobile, password: TEMP.password },
    });
    tempToken = data(tempLogin)?.token || '';
  }
  const me = await hit('GET /auth/me (temp)', 'GET', '/auth/me', { token: tempToken });
  const tempUserId = data(me)?.user?.id ?? data(reg)?.user?.id;

  await hit('admin route with customer token -> 403', 'GET', '/admin/dashboard', {
    token: userToken,
    expect: [403],
  });

  // ---------- cart ----------
  await hit('GET /cart (temp)', 'GET', '/cart', { token: tempToken });
  await hit('POST /cart add 12', 'POST', '/cart', { token: tempToken, body: { productId: 12, quantity: 2 }, expect: [201] });
  await hit('POST /cart over stock -> 400', 'POST', '/cart', { token: tempToken, body: { productId: 12, quantity: 9999 }, expect: [400] });
  await hit('POST /cart unknown product -> 404', 'POST', '/cart', { token: tempToken, body: { productId: 999999 }, expect: [404] });
  await hit('GET /cart/summary', 'GET', '/cart/summary', { token: tempToken });
  const cart = await hit('GET /cart after add', 'GET', '/cart', { token: tempToken });
  const itemId = data(cart)?.items?.[0]?.id;
  if (itemId) {
    await hit('PUT /cart/:id quantity 3', 'PUT', `/cart/${itemId}`, { token: tempToken, body: { quantity: 3 } });
  }
  await hit('POST /cart/merge', 'POST', '/cart/merge', { token: tempToken, body: {} });
  await hit('DELETE /cart (clear)', 'DELETE', '/cart', { token: tempToken });
  await hit('GET /cart empty', 'GET', '/cart', { token: tempToken });

  // ---------- wishlist ----------
  await hit('POST /wishlist add 12', 'POST', '/wishlist', { token: tempToken, body: { productId: 12 } });
  await hit('POST /wishlist duplicate is idempotent', 'POST', '/wishlist', { token: tempToken, body: { productId: 12 }, expect: [200, 201, 409] });
  await hit('GET /wishlist', 'GET', '/wishlist', { token: tempToken });
  await hit('GET /wishlist/ids', 'GET', '/wishlist/ids', { token: tempToken });
  await hit('POST /wishlist/12/move-to-cart', 'POST', '/wishlist/12/move-to-cart', { token: tempToken });
  await hit('DELETE /wishlist/12', 'DELETE', '/wishlist/12', { token: tempToken });
  await hit('DELETE /wishlist/12 again (idempotent)', 'DELETE', '/wishlist/12', { token: tempToken, expect: [200, 404] });

  // ---------- checkout + order ----------
  await hit('POST /cart add for checkout', 'POST', '/cart', { token: tempToken, body: { productId: 12, quantity: 1 }, expect: [201] });
  await hit('POST /checkout/preview', 'POST', '/checkout/preview', {
    token: tempToken,
    body: { deliveryZone: 'inside_dhaka' },
  });
  await hit('POST /orders (place order)', 'POST', '/orders', {
    token: tempToken,
    body: {
      name: TEMP.name,
      phone: '01711112222',
      address: 'House 5, Road 2, Dhanmondi',
      city: 'Dhaka',
      area: 'Dhanmondi',
      deliveryZone: 'inside_dhaka',
    },
    expect: [201],
  });
  const orders = await hit('GET /orders', 'GET', '/orders?limit=5', { token: tempToken });
  const orderId = data(orders)?.orders?.[0]?.id ?? data(orders)?.list?.[0]?.id ?? data(orders)?.[0]?.id;
  await hit('GET /orders/:id', 'GET', `/orders/${orderId}`, { token: tempToken, expect: [200, 404] });

  // ---------- admin ----------
  await hit('GET /admin/dashboard', 'GET', '/admin/dashboard', { token: adminToken });
  await hit('GET /admin/overview', 'GET', '/admin/overview', { token: adminToken });
  await hit('GET /admin/analytics/revenue', 'GET', '/admin/analytics/revenue', { token: adminToken });
  await hit('GET /admin/analytics/orders', 'GET', '/admin/analytics/orders', { token: adminToken });
  await hit('GET /admin/analytics/products', 'GET', '/admin/analytics/products', { token: adminToken });
  await hit('GET /admin/analytics/customers', 'GET', '/admin/analytics/customers', { token: adminToken });
  await hit('GET /admin/inventory', 'GET', '/admin/inventory', { token: adminToken });
  await hit('GET /admin/activity-logs', 'GET', '/admin/activity-logs', { token: adminToken });
  await hit('GET /admin/notifications', 'GET', '/admin/notifications', { token: adminToken });
  await hit('GET /admin/settings', 'GET', '/admin/settings', { token: adminToken });
  await hit('GET /admin/coupons', 'GET', '/admin/coupons', { token: adminToken });
  await hit('GET /admin/banners', 'GET', '/admin/banners', { token: adminToken });
  await hit('GET /admin/chat/conversations', 'GET', '/admin/chat/conversations', { token: adminToken });
  await hit('GET /admin/products', 'GET', '/admin/products?limit=5', { token: adminToken });
  await hit('GET /admin/categories', 'GET', '/admin/categories', { token: adminToken });
  await hit('GET /admin/subcategories', 'GET', '/admin/subcategories', { token: adminToken });
  await hit('GET /admin/orders', 'GET', '/admin/orders?limit=5', { token: adminToken });
  await hit('GET /admin/customers', 'GET', '/admin/customers?limit=5', { token: adminToken });
  await hit('GET /admin/reviews', 'GET', '/admin/reviews?limit=5', { token: adminToken });

  // product CRUD
  const created = await hit('POST /admin/products', 'POST', '/admin/products', {
    token: adminToken,
    body: {
      name: 'Smoke Test Product',
      originalPrice: 1000,
      discount: 10,
      stock: 5,
      categoryId: 1,
      shortDescription: 'temporary product created by the smoke test',
      description: 'temporary product created by the smoke test',
    },
  });
  const newProductId = data(created)?.id;
  if (newProductId) {
    await hit('GET /admin/products/:id', 'GET', `/admin/products/${newProductId}`, { token: adminToken });
    await hit('PUT /admin/products/:id', 'PUT', `/admin/products/${newProductId}`, {
      token: adminToken,
      body: { originalPrice: 1200, stock: 7 },
    });
    await hit('POST /admin/products/:id/status', 'POST', `/admin/products/${newProductId}/status`, {
      token: adminToken,
      body: { status: 'inactive' },
    });
    await hit('GET public inactive -> 404', 'GET', `/products/${newProductId}`, { expect: [404] });
    await hit('POST /admin/inventory/:id/stock', 'POST', `/admin/inventory/${newProductId}/stock`, {
      token: adminToken,
      body: { delta: -2 },
    });
    await hit('DELETE /admin/products/:id', 'DELETE', `/admin/products/${newProductId}`, { token: adminToken });
    await hit('GET deleted -> 404', 'GET', `/admin/products/${newProductId}`, { token: adminToken, expect: [404] });
  }

  // category CRUD
  const cat = await hit('POST /admin/categories', 'POST', '/admin/categories', {
    token: adminToken,
    body: { name: 'Smoke Category' },
  });
  const catId = data(cat)?.id;
  if (catId) {
    await hit('PUT /admin/categories/:id', 'PUT', `/admin/categories/${catId}`, {
      token: adminToken,
      body: { name: 'Smoke Category Renamed' },
    });
    const sub = await hit('POST /admin/subcategories', 'POST', '/admin/subcategories', {
      token: adminToken,
      body: { name: 'Smoke Sub', categoryId: catId },
    });
    const subId = data(sub)?.id;
    if (subId) await hit('DELETE /admin/subcategories/:id', 'DELETE', `/admin/subcategories/${subId}`, { token: adminToken });
    await hit('DELETE /admin/categories/:id', 'DELETE', `/admin/categories/${catId}`, { token: adminToken });
  }

  // not-found + reference guards (regression for missing 404/400 handling)
  await hit('POST /admin/products/99999/status -> 404', 'POST', '/admin/products/99999/status', {
    token: adminToken,
    body: { status: 'active' },
    expect: [404],
  });
  await hit('DELETE /admin/categories/99999 -> 404', 'DELETE', '/admin/categories/99999', { token: adminToken, expect: [404] });
  await hit('DELETE /admin/subcategories/99999 -> 404', 'DELETE', '/admin/subcategories/99999', { token: adminToken, expect: [404] });
  await hit('DELETE /admin/banners/99999 -> 404', 'DELETE', '/admin/banners/99999', { token: adminToken, expect: [404] });
  await hit('DELETE /admin/coupons/99999 -> 404', 'DELETE', '/admin/coupons/99999', { token: adminToken, expect: [404] });
  await hit('PUT /admin/customers/99999/status -> 404', 'PUT', '/admin/customers/99999/status', {
    token: adminToken,
    body: { status: 'active' },
    expect: [404],
  });
  await hit('DELETE category with subcategories -> 400', 'DELETE', '/admin/categories/1', { token: adminToken, expect: [400] });
  await hit('DELETE category with products -> 400', 'DELETE', '/admin/categories/12', { token: adminToken, expect: [400] });
  await hit('DELETE subcategory with products -> 400', 'DELETE', '/admin/subcategories/4', { token: adminToken, expect: [400] });

  // banner + coupon CRUD
  const banner = await hit('POST /admin/banners', 'POST', '/admin/banners', {
    token: adminToken,
    body: { title: 'Smoke Banner', subtitle: 'temp', button_text: 'Go', button_link: '/shop', status: 'hidden', sort_order: 99 },
  });
  const bannerId = data(banner)?.id;
  if (bannerId) await hit('DELETE /admin/banners/:id', 'DELETE', `/admin/banners/${bannerId}`, { token: adminToken });

  const coupon = await hit('POST /admin/coupons', 'POST', '/admin/coupons', {
    token: adminToken,
    body: { code: 'SMOKE10', type: 'percent', value: 10, min_order: 0, usage_limit: 1, status: 'active' },
  });
  const couponId = data(coupon)?.id;
  if (couponId) {
    await hit('PUT /admin/coupons/:id', 'PUT', `/admin/coupons/${couponId}`, { token: adminToken, body: { value: 15 } });
    await hit('DELETE /admin/coupons/:id', 'DELETE', `/admin/coupons/${couponId}`, { token: adminToken });
  }

  // order + review chain
  if (orderId) {
    await hit('PUT /admin/orders/:id/status confirmed', 'PUT', `/admin/orders/${orderId}/status`, {
      token: adminToken,
      body: { status: 'confirmed' },
    });
    await hit('GET /admin/orders/:id', 'GET', `/admin/orders/${orderId}`, { token: adminToken });
    await hit('GET /products/12/can-review (purchased)', 'GET', '/products/12/can-review', { token: tempToken });
    const review = await hit('POST /products/12/reviews', 'POST', '/products/12/reviews', {
      token: tempToken,
      body: { rating: 5, review: 'Created by the API smoke test.' },
      expect: [200, 201],
    });
    // The create/update response only returns the recomputed rating, so read
    // the review back to learn its id.
    const mine = await hit('GET /reviews/mine', 'GET', '/reviews/mine', { token: tempToken });
    const reviewId =
      data(review)?.review?.id ?? data(review)?.id ?? data(mine)?.reviews?.[0]?.id ?? null;
    if (reviewId) {
      await hit('PUT /admin/reviews/:id/status', 'PUT', `/admin/reviews/${reviewId}/status`, {
        token: adminToken,
        body: { status: 'hidden' },
      });
      await hit('PUT /admin/reviews/:id/status visible', 'PUT', `/admin/reviews/${reviewId}/status`, {
        token: adminToken,
        body: { status: 'visible' },
      });
      await hit('DELETE /admin/reviews/:id', 'DELETE', `/admin/reviews/${reviewId}`, { token: adminToken });
    } else {
      console.log('WARN  could not read the created review id:', JSON.stringify(review?.json).slice(0, 200));
    }
  }

  await hit('PUT /admin/customers/:id/status', 'PUT', `/admin/customers/${tempUserId}/status`, {
    token: adminToken,
    body: { status: 'active' },
    expect: [200, 404],
  });
  await hit('GET /admin/customers/:id', 'GET', `/admin/customers/${tempUserId}`, {
    token: adminToken,
    expect: [200, 404],
  });
  await hit('PUT /admin/settings', 'PUT', '/admin/settings', {
    token: adminToken,
    body: { currency: 'BDT' },
    expect: [200, 400],
  });
  await hit('POST /admin/notifications/read-all', 'POST', '/admin/notifications/read-all', { token: adminToken });

  // profile + notifications (customer)
  await hit('GET /profile/summary', 'GET', '/profile/summary', { token: tempToken });
  await hit('GET /notifications', 'GET', '/notifications', { token: tempToken });
  await hit('GET /notifications/unread', 'GET', '/notifications/unread', { token: tempToken });
  await hit('POST /notifications/read-all', 'POST', '/notifications/read-all', { token: tempToken });
  await hit('GET /chat', 'GET', '/chat', { token: tempToken });
  await hit('GET /chat/unread', 'GET', '/chat/unread', { token: tempToken });
  await hit('POST /auth/logout', 'POST', '/auth/logout', { token: tempToken });

  // ---------- summary ----------
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nFAILURES:');
    failed.forEach((f) => console.log(`  - ${f.label}: ${f.status} ${f.msg}`));
  }
  console.log(`\nTEMP customer mobile for cleanup: ${TEMP.mobile} (order id: ${orderId})`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('smoke run crashed:', err);
  process.exit(1);
});
