// RBAC helper utilities
export type UserRole = 'admin' | 'analyst' | 'reviewer' | 'user' | 'guest' | string;

const ROLE_PRIORITY: UserRole[] = ['admin', 'analyst', 'reviewer', 'user', 'guest'];

const ROLE_DEFAULT_ROUTE: Record<UserRole, string> = {
  admin: '/dashboard/admin/access-requests',
  analyst: '/dashboard/analyst',
  reviewer: '/report',
  user: '/dashboard',
  guest: '/',
};

/**
 * Pick a primary role from a list of roles according to priority.
 */
export function pickPrimaryRole(roles: string[] | undefined): UserRole | null {
  // Debug: print incoming roles so we can trace RBAC issues in running app
  try { console.debug('[rbac] pickPrimaryRole called with roles:', roles, 'ROLE_PRIORITY:', ROLE_PRIORITY); } catch (e) {}
  if (!roles || roles.length === 0) {return null;}
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) {
      try { console.debug('[rbac] pickPrimaryRole ->', r); } catch (e) {}
      return r;
    }
  }
  // If none of the known roles match, return the first declared role.
  try { console.debug('[rbac] pickPrimaryRole -> fallback', roles[0]); } catch (e) {}
  return (roles[0] as UserRole) || null;
}

/**
 * Given an array of roles, return the default landing route.
 * Falls back to `/dashboard` for authenticated users and `/` for guests.
 */
export function defaultRouteForRoles(roles: string[] | undefined): string {
  const primary = pickPrimaryRole(roles);
  if (!primary) {return '/';}
  return ROLE_DEFAULT_ROUTE[primary] ?? '/dashboard';
}

/**
 * Check whether the user's roles include any of the required roles.
 */
export function hasAnyRole(userRoles: string[] | undefined, required: string | string[]): boolean {
  if (!userRoles || userRoles.length === 0) {return false;}
  const requiredArr = Array.isArray(required) ? required : [required];
  return requiredArr.some((r) => userRoles.includes(r));
}

export default {
  pickPrimaryRole,
  defaultRouteForRoles,
  hasAnyRole,
};
