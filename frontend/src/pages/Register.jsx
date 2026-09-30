import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import useAuth from '../context/useAuth';

const EMPTY = { name: '', mobile: '', email: '', password: '', confirmPassword: '' };

// Mirrors backend/src/utils/helpers.js so invalid input never leaves the page.
const normaliseMobile = (value) => {
  let mobile = String(value || '').replace(/[\s\-()]/g, '');
  if (mobile.startsWith('+880')) mobile = `0${mobile.slice(4)}`;
  if (mobile.startsWith('880') && mobile.length === 13) mobile = `0${mobile.slice(3)}`;
  return mobile;
};

const isValidMobile = (value) => /^01[3-9]\d{8}$/.test(normaliseMobile(value));
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());

/** Client-side rules, same messages the API would send. */
function validate(form) {
  const errors = {};
  const name = form.name.trim();
  const password = form.password;
  const confirm = form.confirmPassword;
  const email = form.email.trim();

  if (!name) errors.name = 'This field is required';
  else if (name.length < 2) errors.name = 'Must be at least 2 characters';
  else if (name.length > 120) errors.name = 'Must be at most 120 characters';

  if (!form.mobile.trim()) errors.mobile = 'This field is required';
  else if (!isValidMobile(form.mobile)) errors.mobile = 'Enter a valid mobile number (e.g. 01712345678)';

  // Email is optional - only validated when the visitor actually types one.
  if (email && !isValidEmail(email)) errors.email = 'Enter a valid email address';

  if (!password) errors.password = 'This field is required';
  else if (password.length < 6) errors.password = 'Must be at least 6 characters';
  else if (password.length > 100) errors.password = 'Must be at most 100 characters';

  if (!confirm) errors.confirmPassword = 'This field is required';
  else if (password !== confirm) errors.confirmPassword = 'Passwords do not match';

  return errors;
}

export default function Register() {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get('next') || '/';

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  const set = (key) => (event) => {
    const { value } = event.target;
    setForm((f) => ({ ...f, [key]: value }));
    // A stale error must never outlive the edit that fixes it.
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

    // Invalid input never reaches the network: the banner below is only ever
    // set when an actual registration request fails.
    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        mobile: normaliseMobile(form.mobile),
        password: form.password,
        confirmPassword: form.confirmPassword,
        email: form.email.trim(),
      };
      await signUp(payload);
      toast.success('Account created successfully');
      navigate(next, { replace: true });
    } catch (err) {
      const response = err.payload || {};
      const mapped = { ...(response.errors || {}) };
      // The API reports the mismatch under `passwordMatch`; surface it on the
      // confirm field so the message sits next to the input it refers to.
      if (mapped.passwordMatch && !mapped.confirmPassword) {
        mapped.confirmPassword = mapped.passwordMatch;
      }
      delete mapped.passwordMatch;
      setErrors(mapped);
      setBanner(
        err.status === 0
          ? 'Could not reach the server. Please try again.'
          : err.message || 'Could not create the account. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const suffix = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <div className="auth">
      <Helmet>
        <title>Create account | EShopping</title>
      </Helmet>

      <div className="auth__card">
        <h1>Create your account</h1>
        <p className="muted">Only your mobile number is required - email stays optional.</p>

        {banner && <div className="alert alert--error">{banner}</div>}

        <form onSubmit={submit} noValidate>
          <div className="form-row">
            <label className={`field ${errors.name ? 'field--invalid' : ''}`}>
              <span>Full name</span>
              <input
                type="text"
                autoComplete="name"
                maxLength={120}
                placeholder="Ayesha Rahman"
                value={form.name}
                onChange={set('name')}
              />
              {errors.name && <em className="field__error">{errors.name}</em>}
            </label>

            <label className={`field ${errors.mobile ? 'field--invalid' : ''}`}>
              <span>Mobile number</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={14}
                autoComplete="tel"
                placeholder="01712345678"
                value={form.mobile}
                onChange={set('mobile')}
              />
              {errors.mobile && <em className="field__error">{errors.mobile}</em>}
            </label>
          </div>

          <label className={`field ${errors.email ? 'field--invalid' : ''}`}>
            <span>Email (optional)</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
            />
            {errors.email && <em className="field__error">{errors.email}</em>}
          </label>

          <div className="form-row">
            <label className={`field ${errors.password ? 'field--invalid' : ''}`}>
              <span>Password</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={set('password')}
              />
              {errors.password && <em className="field__error">{errors.password}</em>}
            </label>

            <label className={`field ${errors.confirmPassword ? 'field--invalid' : ''}`}>
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Repeat the password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
              />
              {errors.confirmPassword && <em className="field__error">{errors.confirmPassword}</em>}
            </label>
          </div>

          <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth__alt">
          Already have an account? <Link to={`/login${suffix}`}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
