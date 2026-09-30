import { useContext } from 'react';
import AuthContext from './AuthContext';

/** Signed-in customer (or null) plus signIn/signOut/signUp/refresh helpers. */
export default function useAuth() {
  return useContext(AuthContext);
}
