import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';

import AdminAuditPage from '@/app/dashboard/admin/audit/page';

vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => React.createElement(React.Fragment, null, children) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const mockGet = vi.fn();
vi.mock('@/lib/api');

beforeEach(async () => {
  mockGet.mockReset();
  const apiMod = await import('@/lib/api');
  apiMod.default.get = mockGet;
});

test('loads audit logs and triggers export', async () => {
  mockGet.mockImplementation((path: string, opts?: any) => {
    if (path === '/v1/audit-logs') {return Promise.resolve({ data: { items: [{ id: 'a1', timestamp: '2025-11-24T09:01:00Z', actor: 'alice@example.com', event: 'Report requested', details: 'explainability' }] } });}
    if (path === '/v1/audit-logs/export') {return Promise.resolve({ data: new Blob([JSON.stringify([{ id: 'a1' }])], { type: 'application/json' }) });}
    return Promise.resolve({ data: {} });
  });

  // stub URL.createObjectURL and revoke for jsdom (may be undefined in some jsdom versions)
  const origCreate = (URL as any).createObjectURL;
  const origRevoke = (URL as any).revokeObjectURL;
  const createMock = vi.fn(() => 'blob:mock');
  const revokeMock = vi.fn();
  (URL as any).createObjectURL = createMock;
  (URL as any).revokeObjectURL = revokeMock;

  render(<AdminAuditPage /> as any);

  // ensure the loaded log is shown
  await waitFor(() => expect(screen.getByText(/alice@example.com/i)).toBeInTheDocument());

  // click export
  const exportBtn = screen.getByRole('button', { name: /Export/i });
  fireEvent.click(exportBtn);

  await waitFor(() => {
    expect(mockGet).toHaveBeenCalledWith('/v1/audit-logs/export', expect.any(Object));
    expect(createMock).toHaveBeenCalled();
    expect(revokeMock).toHaveBeenCalled();
  });

  // restore originals
  if (origCreate) {(URL as any).createObjectURL = origCreate;} else {delete (URL as any).createObjectURL;}
  if (origRevoke) {(URL as any).revokeObjectURL = origRevoke;} else {delete (URL as any).revokeObjectURL;}
});
