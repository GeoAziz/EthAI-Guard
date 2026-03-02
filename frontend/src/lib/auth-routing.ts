/**
 * Centralized authentication routing logic
 * Determines redirect destination after login based on user roles
 * Consolidates role detection from multiple sources (backend, Firebase, context)
 */

import { defaultRouteForRoles } from './rbac';

export interface AuthUser {
  id?: string;
  email?: string;
  emailVerified?: boolean;
}

export interface AuthTokenClaims {
  roles?: string | string[];
  role?: string | string[];
  [key: string]: any;
}

/**
 * Extract roles from various sources with priority ordering
 * @param backendRoles - Roles from backend /v1/users/me response
 * @param tokenClaims - Roles from Firebase ID token claims
 * @returns Normalized roles array
 */
export function extractRoles(
  backendRoles?: string | string[],
  tokenClaims?: AuthTokenClaims,
): string[] {
  // Priority 1: Backend roles (authoritative)
  if (backendRoles) {
    if (Array.isArray(backendRoles)) {
      return backendRoles;
    }
    if (typeof backendRoles === 'string') {
      return backendRoles
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
    }
  }

  // Priority 2: Token claims roles
  if (tokenClaims) {
    const rolesField = tokenClaims.roles || tokenClaims.role;
    if (rolesField) {
      if (Array.isArray(rolesField)) {
        return rolesField;
      }
      if (typeof rolesField === 'string') {
        return rolesField
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean);
      }
    }
  }

  return [];
}

/**
 * Determine whether to enforce email verification for a user
 * Non-privileged users must verify before accessing dashboard
 * @param user - Authenticated user object
 * @param roles - User's roles
 * @returns true if email verification should be enforced
 */
export function shouldEnforceEmailVerification(user: AuthUser | null, roles: string[]): boolean {
  if (!user || user.emailVerified) {
    return false;
  }

  // Admin, analyst, and reviewer can bypass email verification
  const privilegedRoles = ['admin', 'analyst', 'reviewer'];
  const hasPrivilegedRole = roles.some((r) => privilegedRoles.includes(r));

  return !hasPrivilegedRole;
}

/**
 * Get post-login redirect destination
 * Consolidates three-tier fallback for role routing
 * @param backendRoles - Roles from backend API
 * @param tokenClaims - Roles from Firebase token
 * @param contextRoles - Roles from AuthContext (fallback)
 * @returns Redirect URL path
 */
export function getRedirectAfterLogin(
  backendRoles?: string | string[],
  tokenClaims?: AuthTokenClaims,
  contextRoles?: string[],
): string {
  // Extract roles with priority ordering
  const roles = extractRoles(backendRoles, tokenClaims) || contextRoles;

  if (roles && roles.length > 0) {
    return defaultRouteForRoles(roles);
  }

  // Final fallback: generic dashboard
  return '/dashboard';
}
