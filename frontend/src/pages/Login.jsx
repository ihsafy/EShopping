import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import useAuth from '../context/useAuth';
import AuthVisual from '../components/AuthVisual';
import { login } from '../services/auth';

export default function Login() {
  const { user, signIn } = useAuth();
  const { store } = useOutletContext() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get('next') || '/';

  const [form, setForm] = useState({ mobile: '', password: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBanner('');
    setErrors({});
    setBusy(true);
    try {
      const data = await login(form);
      signIn(data.user, data.token);
      navigate(next, { replace: true });
    } catch (err) {
      setErrors(err.payload?.errors || {});
      setBanner(err.message || 'Sign in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const suffix = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <div className="auth">
      <Helmet>
        <title>Sign in | EShopping</title>
      </Helmet>

      <div className="auth__split">
        <AuthVisual store={store} />
        <section className="auth__panel">
          <div className="auth__card">
            <h1>Welcome back</h1>
        <p className="muted">Sign in to buy, track your orders and sync your wishlist.</p>

        {banner && <div className="alert alert--error">{banner}</div>}

        <form onSubmit={submit} noValidate>
          <label className={`field ${errors.mobile ? 'field--invalid' : ''}`}>
            <span>Mobile number</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={14}
              autoComplete="username"
              placeholder="01712345678"
              value={form.mobile}
              onChange={set('mobile')}
            />
            {errors.mobile && <em className="field__error">{errors.mobile}</em>}
          </label>

          <label className={`field ${errors.password ? 'field--invalid' : ''}`}>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={form.password}
              onChange={set('password')}
            />
            {errors.password && <em className="field__error">{errors.password}</em>}
          </label>

          <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {import.meta.env.DEV && (
          <p className="hint">
            Demo customer: <strong>01712345678</strong> / <strong>Password123</strong>
          </p>
        )}

            <p className="auth__alt">
              New to EShopping? <Link to={`/register${suffix}`}>Create an account</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
