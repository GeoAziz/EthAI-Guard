import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';

import AdminModelsPage from '@/app/dashboard/admin/models/page';

vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => React.createElement(React.Fragment, null, children) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/ui/chart-placeholder', () => ({ default: ({ title }: any) => React.createElement('div', null, title) }));

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('@/lib/api');

beforeEach(async () => {
  mockGet.mockReset();
  mockPost.mockReset();
  const apiMod = await import('@/lib/api');
  apiMod.default.get = mockGet;
  apiMod.default.post = mockPost;
});

test('loads models and promotes/retrains', async () => {
  // return list for initial load
  mockGet.mockResolvedValueOnce({ data: [{ id: 'm1', name: 'loan-v3', latest_version: 'v3.2', status: 'Staging' }] });
  // also return the same list when the page refreshes after promote
  mockGet.mockResolvedValueOnce({ data: [{ id: 'm1', name: 'loan-v3', latest_version: 'v3.2', status: 'Staging' }] });
  mockPost.mockResolvedValue({});

  render(<AdminModelsPage /> as any);

  // wait for model row
  const name = await screen.findByText(/loan-v3/i);
  expect(name).toBeTruthy();

  const promoteBtn = screen.getByRole('button', { name: /Promote/i });
  fireEvent.click(promoteBtn);

  await waitFor(() => {
    expect(mockPost).toHaveBeenCalledWith('/v1/models/m1/promote');
  });

  const retrainBtn = screen.getByRole('button', { name: /Retrain/i });
  fireEvent.click(retrainBtn);

  await waitFor(() => {
    expect(mockPost).toHaveBeenCalledWith('/v1/models/m1/retrain');
  });
});
