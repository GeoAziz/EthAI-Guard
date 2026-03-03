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
import { debugLogger } from '@/lib/debug-logger';

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
    if (!auth) {
      debugLogger.error('AUTH_CONTEXT', 'Firebase auth not initialized');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      debugLogger.debug('AUTH_CONTEXT', 'Auth state changed', {
        hasUser: !!user,
        uid: user?.uid,
        email: user?.email,
      });

      setUser(user);
      // extract custom claims (roles) from the ID token if available
      (async () => {
        if (user) {
          try {
            // PHASE 2 REFACTOR: Firebase tokens are used directly
            // No backend token exchange needed anymore
            // Backend validates Firebase ID token via firebaseAuth middleware
            // Roles come from Firebase custom claims embedded in ID token
            
            debugLogger.debug('AUTH_CONTEXT', 'Extracting roles from ID token');
            const idTokenResult = await user.getIdTokenResult();
            const claims = idTokenResult?.claims || {};

            // Extract role from Firebase custom claims (single source of truth)
            if (Array.isArray(claims.roles)) {
              setRoles(claims.roles as string[]);
              debugLogger.info('AUTH_CONTEXT', 'Roles extracted from claims', {
                roles: claims.roles,
              });
            } else if (typeof claims.role === 'string') {
              // comma separated or single role
              const r = (claims.role as string).split(',').map(s => s.trim()).filter(Boolean);
              setRoles(r);
              debugLogger.info('AUTH_CONTEXT', 'Roles parsed from string', {
                roles: r,
                raw: claims.role,
              });
            } else {
              setRoles([]);
              debugLogger.debug('AUTH_CONTEXT', 'No roles found in claims');
            }
          } catch (err) {
            debugLogger.warn('AUTH_CONTEXT', 'Error extracting roles', err);
            setRoles([]);
          }
        } else {
          // clear any stored backend tokens when signed out (legacy cleanup)
          debugLogger.debug('AUTH_CONTEXT', 'Clearing tokens on sign out');
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
    debugLogger.info('AUTH_CONTEXT', 'Register attempt started', {
      email,
      timestamp: new Date().toISOString(),
    });
    
    if (!auth) {
      const error = new Error('Firebase auth not initialized');
      debugLogger.error('AUTH_CONTEXT', 'Registration failed - auth not initialized', error);
      throw error;
    }
    
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      debugLogger.success('AUTH_CONTEXT', 'Registration successful', {
        uid: result.user.uid,
        email: result.user.email,
      });
      return result;
    } catch (error: any) {
      debugLogger.error('AUTH_CONTEXT', 'Registration failed', {
        code: error.code,
        message: error.message,
      });
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<any> => {
    // PHASE 2 REFACTOR (Free-Tier Production Hunt):
    // Firebase-only authentication. No backend login processing.
    // Frontend: Use Firebase SDK to authenticate user
    // Backend: Validates Firebase ID token on every request via firebaseAuth middleware
    // Role authority: Firebase custom claims (set via admin setCustomUserClaims on approval)
    
    debugLogger.info('AUTH_CONTEXT', 'Login attempt started', {
      email,
      timestamp: new Date().toISOString(),
    });
    
    if (!auth) {
      const error = new Error('Firebase auth not initialized');
      debugLogger.error('AUTH_CONTEXT', 'Login failed - auth not initialized', error);
      throw error;
    }
    
    try {
      debugLogger.debug('AUTH_CONTEXT', 'Calling Firebase signInWithEmailAndPassword');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      
      debugLogger.success('AUTH_CONTEXT', 'Firebase login successful', {
        uid: cred.user.uid,
        email: cred.user.email,
        emailVerified: cred.user.emailVerified,
      });
      
      // Firebase SDK handles token storage automatically (used by api client via getIdToken)
      // onAuthStateChanged listener will extract roles from ID token claims
      return cred;
    } catch (error: any) {
      debugLogger.error('AUTH_CONTEXT', 'Firebase login failed', {
        code: error.code,
        message: error.message,
      });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    debugLogger.info('AUTH_CONTEXT', 'Logout initiated');
    
    if (!COOKIE_MODE) {
      try { 
        debugLogger.debug('AUTH_CONTEXT', 'Removing legacy tokens');
        localStorage.removeItem('backend_access_token'); 
      } catch (e) {}
      try { localStorage.removeItem('backend_refresh_token'); } catch (e) {}
    } else {
      // In cookie mode we rely on server cookies; attempt to clear server-side
      // refresh cookie by calling logout-cookie endpoint where possible (best-effort).
      try { 
        debugLogger.debug('AUTH_CONTEXT', 'Calling server logout endpoint (cookie mode)');
        await api.post('/auth/logout-cookie'); 
      } catch (_) { 
        debugLogger.warn('AUTH_CONTEXT', 'Server logout endpoint failed');
      }
    }
    
    try {
      if (!auth) {
        throw new Error('Firebase auth not initialized');
      }
      await signOut(auth);
      debugLogger.success('AUTH_CONTEXT', 'Firebase logout successful');
    } catch (error: any) {
      debugLogger.error('AUTH_CONTEXT', 'Firebase logout failed', error);
      throw error;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) {
      debugLogger.debug('AUTH_CONTEXT', 'getIdToken: No user found');
      return null;
    }
    
    try {
      debugLogger.debug('AUTH_CONTEXT', 'Getting ID token for user', { uid: user.uid });
      const token = await user.getIdToken();
      debugLogger.success('AUTH_CONTEXT', 'ID token retrieved successfully');
      return token;
    } catch (error) {
      debugLogger.error('AUTH_CONTEXT', 'Failed to get ID token', error);
      return null;
    }
  };

  const refreshRoles = async (): Promise<boolean> => {
    debugLogger.info('AUTH_CONTEXT', 'Refreshing user roles');
    
    try {
      debugLogger.debug('AUTH_CONTEXT', 'Fetching user data from /v1/users/me');
      const res = await api.get('/v1/users/me');
      const role = res.data?.role;

      if (Array.isArray(role)) {
        setRoles(role as string[]);
        debugLogger.success('AUTH_CONTEXT', 'Roles refreshed from backend (array)', {
          roles: role,
        });
        return true;
      } else if (typeof role === 'string') {
        const parsedRoles = role.split(',').map((s: string) => s.trim()).filter(Boolean);
        setRoles(parsedRoles);
        debugLogger.success('AUTH_CONTEXT', 'Roles refreshed from backend (string)', {
          roles: parsedRoles,
          raw: role,
        });
        return true;
      } else if (res.data && res.data.role) {
        setRoles([String(res.data.role)]);
        debugLogger.success('AUTH_CONTEXT', 'Roles refreshed from backend (single)', {
          role: res.data.role,
        });
        return true;
      } else {
        // fallback to token claims
        debugLogger.debug('AUTH_CONTEXT', 'No role in backend response, trying token claims');
        if (!auth) {
          debugLogger.error('AUTH_CONTEXT', 'Firebase auth not initialized');
          return false;
        }
        const u = auth.currentUser;
        if (!u) {
          debugLogger.warn('AUTH_CONTEXT', 'No user found for token refresh');
          setRoles([]);
          return false;
        }
        const idTokenResult = await u.getIdTokenResult(true);
        const claims = idTokenResult?.claims || {};
        if (Array.isArray(claims.roles)) {
          setRoles(claims.roles as string[]);
          debugLogger.info('AUTH_CONTEXT', 'Roles refreshed from token claims (array)', {
            roles: claims.roles,
          });
        } else if (typeof claims.role === 'string') {
          const parsedRoles = (claims.role as string).split(',').map(s => s.trim()).filter(Boolean);
          setRoles(parsedRoles);
          debugLogger.info('AUTH_CONTEXT', 'Roles refreshed from token claims (string)', {
            roles: parsedRoles,
          });
        } else {
          setRoles([]);
          debugLogger.debug('AUTH_CONTEXT', 'No roles in token claims');
        }
        return true;
      }
    } catch (e: any) {
      debugLogger.warn('AUTH_CONTEXT', 'Error fetching from /v1/users/me', {
        status: e.response?.status,
        message: e.message,
      });

      try {
        debugLogger.debug('AUTH_CONTEXT', 'Attempting to refresh roles from token');
        if (!auth) {
          debugLogger.error('AUTH_CONTEXT', 'Firebase auth not initialized for token refresh fallback');
          return false;
        }
        const u = auth.currentUser;
        if (!u) {
          debugLogger.error('AUTH_CONTEXT', 'No user found for token refresh fallback');
          return false;
        }
        const idTokenResult = await u.getIdTokenResult(true);
        const claims = idTokenResult?.claims || {};
        if (Array.isArray(claims.roles)) {
          setRoles(claims.roles as string[]);
          debugLogger.success('AUTH_CONTEXT', 'Roles refreshed from token (fallback, array)', {
            roles: claims.roles,
          });
        } else if (typeof claims.role === 'string') {
          const parsedRoles = (claims.role as string).split(',').map(s => s.trim()).filter(Boolean);
          setRoles(parsedRoles);
          debugLogger.success('AUTH_CONTEXT', 'Roles refreshed from token (fallback, string)', {
            roles: parsedRoles,
          });
        } else {
          setRoles([]);
          debugLogger.debug('AUTH_CONTEXT', 'No roles in token claims (fallback)');
        }
        return true;
      } catch (err: any) {
        debugLogger.error('AUTH_CONTEXT', 'Failed to refresh roles from token', {
          code: err.code,
          message: err.message,
        });
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
