import { Link } from 'react-router-dom';
import {
  FiArrowUpRight,
  FiGithub,
  FiGlobe,
  FiLinkedin,
  FiMail,
  FiMapPin,
  FiPhone,
  FiTwitter,
} from 'react-icons/fi';
import BrandMark from './BrandMark';

const DEVELOPER = {
  name: 'IH Safy',
  initials: 'IS',
  github: 'https://github.com/ihsafy',
  portfolio: 'https://ihsafy.vercel.app',
  linkedin: 'https://www.linkedin.com/in/ihsafy/',
};

const SOCIALS = [
  { label: 'GitHub', href: DEVELOPER.github, icon: FiGithub },
  { label: 'LinkedIn', href: DEVELOPER.linkedin, icon: FiLinkedin },
  { label: 'Twitter', href: 'https://twitter.com/', icon: FiTwitter },
  { label: 'Portfolio', href: DEVELOPER.portfolio, icon: FiGlobe },
];

const SHOP_LINKS = [
  { label: 'All products', to: '/shop' },
  { label: 'New arrivals', to: '/shop?sort=newest' },
  { label: 'Offers', to: '/offers' },
  { label: 'Wishlist', to: '/wishlist' },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms of Service', to: '/terms-of-service' },
];

export default function Footer({ store }) {
  const year = new Date().getFullYear();
  const storeName = store?.storeName || 'EShopping';

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__grid">
          {/* 1. Brand */}
          <div className="footer__col footer__brand-col">
            <Link to="/" className="brand brand--footer" aria-label={`${storeName} home`}>
              {store?.logo ? (
                <img className="brand__logo" src={store.logo} alt="" />
              ) : (
                <span className="brand__mark" aria-hidden="true">
                  <BrandMark />
                </span>
              )}
              <span className="brand__name">{storeName}</span>
            </Link>
            <p className="footer__tagline">{store?.tagline || 'Everything you love, delivered.'}</p>

            <ul className="footer__socials">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <a
                    className="footer__social"
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                  >
                    <Icon aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. Shop */}
          <nav className="footer__col" aria-label="Shop">
            <h4 className="footer__heading">Shop</h4>
            <ul className="footer__links">
              {SHOP_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 3. Developer / credits */}
          <div className="footer__col">
            <h4 className="footer__heading">Developer</h4>
            <div className="footer__credit">
              <span className="footer__avatar" aria-hidden="true">
                {DEVELOPER.initials}
              </span>
              <span className="footer__credit-meta">
                <strong>{DEVELOPER.name}</strong>
                <span>Full-stack engineer</span>
              </span>
              <span className="footer__credit-links">
                <a
                  className="footer__credit-link"
                  href={DEVELOPER.github}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub profile"
                  title="GitHub Profile"
                >
                  <FiGithub aria-hidden="true" />
                </a>
                <a
                  className="footer__credit-link"
                  href={DEVELOPER.portfolio}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Portfolio"
                  title="Portfolio"
                >
                  <FiArrowUpRight aria-hidden="true" />
                </a>
              </span>
            </div>
          </div>

          {/* 4. Contact */}
          <div className="footer__col">
            <h4 className="footer__heading">Get in touch</h4>
            <ul className="footer__contact">
              <li>
                <FiPhone aria-hidden="true" />
                <a href={`tel:${(store?.phone || '').replace(/\s+/g, '')}`}>
                  {store?.phone || '+880 1724 612320'}
                </a>
              </li>
              <li>
                <FiMail aria-hidden="true" />
                <a href={`mailto:${store?.email || 'ihsafy2k21@gmail.com'}`}>
                  {store?.email || 'ihsafy2k21@gmail.com'}
                </a>
              </li>
              <li>
                <FiMapPin aria-hidden="true" />
                <span>{store?.address || 'Dhaka, Bangladesh'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copy">
            © {year} {storeName}. All rights reserved.
          </p>

          <ul className="footer__payments" aria-label="Accepted payment methods">
            <li className="footer__pay footer__pay--visa">VISA</li>
            <li className="footer__pay footer__pay--mc" aria-label="Mastercard">
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </li>
            <li className="footer__pay footer__pay--cod">COD</li>
          </ul>

          <ul className="footer__legal">
            {LEGAL_LINKS.map(({ label, to }) => (
              <li key={label}>
                <Link to={to}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
