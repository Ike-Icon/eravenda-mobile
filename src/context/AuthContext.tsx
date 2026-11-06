/**
 * AUTH STATE FLOW
 *  app start -> status "loading" -> read token from SecureStore -> GET /auth/me
 *     valid   -> status "signedIn"  (user populated)
 *     missing/invalid -> status "signedOut" (Auth stack shown, browsing still possible via Guest)
 *  signIn/signUp -> store token -> set user. signOut -> clear token + user.
 *  Any 401 from the API triggers signOut through setUnauthorizedHandler.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { setUnauthorizedHandler, tokenStore } from '../services/http';
import { unregisterFromPush } from '../services/pushService';
import { googleSignOut } from '../services/socialAuth';
import type { TokenResponse, User } from '../types/api';

type Status = 'loading' | 'signedIn' | 'signedOut';

interface AuthValue {
  status: Status;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { full_name: string; email: string; phone?: string; password: string }) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-fetch GET /auth/me (after profile edits). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);

  const accept = useCallback(async (res: TokenResponse) => {
    await tokenStore.set(res.access_token);
    setUser(res.user);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    await unregisterFromPush(); // needs the token, so it runs before the token is cleared
    void googleSignOut(); // forget the Google session so the next sign-in lets the person pick an account
    try {
      await tokenStore.clear();
    } finally {
      setUser(null);
      setStatus('signedOut');
    }
  }, []);

  // Restore session on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await tokenStore.get();
      if (!token) return !cancelled && setStatus('signedOut');
      try {
        const me = await authService.me();
        if (!cancelled) {
          setUser(me);
          setStatus('signedIn');
        }
      } catch {
        if (!cancelled) await signOut();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signOut]);

  // Any 401 from an authenticated call ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      signIn: async (email, password) => accept(await authService.login(email, password)),
      signUp: async (input) => accept(await authService.register(input)),
      signInWithGoogle: async (idToken) => accept(await authService.google(idToken)),
      signOut,
      refreshUser: async () => setUser(await authService.me()),
    }),
    [status, user, accept, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
