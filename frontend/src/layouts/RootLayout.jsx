import { useEffect, useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PromoBar from '../components/PromoBar';
import { AuthProvider } from '../context/AuthContext';
import { fetchCategories, fetchStore } from '../services/catalog';

export default function RootLayout() {
  const [store, setStore] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchStore(), fetchCategories()])
      .then(([storeData, categoryData]) => {
        if (!alive) return;
        setStore(storeData);
        setCategories(categoryData || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Keep the browser tab icon in sync with the admin branding (Site branding).
  useEffect(() => {
    const link = document.querySelector('link[rel="icon"]');
    if (!link) return;
    link.setAttribute('href', store?.favicon || '/favicon.svg');
  }, [store?.favicon]);

  return (
    <AuthProvider>
      <div className="app">
        <ScrollRestoration />
        <PromoBar />
        <Header store={store} categories={categories} />
        {/* tabIndex -1 so the skip link can move focus here on a real route
            change without making the container a tab stop. */}
        <main className="main" id="main" tabIndex={-1}>
          <Outlet context={{ store, categories }} />
        </main>
        <Footer store={store} />
      </div>
    </AuthProvider>
  );
}