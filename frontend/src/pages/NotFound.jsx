import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFound() {
  return (
    <div className="container state">
      <Helmet>
        <title>Page not found | EShopping</title>
      </Helmet>
      <h1>404</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="btn btn--primary">
        Back to home
      </Link>
    </div>
  );
}
