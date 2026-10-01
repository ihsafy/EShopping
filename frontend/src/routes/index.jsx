import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import Home from '../pages/Home';
import RequireAuth from '../components/RequireAuth';
import RouteError from '../pages/RouteError';
import { AuthProvider } from '../context/AuthContext';
import { PageFallback } from '../components/ui/PageFallback';

/**
 * Route shell.
 *
 * Only Home (the landing route) and the shared shells are in the initial
 * bundle. Everything else is split per route so a first-time visitor does not
 * download the admin screens, the checkout flow and the product gallery before
 * seeing the home page.
 */
const Catalog = lazy(() => import('../pages/Catalog'));
const Category = lazy(() => import('../pages/Category'));
const ProductDetail = lazy(() => import('../pages/ProductDetail'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const Cart = lazy(() => import('../pages/Cart'));
const Checkout = lazy(() => import('../pages/Checkout'));
const Wishlist = lazy(() => import('../pages/Wishlist'));
const Chat = lazy(() => import('../pages/Chat'));
const Orders = lazy(() => import('../pages/Orders'));
const OrderDetail = lazy(() => import('../pages/OrderDetail'));
const TrackOrder = lazy(() => import('../pages/TrackOrder'));
const Profile = lazy(() => import('../pages/Profile'));
const Placeholder = lazy(() => import('../pages/Placeholder'));
const NotFound = lazy(() => import('../pages/NotFound'));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('../pages/TermsOfService'));

const AdminLogin = lazy(() => import('../pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('../pages/admin/AdminProducts'));
const AdminOrders = lazy(() => import('../pages/admin/AdminOrders'));
const AdminCustomers = lazy(() => import('../pages/admin/AdminCustomers'));
const AdminContent = lazy(() => import('../pages/admin/AdminContent'));
const AdminBanners = lazy(() => import('../pages/admin/AdminBanners'));
const AdminBranding = lazy(() => import('../pages/admin/AdminBranding'));
const AdminStoreInfo = lazy(() => import('../pages/admin/AdminStoreInfo'));
const AdminCategories = lazy(() => import('../pages/admin/AdminCategories'));
const AdminFeatured = lazy(() => import('../pages/admin/AdminFeatured'));
const AdminCoupons = lazy(() => import('../pages/admin/AdminCoupons'));
const AdminMessages = lazy(() => import('../pages/admin/AdminMessages'));
const AdminGuard = lazy(() => import('../components/admin/AdminGuard'));

const withFallback = (node) => <Suspense fallback={<PageFallback />}>{node}</Suspense>;

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: 'shop', element: withFallback(<Catalog />) },
      { path: 'search', element: withFallback(<Catalog />) },
      {
        path: 'offers',
        element: withFallback(
          <Catalog
            heading="Special offers"
            headingHint="Discounted products across every category."
            preset={{ minDiscount: '1', sort: 'discount' }}
          />
        ),
      },
      { path: 'products', element: <Navigate to="/shop" replace /> },
      { path: 'product/:slug', element: withFallback(<ProductDetail />) },
      { path: 'category/:slug', element: withFallback(<Category />) },
      {
        path: 'about',
        element: withFallback(<Placeholder title="About us" phase="Phase 13 (responsive & polish)" />),
      },
      {
        path: 'contact',
        element: withFallback(<Placeholder title="Contact" phase="Phase 13 (responsive & polish)" />),
      },
      // Post-login area: RequireAuth keeps the guest session rules (redirect to
      // /login?next=...) in one place, so every page below is only reachable
      // while the customer is signed in.
      { path: 'cart', element: <RequireAuth />, children: [{ index: true, element: withFallback(<Cart />) }] },
      { path: 'checkout', element: <RequireAuth />, children: [{ index: true, element: withFallback(<Checkout />) }] },
      {
        path: 'orders',
        element: <RequireAuth />,
        children: [
          { index: true, element: withFallback(<Orders />) },
          { path: ':id', element: withFallback(<OrderDetail />) },
        ],
      },
      {
        path: 'track-order',
        element: <RequireAuth />,
        children: [{ index: true, element: withFallback(<TrackOrder />) }],
      },
      { path: 'track', element: <Navigate to="/track-order" replace /> },
      {
        path: 'wishlist',
        element: <RequireAuth />,
        children: [{ index: true, element: withFallback(<Wishlist />) }],
      },
      // Support chat (the backend notification payload links to /profile/chat).
      { path: 'chat', element: <RequireAuth />, children: [{ index: true, element: withFallback(<Chat />) }] },
      { path: 'login', element: withFallback(<Login />) },
      { path: 'register', element: withFallback(<Register />) },
      { path: 'privacy-policy', element: withFallback(<PrivacyPolicy />) },
      { path: 'terms-of-service', element: withFallback(<TermsOfService />) },
      { path: 'account', element: <Navigate to="/profile" replace /> },
      {
        path: 'profile',
        element: <RequireAuth />,
        children: [
          { index: true, element: withFallback(<Profile />) },
          { path: 'orders', element: <Navigate to="/orders" replace /> },
          { path: 'wishlist', element: <Navigate to="/wishlist" replace /> },
          {
            path: 'reviews',
            element: withFallback(<Placeholder title="My reviews" phase="Phase 10 (reviews)" />),
          },
          { path: 'chat', element: <Navigate to="/chat" replace /> },
          {
            path: 'addresses',
            element: withFallback(<Placeholder title="Addresses" phase="Phase 9 (profile & wishlist)" />),
          },
          {
            path: 'change-password',
            element: withFallback(<Placeholder title="Change password" phase="Phase 9 (profile & wishlist)" />),
          },
        ],
      },
      { path: '*', element: withFallback(<NotFound />) },
    ],
  },
  // Admin area: its own shell (no storefront header/footer) with a dedicated
  // AuthProvider, so the session rules are identical to the storefront.
  {
    path: '/admin/login',
    element: (
      <AuthProvider>{withFallback(<AdminLogin />)}</AuthProvider>
    ),
    errorElement: <RouteError />,
  },
  {
    path: '/admin',
    element: (
      <AuthProvider>
        {withFallback(<AdminGuard />)}
      </AuthProvider>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: withFallback(<AdminDashboard />) },
      { path: 'products', element: withFallback(<AdminProducts />) },
      { path: 'orders', element: withFallback(<AdminOrders />) },
      { path: 'customers', element: withFallback(<AdminCustomers />) },
      // The backend links admins to /admin/messages after a customer replies.
      { path: 'messages', element: withFallback(<AdminMessages />) },
      { path: 'chat', element: <Navigate to="/admin/messages" replace /> },
      {
        path: 'content',
        children: [
          { index: true, element: withFallback(<AdminContent />) },
          { path: 'banners', element: withFallback(<AdminBanners />) },
          { path: 'branding', element: withFallback(<AdminBranding />) },
          { path: 'store-info', element: withFallback(<AdminStoreInfo />) },
          { path: 'categories', element: withFallback(<AdminCategories />) },
          { path: 'featured', element: withFallback(<AdminFeatured />) },
          { path: 'coupons', element: withFallback(<AdminCoupons />) },
        ],
      },
      { path: '*', element: <Navigate to="/admin" replace /> },
    ],
  },
]);

export default router;