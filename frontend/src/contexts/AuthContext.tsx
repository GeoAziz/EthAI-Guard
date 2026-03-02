'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  UserCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import api from '@/lib/api';

const COOKIE_MODE = process.env.NEXT_PUBLIC_USE_COOKIE_REFRESH === '1';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (email: string, password: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshRoles: () => Promise<boolean>;
  roles: string[];
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      // extract custom claims (roles) from the ID token if available
      (async () => {
        if (user) {
          try {
            // Try to exchange Firebase ID token for backend tokens so api calls use backend JWTs
            const idToken = await user.getIdToken();
            if (idToken) {
              try {
                const resp = await api.post('/auth/firebase/exchange', { idToken });
                // If backend is in cookie mode it will set HttpOnly cookies and
                // respond with a minimal { status: 'ok' } payload. Only persist
                // tokens client-side for the legacy JSON response path.
                if (COOKIE_MODE) {
                  // no-op: cookies were set by server; refreshRoles can read role
                  // from backend when needed.
                } else {
                  const access = resp.data?.accessToken || resp.data?.access_token;
                  const refresh = resp.data?.refreshToken || resp.data?.refresh_token;
                  if (access) {
                    try { localStorage.setItem('backend_access_token', access); } catch (e) {}
                  }
                  if (refresh) {
                    try { localStorage.setItem('backend_refresh_token', refresh); } catch (e) {}
                  }
                }
              } catch (e) {
                // Exchange may fail in dev/test; that's OK — fallback to token claims
              }

              // Best-effort: ask backend for authoritative role immediately after exchange
              try {
                const meResp = await api.get('/v1/users/me');
                const roleFromBackend = meResp?.data?.role;
                if (Array.isArray(roleFromBackend)) { setRoles(roleFromBackend as string[]); }
                else if (typeof roleFromBackend === 'string') { setRoles(roleFromBackend.split(',').map(s => s.trim()).filter(Boolean)); }
              } catch (__) {
                // ignore: roles will be populated from token claims or refreshRoles later
              }

            }

            const idTokenResult = await user.getIdTokenResult();
            const claims = idTokenResult?.claims || {};

            // support either `role` (string) or `roles` (array) claims
            if (Array.isArray(claims.roles)) {
              setRoles(claims.roles as string[]);
            } else if (typeof claims.role === 'string') {
              // comma separated or single role
              const r = (claims.role as string).split(',').map(s => s.trim()).filter(Boolean);
              setRoles(r);
            } else {
              setRoles([]);
            }
          } catch (err) {
            setRoles([]);
          }
        } else {
          // clear any stored backend tokens when signed out
          if (!COOKIE_MODE) {
            try { localStorage.removeItem('backend_access_token'); } catch (e) {}
            try { localStorage.removeItem('backend_refresh_token'); } catch (e) {}
          }
          setRoles([]);
        }
      })();

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (email: string, password: string): Promise<UserCredential> => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = async (email: string, password: string): Promise<any> => {
    // Backend-login toggle (explicit opt-in). When NEXT_PUBLIC_USE_BACKEND_LOGIN=1,
    // allow falling back to POST /auth/login if Firebase isn't initialized.
    const BACKEND_LOGIN_ENABLED = process.env.NEXT_PUBLIC_USE_BACKEND_LOGIN === '1';
    // If Firebase auth is not initialized (e.g. local dev without Firebase),
    // fall back to backend /auth/login only when BACKEND_LOGIN_ENABLED is set.
    if (BACKEND_LOGIN_ENABLED) {
      // Backend-login toggle (explicit opt-in). When NEXT_PUBLIC_USE_BACKEND_LOGIN=1,
      // prefer backend /auth/login regardless of Firebase client state. This avoids
      // relying on server-side Firebase admin configuration for token exchange in dev.
      let access: string | undefined;
      let refresh: string | undefined;

      try {
        const resp = await api.post('/auth/login', { email, password, deviceName: 'frontend' });
        access = resp.data?.accessToken || resp.data?.access_token;
        refresh = resp.data?.refreshToken || resp.data?.refresh_token;

        if (access) {
          try { localStorage.setItem('backend_access_token', access); } catch (e) { }
        }

        if (refresh) {
          try { localStorage.setItem('backend_refresh_token', refresh); } catch (e) { }
        }
      } catch (loginErr) {
        throw loginErr;
      }

      // Populate roles from backend authoritative endpoint
      try {
        const me = await api.get('/v1/users/me');
        const roleFromBackend = me?.data?.role;
        if (Array.isArray(roleFromBackend)) {
          setRoles(roleFromBackend as string[]);
        }
        else if (typeof roleFromBackend === 'string') {
          const roles = roleFromBackend.split(',').map(s => s.trim()).filter(Boolean);
          setRoles(roles);
        }

        // Set synthetic user object so frontend knows we're logged in
        // (Firebase flow sets this via onAuthStateChanged, backend flow needs it here)
        setUser({
          uid: me?.data?._id || me?.data?.id || 'backend-user',
          email: email,
          displayName: me?.data?.displayName || me?.data?.name || email.split('@')[0],
          photoURL: me?.data?.photoURL || null,
          emailVerified: true,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          phoneNumber: null,
          createdAt: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => access || '',
          getIdTokenResult: async () => ({ token: access, claims: { role: roleFromBackend }, expirationTime: new Date().toISOString(), issuedAtTime: new Date().toISOString(), signInProvider: null, signInSecond: undefined }),
          reload: async () => {},
          toJSON: () => ({}),
        } as any);
      } catch (e) {
        // ignore role fetch failure, but still set a minimal user object
        setUser({
          uid: 'backend-user',
          email: email,
          displayName: email.split('@')[0],
          photoURL: null,
          emailVerified: true,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          phoneNumber: null,
          createdAt: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => access || '',
          getIdTokenResult: async () => ({ token: access, claims: {}, expirationTime: new Date().toISOString(), issuedAtTime: new Date().toISOString(), signInProvider: null, signInSecond: undefined }),
          reload: async () => {},
          toJSON: () => ({}),
        } as any);
      }

      return { accessToken: access, refreshToken: refresh } as any;
    }

    // If Firebase is not initialized and backend-login is not enabled, fail early
    if (typeof window !== 'undefined' && !auth && !BACKEND_LOGIN_ENABLED) {
      throw new Error('Firebase not configured and backend-login fallback is disabled. Set NEXT_PUBLIC_USE_BACKEND_LOGIN=1 for local dev or configure Firebase.');
    }

    // Default (Firebase) flow
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // After sign-in, exchange ID token for backend access/refresh tokens (best-effort)
    try {
      const idToken = await cred.user.getIdToken();
      const resp = await api.post('/auth/firebase/exchange', { idToken });
      const access = resp.data?.accessToken || resp.data?.access_token;
      const refresh = resp.data?.refreshToken || resp.data?.refresh_token;
      if (access) {
        try { localStorage.setItem('backend_access_token', access); } catch (e) {}
      }
      if (refresh) {
        try { localStorage.setItem('backend_refresh_token', refresh); } catch (e) {}
      }
    } catch (e) {
      // don't block login on exchange failure
    }
    return cred;
  };

  const logout = async (): Promise<void> => {
    if (!COOKIE_MODE) {
      try { localStorage.removeItem('backend_access_token'); } catch (e) {}
      try { localStorage.removeItem('backend_refresh_token'); } catch (e) {}
    } else {
      // In cookie mode we rely on server cookies; attempt to clear server-side
      // refresh cookie by calling logout-cookie endpoint where possible (best-effort).
      try { await api.post('/auth/logout-cookie'); } catch (_) { /* ignore */ }
    }
    return signOut(auth);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) {return null;}
    try {
      return await user.getIdToken();
    } catch (error) {
      return null;
    }
  };

  const refreshRoles = async (): Promise<boolean> => {
    try {
      const res = await api.get('/v1/users/me');
      const role = res.data?.role;
      if (Array.isArray(role)) {
        setRoles(role as string[]);
      } else if (typeof role === 'string') {
        setRoles(role.split(',').map((s: string) => s.trim()).filter(Boolean));
      } else if (res.data && res.data.role) {
        setRoles([String(res.data.role)]);
      } else {
        // fallback to token claims
        const u = auth.currentUser;
        if (!u) {
          setRoles([]);
          return false;
        }
        const idTokenResult = await u.getIdTokenResult(true);
        const claims = idTokenResult?.claims || {};
        if (Array.isArray(claims.roles)) {
          setRoles(claims.roles as string[]);
        } else if (typeof claims.role === 'string') {
          setRoles((claims.role as string).split(',').map(s => s.trim()).filter(Boolean));
        } else {
          setRoles([]);
        }
      }
      return true;
    } catch (e) {
      try {
        const u = auth.currentUser;
        if (!u) {return false;}
        const idTokenResult = await u.getIdTokenResult(true);
        const claims = idTokenResult?.claims || {};
        if (Array.isArray(claims.roles)) {
          setRoles(claims.roles as string[]);
        } else if (typeof claims.role === 'string') {
          setRoles((claims.role as string).split(',').map(s => s.trim()).filter(Boolean));
        } else {
          setRoles([]);
        }
        return true;
      } catch (err) {
        return false;
      }
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    register,
    login,
    logout,
    getIdToken,
    refreshRoles,
    roles,
    hasRole: (role: string) => roles.includes(role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
