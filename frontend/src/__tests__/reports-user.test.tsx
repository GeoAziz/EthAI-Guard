import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/layout/breadcrumbs', () => ({ default: () => <div data-testid="breadcrumbs" /> }));
vi.mock('@/components/layout/page-header', () => ({ default: ({ title }: any) => <h1>{title}</h1> }));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const mockGet = vi.fn();
vi.mock('@/lib/api', () => ({ default: { get: (...args: any[]) => mockGet(...args) } }));

import UserReportsPage from '@/app/dashboard/user/reports/page';

describe('UserReportsPage', () => {
  beforeEach(() => { mockGet.mockReset(); toast.mockReset(); });

  it('renders empty state', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
  render(<UserReportsPage />);
  await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/reports?userId=me&page=1&limit=10'));
    expect(screen.getByText('No reports available')).toBeInTheDocument();
  });

  it('renders rows and triggers export', async () => {
    const reports = [{ id: 'rep-1', modelId: 'm1', datasetId: 'd1', status: 'ready', createdAt: '2025-01-01T00:00:00Z' }];
    mockGet.mockResolvedValueOnce({ data: reports });
  render(<UserReportsPage />);
  await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/reports?userId=me&page=1&limit=10'));
    // Use findByText to allow the component to finish rendering after async fetch
    expect(await screen.findByText('rep-1')).toBeInTheDocument();
    // mock export call
    mockGet.mockResolvedValueOnce({ data: new Blob([JSON.stringify({ ok: true })], { type: 'application/json' }) });
    fireEvent.click(screen.getByText('Export'));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/reports/rep-1/export', { responseType: 'blob' }));
  });

  it('shows toast on api error', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
  render(<UserReportsPage />);
  await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/reports?userId=me&page=1&limit=10'));
  await waitFor(() => expect(toast).toHaveBeenCalled());
  });
});
