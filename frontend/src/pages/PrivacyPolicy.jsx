import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiMail, FiShield, FiLock, FiEye, FiTrash2, FiUserCheck } from 'react-icons/fi';

const SECTIONS = [
  {
    icon: FiEye,
    title: 'Information we collect',
    body: 'We collect the details you provide when you create an account, place an order or contact support — your name, email address, delivery address, phone number and order history. We also record basic technical information such as your browser type and the pages you visit so the store keeps working reliably.',
  },
  {
    icon: FiUserCheck,
    title: 'How we use your information',
    body: 'Your information lets us process orders, arrange delivery, provide tracking updates, answer support requests and personalise your shopping experience. With your consent we may also send offers and product news; you can opt out at any time from your account settings.',
  },
  {
    icon: FiLock,
    title: 'How we protect your data',
    body: 'Passwords are stored using one-way hashing and all traffic between your browser and our servers is encrypted in transit. Access to customer records is limited to the staff who need it to fulfil your order, and we review our safeguards regularly.',
  },
  {
    icon: FiShield,
    title: 'Sharing and third parties',
    body: 'We share only the minimum information required with delivery partners and payment providers to complete your order. We never sell your personal data. Third parties only receive the data needed to perform their specific service.',
  },
  {
    icon: FiTrash2,
    title: 'Retention and your rights',
    body: 'We keep order records for as long as required to meet tax and legal obligations, then delete or anonymise them. You may request access to, correction of, or deletion of your personal data, and you can close your account at any time.',
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="container legal">
      <Helmet>
        <title>Privacy Policy | EShopping</title>
        <meta name="description" content="How EShopping collects, uses and protects your personal information." />
      </Helmet>

      <header className="legal__head">
        <span className="legal__eyebrow">Legal</span>
        <h1>Privacy Policy</h1>
        <p className="legal__updated">Last updated: 2 October 2026</p>
      </header>

      <p className="legal__intro">
        Your privacy matters. This policy explains what information EShopping collects, why we collect it,
        and the choices you have. By using the store you agree to the practices described here.
      </p>

      <div className="legal__sections">
        {SECTIONS.map(({ icon: Icon, title, body }) => (
          <section key={title} className="legal__section">
            <span className="legal__section-icon" aria-hidden="true">
              <Icon />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
          </section>
        ))}
      </div>

      <section className="legal__cta">
        <FiMail aria-hidden="true" />
        <div>
          <h2>Questions about your data?</h2>
          <p>Contact our privacy team and we will respond as quickly as we can.</p>
        </div>
        <Link to="/contact" className="btn btn--primary">
          Contact us
        </Link>
      </section>

      <p className="legal__back">
        <Link to="/terms-of-service">Read the Terms of Service</Link>
      </p>
    </div>
  );
}
