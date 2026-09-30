import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';

export default function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error?.message || 'Something went wrong';

  return (
    <div className="container state state--error">
      <h1>Something broke</h1>
      <p>{message}</p>
      <Link to="/" className="btn btn--primary">
        Back to home
      </Link>
    </div>
  );
}
