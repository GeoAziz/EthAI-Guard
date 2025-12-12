import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';

import AdminBillingPage from '@/app/dashboard/admin/billing/page';

vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => React.createElement(React.Fragment, null, children) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/ui/chart-placeholder', () => ({ default: ({ title }: any) => React.createElement('div', null, title) }));

const mockGet = vi.fn();
vi.mock('@/lib/api');

beforeEach(async () => {
  mockGet.mockReset();
  const apiMod = await import('@/lib/api');
  apiMod.default.get = mockGet;
});

test('loads billing usage and invoices', async () => {
  mockGet.mockImplementation((path: string) => {
    if (path === '/v1/billing/usage') {return Promise.resolve({ data: { monthly: [{ x: 'Jan', y: 100 }] } });}
    if (path === '/v1/billing/invoices') {return Promise.resolve({ data: [{ id: 'inv-1', date: '2025-11-01', amount_cents: 12345, description: 'November invoice' }] });}
    return Promise.resolve({ data: {} });
  });

  render(<AdminBillingPage /> as any);

  // ChartPlaceholder mock and heading both contain 'Monthly spend' — assert at least one exists
  await waitFor(() => expect(screen.getAllByText(/Monthly spend/i).length).toBeGreaterThan(0));
  await waitFor(() => expect(screen.getByText(/November invoice/i)).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText(/123.45/)).toBeInTheDocument());
});
