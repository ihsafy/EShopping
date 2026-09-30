import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMe, logout as logoutService, register as registerService } from '../services/auth';
import { setToken } from '../services/client';

const AuthContext = createContext(null);

/**
 * Holds the signed-in customer for the whole shell (header, footer and any
 * page below the router outlet). Restores the session from the stored token
 * once on boot so deep links render signed-in state immediately.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchMe()
      .then((u) => alive && setUser(u))
      .catch(() => {})
      .finally(() => alive && setBooting(false));
    return () => {
      alive = false;
    };
  }, []);

  // The HTTP client drops the token whenever the API answers 401, so mirror
  // that here: an expired session must not leave authenticated UI behind.
  useEffect(() => {
    const onUnauthorized = () => setUser((current) => (current ? null : current));
    window.addEventListener('eshopping:unauthorized', onUnauthorized);
    return () => window.removeEventListener('eshopping:unauthorized', onUnauthorized);
  }, []);

  const signIn = useCallback((nextUser, token) => {
    if (token) setToken(token);
    setUser(nextUser);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    logoutService();
  }, []);

  /** Register + auto sign-in in one step. */
  const signUp = useCallback(async (payload) => {
    const data = await registerService(payload);
    signIn(data.user, data.token);
    return data.user;
  }, [signIn]);

  const refresh = useCallback(async () => {
    const current = await fetchMe();
    setUser(current);
    return current;
  }, []);

  const value = useMemo(
    () => ({ user, booting, signIn, signOut, signUp, refresh }),
    [user, booting, signIn, signOut, signUp, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
