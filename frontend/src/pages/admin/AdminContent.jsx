import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiChevronRight, FiImage, FiLayers, FiPercent, FiShoppingBag, FiStar, FiTag } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { fetchAdminBanners, fetchAdminCoupons, fetchAdminSettings, fetchAdminCategories } from '../../services/admin';

const SECTIONS = [
  {
    to: '/admin/content/branding',
    icon: FiTag,
    title: 'Site branding',
    description: 'Site name, logo, favicon and tagline shown across the storefront.',
    key: 'branding',
  },
  {
    to: '/admin/content/banners',
    icon: FiImage,
    title: 'Homepage banners',
    description: 'Hero carousel: upload, preview, order and toggle banners.',
    key: 'banners',
  },
  {
    to: '/admin/content/featured',
    icon: FiStar,
    title: 'Featured products',
    description: 'Pick which products sit in the featured, best seller and new arrival rows.',
    key: 'featured',
  },
  {
    to: '/admin/content/categories',
    icon: FiLayers,
    title: 'Categories',
    description: 'Show/hide categories, set their order, image and description.',
    key: 'categories',
  },
  {
    to: '/admin/content/coupons',
    icon: FiPercent,
    title: 'Promotions',
    description: 'Create discount codes with limits, dates and usage caps.',
    key: 'coupons',
  },
  {
    to: '/admin/content/store-info',
    icon: FiShoppingBag,
    title: 'Store information',
    description: 'Contact details, address and delivery charges.',
    key: 'store',
  },
];

export default function AdminContent() {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    Promise.allSettled([
      fetchAdminBanners(),
      fetchAdminCoupons(),
      fetchAdminSettings(),
      fetchAdminCategories(),
    ]).then(([banners, coupons, settings, categories]) => {
      setCounts({
        banners: banners.status === 'fulfilled' ? banners.value.length : null,
        coupons: coupons.status === 'fulfilled' ? coupons.value.length : null,
        branding:
          settings.status === 'fulfilled' && settings.value.store_logo
            ? 'Logo set'
            : settings.status === 'fulfilled'
            ? 'No logo'
            : null,
        categories: categories.status === 'fulfilled' ? categories.value.length : null,
        featured: null,
        store:
          settings.status === 'fulfilled' && settings.value.store_phone ? 'Phone set' : null,
      });
    });
  }, []);

  return (
    <section className="admin-page">
      <Helmet>
        <title>Content | EShopping Admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Content management</h1>
          <p className="muted">Everything shoppers see on the storefront — logos, banners, promos and store details.</p>
        </div>
      </div>

      <div className="admin-cards">
        {SECTIONS.map(({ to, icon: Icon, title, description, key }) => (
          <Link key={to} to={to} className="admin-card">
            <span className="admin-card__icon">
              <Icon size={18} />
            </span>
            <span className="admin-card__body">
              <strong>{title}</strong>
              <span>{description}</span>
            </span>
            {counts[key] !== null && counts[key] !== undefined && (
              <span className="admin-card__badge">{counts[key]}</span>
            )}
            <FiChevronRight className="admin-card__chevron" size={18} />
          </Link>
        ))}
      </div>
    </section>
  );
}
