import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';

import AdminReportsPage from '@/app/dashboard/admin/reports/page';

vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => React.createElement(React.Fragment, null, children) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const mockGet = vi.fn();
vi.mock('@/lib/api');

beforeEach(async () => {
  mockGet.mockReset();
  const apiMod = await import('@/lib/api');
  apiMod.default.get = mockGet;
});

test('loads reports and triggers export download', async () => {
  mockGet.mockImplementation((path: string) => {
    if (path === '/v1/reports') {return Promise.resolve({ data: [{ id: 'r1', name: 'Monthly usage', description: 'CSV of monthly usage', filename: 'monthly.csv' }] });}
    if (path === '/v1/reports/r1/export') {return Promise.resolve({ data: new Blob(['a,b\n1,2'], { type: 'text/csv' }) });}
    return Promise.resolve({ data: {} });
  });

  const origCreate = (URL as any).createObjectURL;
  const origRevoke = (URL as any).revokeObjectURL;
  const createMock = vi.fn(() => 'blob:mock');
  const revokeMock = vi.fn();
  (URL as any).createObjectURL = createMock;
  (URL as any).revokeObjectURL = revokeMock;

  render(<AdminReportsPage /> as any);

  // ensure the export button is present for the report
  const btn = await screen.findByRole('button', { name: /Export/i });
  fireEvent.click(btn);

  await waitFor(() => {
    expect(mockGet).toHaveBeenCalledWith('/v1/reports/r1/export', expect.any(Object));
    expect(createMock).toHaveBeenCalled();
    expect(revokeMock).toHaveBeenCalled();
  });

  if (origCreate) {(URL as any).createObjectURL = origCreate;} else {delete (URL as any).createObjectURL;}
  if (origRevoke) {(URL as any).revokeObjectURL = origRevoke;} else {delete (URL as any).revokeObjectURL;}
});
