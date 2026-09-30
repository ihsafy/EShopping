import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import ImagePicker from '../../components/admin/ImagePicker';
import { fetchAdminSettings, saveSettings, uploadImages } from '../../services/admin';

export default function AdminBranding() {
  const [settings, setSettings] = useState(null);
  const [values, setValues] = useState({ store_name: '', store_tagline: '', store_logo: '', store_favicon: '' });
  const [logoFiles, setLogoFiles] = useState([]);
  const [faviconFiles, setFaviconFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminSettings()
      .then((next) => {
        setSettings(next);
        setValues({
          store_name: next.store_name || '',
          store_tagline: next.store_tagline || '',
          store_logo: next.store_logo || '',
          store_favicon: next.store_favicon || '',
        });
      })
      .catch((err) => setError(err.message || 'Could not load the branding.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (event) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!values.store_name.trim()) {
      toast.error('The site name is required');
      return;
    }
    setSaving(true);
    try {
      let store_logo = values.store_logo;
      let store_favicon = values.store_favicon;
      if (logoFiles.length) [store_logo] = (await uploadImages(logoFiles)).urls;
      if (faviconFiles.length) [store_favicon] = (await uploadImages(faviconFiles)).urls;

      const result = await saveSettings({
        store_name: values.store_name.trim(),
        store_tagline: values.store_tagline.trim(),
        store_logo,
        store_favicon,
      });
      setSettings(result.settings);
      setValues({ store_name: values.store_name.trim(), store_tagline: values.store_tagline.trim(), store_logo, store_favicon });
      setLogoFiles([]);
      setFaviconFiles([]);
      toast.success(result.message || 'Branding saved');
    } catch (err) {
      toast.error(err.message || 'Could not save the branding.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="muted admin-page__loading">Loading branding…</p>;

  return (
    <section className="admin-page">
      <Helmet>
        <title>Site branding | EShopping Admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Site branding</h1>
          <p className="muted">Applied to the public header, footer and browser tab.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert--error">
          {error}{' '}
          <button
            type="button"
            className="admin-linkbtn"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      )}

      <div className="admin-panel">
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-branding__preview">
            <div className="admin-branding__logo">
              {values.store_logo ? (
                <img src={values.store_logo} alt="Store logo" />
              ) : (
                <span className="admin-branding__fallback">E</span>
              )}
              <span className="muted">Header logo preview</span>
            </div>
            <div className="admin-branding__logo admin-branding__logo--small">
              {values.store_favicon ? (
                <img src={values.store_favicon} alt="Favicon" />
              ) : (
                <span className="admin-branding__fallback">E</span>
              )}
              <span className="muted">Browser tab icon preview</span>
            </div>
          </div>

          <div className="admin-form__row">
            <div className="admin-field admin-field--grow">
              <label className="admin-field__label" htmlFor="site-name">
                Site name *
              </label>
              <input
                id="site-name"
                type="text"
                value={values.store_name}
                onChange={set('store_name')}
                placeholder="EShopping"
              />
            </div>
            <div className="admin-field admin-field--grow">
              <label className="admin-field__label" htmlFor="site-tagline">
                Tagline
              </label>
              <input
                id="site-tagline"
                type="text"
                value={values.store_tagline}
                onChange={set('store_tagline')}
                placeholder="Everything you love, delivered"
              />
            </div>
          </div>

          <div className="admin-form__row">
            <ImagePicker
              label="Logo"
              hint="Shown in the site header — PNG or SVG-style image works best"
              existing={values.store_logo ? [values.store_logo] : []}
              files={logoFiles}
              onFiles={setLogoFiles}
              onRemoveExisting={() => setValues((prev) => ({ ...prev, store_logo: '' }))}
              max={1}
            />
            <ImagePicker
              label="Favicon"
              hint="Square icon for the browser tab (32×32 recommended)"
              existing={values.store_favicon ? [values.store_favicon] : []}
              files={faviconFiles}
              onFiles={setFaviconFiles}
              onRemoveExisting={() => setValues((prev) => ({ ...prev, store_favicon: '' }))}
              max={1}
            />
          </div>

          <div className="admin-form__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save branding'}
            </button>
            <span className="muted">Customers see the new logo immediately on their next page load.</span>
          </div>
        </form>
      </div>

      {settings && <p className="muted">Current tagline: “{settings.store_tagline}”</p>}
    </section>
  );
}
