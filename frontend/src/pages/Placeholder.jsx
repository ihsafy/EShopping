import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function Placeholder({ title, phase }) {
  return (
    <div className="container state">
      <Helmet>
        <title>{title} | EShopping</title>
      </Helmet>
      <h1>{title}</h1>
      <p>This screen is part of {phase || 'a later phase'} and is not built yet.</p>
      <Link to="/" className="btn btn--primary">
        Back to home
      </Link>
    </div>
  );
}
