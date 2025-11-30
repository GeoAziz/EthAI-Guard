import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock RoleProtected to render children
vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/layout/breadcrumbs', () => ({ default: () => <div data-testid="breadcrumbs" /> }));
vi.mock('@/components/layout/page-header', () => ({ default: ({ title }: any) => <h1>{title}</h1> }));

const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

const mockGet = vi.fn();
vi.mock('@/lib/api', () => ({ default: { get: (...args: any[]) => mockGet(...args) } }));

import ReviewerReportsPage from '@/app/dashboard/reviewer/reports/page';

describe('ReviewerReportsPage', () => {
  beforeEach(() => mockGet.mockReset());

  it('renders empty state', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    render(<ReviewerReportsPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByText('No reports assigned')).toBeInTheDocument();
  });

  it('renders rows', async () => {
    const reports = [
      { id: 'rep-1', modelId: 'm1', datasetId: 'd1', status: 'pending', createdAt: '2025-01-01T00:00:00Z' },
    ];
    mockGet.mockResolvedValueOnce({ data: reports });
    render(<ReviewerReportsPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByText('rep-1')).toBeInTheDocument();
    expect(screen.getByText('m1')).toBeInTheDocument();
    expect(screen.getByText('d1')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('shows toast on api error', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    render(<ReviewerReportsPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
  });
});
