import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiEye, FiEyeOff, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuth from '../../context/useAuth';
import { adminLogin } from '../../services/auth';

const EMPTY = { identifier: '', password: '' };

function validate(form) {
  const errors = {};
  const identifier = form.identifier.trim();
  if (!identifier) errors.identifier = 'This field is required';
  else if (identifier.length < 3) errors.identifier = 'Must be at least 3 characters';

  if (!form.password) errors.password = 'This field is required';

  return errors;
}

export default function AdminLogin() {
  const { user, booting, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get('next') || '/admin';

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);

  // Already signed in as an administrator -> straight to the dashboard.
  useEffect(() => {
    if (!booting && user?.role === 'admin') navigate(next, { replace: true });
  }, [booting, user, next, navigate]);

  const set = (key) => (event) => {
    const { value } = event.target;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
    if (banner) setBanner('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setBanner('');

    // Invalid input never reaches the network; the banner below is only ever
    // set when an actual sign-in request fails.
    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const data = await adminLogin({
        identifier: form.identifier.trim(),
        password: form.password,
      });
      // Defence in depth: the API already refuses non-admins, never store a
      // session that is not an administrator.
      if (data.user?.role !== 'admin') {
        setBanner('This account does not have administrator access.');
        return;
      }
      signIn(data.user, data.token);
      toast.success(data.message || 'Signed in to the admin dashboard');
      navigate(next, { replace: true });
    } catch (err) {
      setErrors(err.payload?.errors || {});
      setBanner(
        err.status === 0
          ? 'Could not reach the server. Please try again.'
          : err.message || 'Incorrect email or password'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth admin-login">
      <Helmet>
        <title>Admin sign in | EShopping</title>
      </Helmet>

      <div className="auth__card">
        <div className="admin-login__brand">
          <span className="brand__mark">E</span>
          <span className="brand__name">EShopping</span>
          <span className="admin-login__badge">
            <FiShield size={12} /> Admin
          </span>
        </div>

        <h1>Admin Sign In</h1>
        <p className="muted">Sign in with the administrator email or mobile number.</p>

        {banner && <div className="alert alert--error">{banner}</div>}

        <form onSubmit={submit} noValidate>
          <label className={`field ${errors.identifier ? 'field--invalid' : ''}`}>
            <span>Email or mobile number</span>
            <input
              type="text"
              autoComplete="username"
              maxLength={160}
              placeholder="admin@example.com"
              value={form.identifier}
              onChange={set('identifier')}
            />
            {errors.identifier && <em className="field__error">{errors.identifier}</em>}
          </label>

          <label className={`field ${errors.password ? 'field--invalid' : ''}`}>
            <span>Password</span>
            <span className="field__control">
              <input
                type={reveal ? 'text' : 'password'}
                autoComplete="current-password"
                maxLength={100}
                placeholder="Your password"
                value={form.password}
                onChange={set('password')}
              />
              <button
                type="button"
                className="field__reveal"
                aria-label={reveal ? 'Hide password' : 'Show password'}
                aria-pressed={reveal}
                onClick={() => setReveal((v) => !v)}
              >
                {reveal ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </span>
            {errors.password && <em className="field__error">{errors.password}</em>}
          </label>

          <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth__alt">
          Shopping instead? <Link to="/login">Sign in to your account</Link>
        </p>
      </div>
    </div>
  );
}
