import { describe, it, expect } from 'vitest';
import { pickPrimaryRole, defaultRouteForRoles, hasAnyRole } from '@/lib/rbac';

describe('rbac utilities', () => {
  it('picks the highest priority role', () => {
    expect(pickPrimaryRole(['user', 'analyst'])).toBe('analyst');
    expect(pickPrimaryRole(['reviewer', 'user'])).toBe('reviewer');
    expect(pickPrimaryRole(['customRole'])).toBe('customRole');
    expect(pickPrimaryRole([])).toBeNull();
  });

  it('returns sensible default routes', () => {
    expect(defaultRouteForRoles(['admin'])).toBe('/dashboard/admin/access-requests');
    expect(defaultRouteForRoles(['analyst'])).toBe('/dashboard/analyst');
    expect(defaultRouteForRoles(undefined)).toBe('/');
  });

  it('checks hasAnyRole correctly', () => {
    expect(hasAnyRole(['a','b'], 'a')).toBe(true);
    expect(hasAnyRole(['a','b'], ['c','d'])).toBe(false);
  });
});
