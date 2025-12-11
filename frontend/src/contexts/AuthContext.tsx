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
import api, { setBackendAccessToken, setBackendRefreshToken } from '@/lib/api';

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
                    setBackendAccessToken(access);
                  }
                  if (refresh) {
                    try { localStorage.setItem('backend_refresh_token', refresh); } catch (e) {}
                  }
                }
              } catch (e) {
                // Exchange may fail in dev/test; that's OK — fallback to token claims
                console.debug('Backend token exchange failed (ok in dev):', (e as any)?.response?.data || (e as any)?.message || e);
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
            // Debug: show ID token claims so frontend can verify role claims
            try { console.debug('[AuthContext] idToken claims:', claims); } catch (e) {}
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
            console.warn('Failed to read id token claims', err);
            setRoles([]);
          }
        } else {
          // clear any stored backend tokens when signed out
          if (!COOKIE_MODE) {
            try { localStorage.removeItem('backend_access_token'); } catch (e) {}
            try { localStorage.removeItem('backend_refresh_token'); } catch (e) {}
            setBackendAccessToken(null);
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
      console.log('[AuthContext.login] Starting backend login for:', email);
      console.log('[AuthContext.login] NEXT_PUBLIC_USE_BACKEND_LOGIN:', process.env.NEXT_PUBLIC_USE_BACKEND_LOGIN);
      console.log('[AuthContext.login] API baseURL:', api.defaults.baseURL);
      
      let access: string | undefined;
      let refresh: string | undefined;
      
      try {
        console.log('[AuthContext.login] Making POST /auth/login request...');
        const resp = await api.post('/auth/login', { email, password, deviceName: 'frontend' });
        console.log('[AuthContext.login] Backend login response status:', resp.status);
        console.log('[AuthContext.login] Backend login response data:', resp.data);
        access = resp.data?.accessToken || resp.data?.access_token;
        refresh = resp.data?.refreshToken || resp.data?.refresh_token;
        console.log('[AuthContext.login] Extracted access token present:', !!access);
        console.log('[AuthContext.login] Extracted refresh token present:', !!refresh);
        
        if (access) {
          console.log('[AuthContext.login] Storing backend_access_token in localStorage...');
          try { localStorage.setItem('backend_access_token', access); } catch (e) { console.error('[AuthContext.login] localStorage.setItem failed:', e); }
          console.log('[AuthContext.login] Calling setBackendAccessToken()...');
          setBackendAccessToken(access);
          
          try {
            // log stored token presence (do not print full token in prod)
            const stored = typeof window !== 'undefined' ? localStorage.getItem('backend_access_token') : null;
            console.debug('[AuthContext] after login, localStorage.backend_access_token present:', !!stored);
          } catch (e) {}
          
          try {
            // best-effort: decode backend JWT and log claims for debugging
            const payload = access.split('.')[1];
            const decoded = JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/')));
            console.debug('[AuthContext] backend access token claims:', decoded);
          } catch (e) {
            console.debug('[AuthContext] backend access token decode failed', e);
          }
        } else {
          console.error('[AuthContext.login] No access token in response!');
        }
        
        if (refresh) {
          console.log('[AuthContext.login] Storing backend_refresh_token in localStorage...');
          try { localStorage.setItem('backend_refresh_token', refresh); } catch (e) { console.error('[AuthContext.login] localStorage refresh setItem failed:', e); }
          setBackendRefreshToken(refresh);
        }
      } catch (loginErr) {
        console.error('[AuthContext.login] Backend login failed:', loginErr);
        console.error('[AuthContext.login] Error details:', {
          message: (loginErr as any).message,
          code: (loginErr as any).code,
          response: (loginErr as any).response?.data,
          status: (loginErr as any).response?.status,
        });
        throw loginErr;
      }

      // Populate roles from backend authoritative endpoint
      try {
        console.log('[AuthContext.login] Fetching /v1/users/me to get roles...');
        const me = await api.get('/v1/users/me');
        console.log('[AuthContext.login] /v1/users/me response:', me?.data);
        const roleFromBackend = me?.data?.role;
        console.log('[AuthContext.login] Role from backend:', roleFromBackend);
        if (Array.isArray(roleFromBackend)) {
          console.log('[AuthContext.login] Role is array:', roleFromBackend);
          setRoles(roleFromBackend as string[]);
        }
        else if (typeof roleFromBackend === 'string') {
          const roles = roleFromBackend.split(',').map(s => s.trim()).filter(Boolean);
          console.log('[AuthContext.login] Role is string, split to:', roles);
          setRoles(roles);
        }
        
        // Set synthetic user object so frontend knows we're logged in
        // (Firebase flow sets this via onAuthStateChanged, backend flow needs it here)
        console.log('[AuthContext.login] Setting user object...');
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
        console.log('[AuthContext.login] User object set successfully');
      } catch (e) {
        console.error('[AuthContext.login] Error fetching /v1/users/me:', e);
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
        setBackendAccessToken(access);
      }
      if (refresh) {
        try { localStorage.setItem('backend_refresh_token', refresh); } catch (e) {}
        setBackendRefreshToken(refresh);
      }
    } catch (e) {
      // don't block login on exchange failure
      console.debug('Token exchange failed after login (ok in dev/test):', (e as any)?.response?.data || (e as any)?.message || e);
    }
    return cred;
  };

  const logout = async (): Promise<void> => {
    if (!COOKIE_MODE) {
      try { localStorage.removeItem('backend_access_token'); } catch (e) {}
      try { localStorage.removeItem('backend_refresh_token'); } catch (e) {}
      setBackendAccessToken(null);
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
      console.error('Error getting ID token:', error);
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
        console.warn('Failed to refresh roles', err);
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
