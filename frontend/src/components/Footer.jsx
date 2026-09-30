import { Link } from 'react-router-dom';
import { FiMail, FiPhone, FiMapPin, FiGithub, FiLinkedin, FiGlobe } from 'react-icons/fi';

export default function Footer({ store }) {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <div className="brand brand--footer">
            {store?.logo ? (
              <img className="brand__logo" src={store.logo} alt="" />
            ) : (
              <span className="brand__mark">E</span>
            )}
            <span className="brand__name">{store?.storeName || 'EShopping'}</span>
          </div>
          <p className="footer__tagline">{store?.tagline || 'Everything you love, delivered'}</p>
        </div>

        <div>
          <h4>Shop</h4>
          <Link to="/shop">All products</Link>
          <Link to="/shop?sort=newest">New arrivals</Link>
          <Link to="/offers">Offers</Link>
          <Link to="/wishlist">Wishlist</Link>
        </div>

        <div className="footer__dev">
          <h4>Developer</h4>
          <p>
            <strong>IH Safy</strong>
          </p>
          <p>
            <FiPhone size={14} /> +8801724612320
          </p>
          <p>
            <FiMail size={14} /> ihsafy2k21@gmail.com
          </p>
          <a href="https://github.com/ihsafy" target="_blank" rel="noreferrer">
            <FiGithub size={14} /> GitHub
          </a>
          <a href="https://www.linkedin.com/in/ihsafy/" target="_blank" rel="noreferrer">
            <FiLinkedin size={14} /> LinkedIn
          </a>
          <a href="https://ihsafy.vercel.app" target="_blank" rel="noreferrer">
            <FiGlobe size={14} /> Portfolio
          </a>
        </div>

        <div>
          <h4>Contact</h4>
          <p>
            <FiPhone size={14} /> {store?.phone || 'Support number coming soon'}
          </p>
          <p>
            <FiMail size={14} /> {store?.email || 'support@eshopping.local'}
          </p>
          <p>
            <FiMapPin size={14} /> {store?.address || 'Dhaka, Bangladesh'}
          </p>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container">
          © {new Date().getFullYear()} {store?.storeName || 'EShopping'}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
