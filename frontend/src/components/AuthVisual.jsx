import { Link } from 'react-router-dom';
import { FiCheckCircle, FiShield, FiTruck } from 'react-icons/fi';

const PERKS = [
  { icon: FiTruck, text: 'Free delivery on eligible orders' },
  { icon: FiShield, text: 'Secure payments, buyer protection' },
  { icon: FiCheckCircle, text: 'Track every order in real time' },
];

/**
 * Decorative left column for the sign-in / register screens. Purely visual:
 * ambient gradient glows plus a floating product mockup, matching the
 * Google-Store style hero the storefront uses.
 */
export default function AuthVisual({ store }) {
  const storeName = store?.storeName || 'EShopping';
  const tagline = store?.tagline || 'Everything you love, delivered.';

  return (
    <aside className="auth__visual" aria-hidden="true">
      <span className="auth__glow auth__glow--one" />
      <span className="auth__glow auth__glow--two" />

      <div className="auth__visual-inner">
        <Link to="/" className="auth__brand" tabIndex={-1}>
          {store?.logo ? (
            <img className="auth__brand-logo" src={store.logo} alt="" />
          ) : (
            <span className="auth__brand-mark">E</span>
          )}
          {storeName}
        </Link>

        <div className="auth__mockups">
          <div className="auth__mock auth__mock--back">
            <span className="auth__mock-line" />
            <span className="auth__mock-line auth__mock-line--short" />
          </div>
          <div className="auth__mock auth__mock--front">
            <span className="auth__mock-badge">New</span>
            <span className="auth__mock-thumb" />
            <span className="auth__mock-line" />
            <span className="auth__mock-line auth__mock-line--short" />
            <span className="auth__mock-price">৳9,999</span>
          </div>
        </div>

        <div className="auth__copy">
          <h2>{tagline}</h2>
          <p>Millions of products, one friendly checkout - join {storeName} today.</p>
          <ul className="auth__perks">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <Icon aria-hidden="true" /> {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
