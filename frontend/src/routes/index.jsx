import { createBrowserRouter, Navigate } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import Home from '../pages/Home';
import Catalog from '../pages/Catalog';
import Category from '../pages/Category';
import ProductDetail from '../pages/ProductDetail';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Cart from '../pages/Cart';
import Checkout from '../pages/Checkout';
import Wishlist from '../pages/Wishlist';
import Orders from '../pages/Orders';
import OrderDetail from '../pages/OrderDetail';
import TrackOrder from '../pages/TrackOrder';
import Profile from '../pages/Profile';
import RequireAuth from '../components/RequireAuth';
import Placeholder from '../pages/Placeholder';
import NotFound from '../pages/NotFound';
import RouteError from '../pages/RouteError';
import AdminLogin from '../pages/admin/AdminLogin';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminProducts from '../pages/admin/AdminProducts';
import AdminOrders from '../pages/admin/AdminOrders';
import AdminCustomers from '../pages/admin/AdminCustomers';
import AdminContent from '../pages/admin/AdminContent';
import AdminBanners from '../pages/admin/AdminBanners';
import AdminBranding from '../pages/admin/AdminBranding';
import AdminStoreInfo from '../pages/admin/AdminStoreInfo';
import AdminCategories from '../pages/admin/AdminCategories';
import AdminFeatured from '../pages/admin/AdminFeatured';
import AdminCoupons from '../pages/admin/AdminCoupons';
import AdminGuard from '../components/admin/AdminGuard';
import { AuthProvider } from '../context/AuthContext';

/**
 * Route shell (spec §22). Anything not yet implemented resolves to a declared
 * placeholder carrying the spec phase that delivers it, so navigation and deep
 * links already work end to end.
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: 'shop', element: <Catalog /> },
      { path: 'search', element: <Catalog /> },
      {
        path: 'offers',
        element: (
          <Catalog
            heading="Special offers"
            headingHint="Discounted products across every category."
            preset={{ minDiscount: '1', sort: 'discount' }}
          />
        ),
      },
      { path: 'products', element: <Navigate to="/shop" replace /> },
      { path: 'product/:slug', element: <ProductDetail /> },
      { path: 'category/:slug', element: <Category /> },
      { path: 'about', element: <Placeholder title="About us" phase="Phase 13 (responsive & polish)" /> },
      { path: 'contact', element: <Placeholder title="Contact" phase="Phase 13 (responsive & polish)" /> },
      // Post-login area: RequireAuth keeps the guest session rules (redirect to
      // /login?next=...) in one place, so every page below is only reachable
      // while the customer is signed in.
      { path: 'cart', element: <RequireAuth />, children: [{ index: true, element: <Cart /> }] },
      { path: 'checkout', element: <RequireAuth />, children: [{ index: true, element: <Checkout /> }] },
      {
        path: 'orders',
        element: <RequireAuth />,
        children: [
          { index: true, element: <Orders /> },
          { path: ':id', element: <OrderDetail /> },
        ],
      },
      { path: 'track-order', element: <RequireAuth />, children: [{ index: true, element: <TrackOrder /> }] },
      { path: 'track', element: <Navigate to="/track-order" replace /> },
      { path: 'wishlist', element: <RequireAuth />, children: [{ index: true, element: <Wishlist /> }] },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'account', element: <Navigate to="/profile" replace /> },
      {
        path: 'profile',
        element: <RequireAuth />,
        children: [
          { index: true, element: <Profile /> },
          { path: 'orders', element: <Navigate to="/orders" replace /> },
          { path: 'wishlist', element: <Navigate to="/wishlist" replace /> },
          { path: 'reviews', element: <Placeholder title="My reviews" phase="Phase 10 (reviews)" /> },
          { path: 'addresses', element: <Placeholder title="Addresses" phase="Phase 9 (profile & wishlist)" /> },
          { path: 'change-password', element: <Placeholder title="Change password" phase="Phase 9 (profile & wishlist)" /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
  // Admin area: its own shell (no storefront header/footer) with a dedicated
  // AuthProvider, so the session rules are identical to the storefront.
  { path: '/admin/login', element: <AuthProvider><AdminLogin /></AuthProvider>, errorElement: <RouteError /> },
  {
    path: '/admin',
    element: (
      <AuthProvider>
        <AdminGuard />
      </AuthProvider>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'products', element: <AdminProducts /> },
      { path: 'orders', element: <AdminOrders /> },
      { path: 'customers', element: <AdminCustomers /> },
      {
        path: 'content',
        children: [
          { index: true, element: <AdminContent /> },
          { path: 'banners', element: <AdminBanners /> },
          { path: 'branding', element: <AdminBranding /> },
          { path: 'store-info', element: <AdminStoreInfo /> },
          { path: 'categories', element: <AdminCategories /> },
          { path: 'featured', element: <AdminFeatured /> },
          { path: 'coupons', element: <AdminCoupons /> },
        ],
      },
      { path: '*', element: <Navigate to="/admin" replace /> },
    ],
  },
]);

export default router;
