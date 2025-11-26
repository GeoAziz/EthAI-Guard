"use client";

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
            console.warn('Failed to read id token claims', err);
            setRoles([]);
          }
        } else {
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

  const login = async (email: string, password: string): Promise<UserCredential> => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async (): Promise<void> => {
    return signOut(auth);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
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
        if (!u) return false;
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
