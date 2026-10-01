import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiPackage, FiCreditCard, FiRotateCcw, FiAlertCircle, FiUser, FiFileText } from 'react-icons/fi';

const SECTIONS = [
  {
    icon: FiFileText,
    title: 'Acceptance of these terms',
    body: 'By browsing or buying from EShopping you agree to these Terms of Service. If you do not agree with any part of them, please do not use the store. We may update these terms from time to time and will post the revised version on this page.',
  },
  {
    icon: FiUser,
    title: 'Your account',
    body: 'You are responsible for keeping your account password secure and for all activity that happens under your account. Please provide accurate contact and delivery details — this helps us get your order to you without delays.',
  },
  {
    icon: FiCreditCard,
    title: 'Pricing and payment',
    body: 'Prices, promotions and availability are shown in the store and may change without notice. Payment is taken at checkout using the methods we support. Where a pricing error is obvious we may cancel the affected order and issue a full refund.',
  },
  {
    icon: FiPackage,
    title: 'Shipping and delivery',
    body: 'Estimated delivery windows are provided in good faith and are not guaranteed. Risk passes to you once the order is delivered to the address you provided. Please check your parcel on arrival and report any damage promptly.',
  },
  {
    icon: FiRotateCcw,
    title: 'Returns and refunds',
    body: 'Unused items in their original packaging may be returned within the window shown on your order. Once we receive and inspect the return we will refund the eligible amount to your original payment method.',
  },
  {
    icon: FiAlertCircle,
    title: 'Acceptable use',
    body: 'You agree not to misuse the store, interfere with its operation, place fraudulent orders, or attempt to access accounts and data that are not yours. We may suspend or close accounts that break these rules.',
  },
];

export default function TermsOfService() {
  return (
    <div className="container legal">
      <Helmet>
        <title>Terms of Service | EShopping</title>
        <meta
          name="description"
          content="The terms and conditions that apply when you shop with EShopping."
        />
      </Helmet>

      <header className="legal__head">
        <span className="legal__eyebrow">Legal</span>
        <h1>Terms of Service</h1>
        <p className="legal__updated">Last updated: 2 October 2026</p>
      </header>

      <p className="legal__intro">
        These terms set out the rules for using EShopping and buying from us. Please read them carefully
        before you place an order.
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
        <FiPackage aria-hidden="true" />
        <div>
          <h2>Need help with an order?</h2>
          <p>Our support team can help with deliveries, returns and anything else.</p>
        </div>
        <Link to="/contact" className="btn btn--primary">
          Get in touch
        </Link>
      </section>

      <p className="legal__back">
        <Link to="/privacy-policy">Read the Privacy Policy</Link>
      </p>
    </div>
  );
}
