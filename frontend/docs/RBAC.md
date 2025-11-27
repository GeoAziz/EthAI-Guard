# RBAC (Role-Based Access Control)

This document describes the roles implemented in the frontend and how RBAC is wired.

## Canonical roles

- `admin` — full access to administrative pages (Access Requests, user promotions, system settings).
- `analyst` — access to analysis tools and monitoring (Decision Analysis, Model Monitor).
- `reviewer` — read-only access to reports and audit pages.
- `user` — standard authenticated user (dashboard, demo pages).
- `guest` — unauthenticated / public visitor.

Note: The backend is the authoritative source of roles. The frontend reads roles from Firebase ID token claims (`roles` array or `role` string) or via the backend API `/v1/users/me`.

## How it works (implementation)

- `src/lib/rbac.ts` — small helper with `pickPrimaryRole`, `defaultRouteForRoles`, and `hasAnyRole`.
- `src/components/auth/RoleProtected.tsx` — client wrapper to guard content by role(s). Use it like:

```
<RoleProtected required="admin">
  <AdminOnlyContent />
</RoleProtected>
```

- `AuthContext` already parses token claims into `roles: string[]` and exposes `hasRole(role)` and `refreshRoles()`.

## Adding a new role

1. Add role to `ROLE_PRIORITY` in `src/lib/rbac.ts` (insert in appropriate priority order).
2. Add a default route in `ROLE_DEFAULT_ROUTE` mapping.
3. Update UI: show/hide menu items or wrap pages with `RoleProtected` where needed.
4. Ensure backend issues the role claim (via ID token custom claims or `/v1/users/me`).

## Next steps / server-side guards

This initial implementation protects UI client-side and controls navigation. For stronger security, implement server-side guards or Next.js middleware that validates the user token and role before rendering server components.
