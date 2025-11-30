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

import UserReportDetail from '@/app/dashboard/user/reports/[id]/page';

describe('UserReportDetail', () => {
  beforeEach(() => { mockGet.mockReset(); toast.mockReset(); });

  it('loads and exports report', async () => {
    const report = { id: 'rep-1', modelId: 'm1', datasetId: 'd1', status: 'ready', createdAt: '2025-01-01T00:00:00Z', payload: { foo: 'bar' } };
    mockGet.mockResolvedValueOnce({ data: report });
    render(<UserReportDetail params={{ id: 'rep-1' }} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByText('m1')).toBeInTheDocument();
    // mock export
    mockGet.mockResolvedValueOnce({ data: new Blob([JSON.stringify({ ok: true })], { type: 'application/json' }) });
    fireEvent.click(screen.getByText('Export'));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/reports/rep-1/export', { responseType: 'blob' }));
  });

  it('shows toast on load error', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    render(<UserReportDetail params={{ id: 'rep-x' }} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() => expect(toast).toHaveBeenCalled());
  });
});
