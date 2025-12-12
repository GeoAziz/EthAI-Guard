/// <reference types="vitest" />
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock RoleProtected to just render children
vi.mock('@/components/auth/RoleProtected', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

// Mock Breadcrumbs and PageHeader
vi.mock('@/components/layout/breadcrumbs', () => ({ default: () => <div data-testid="breadcrumbs" /> }));
vi.mock('@/components/layout/page-header', () => ({ default: ({ title }: any) => <h1>{title}</h1> }));

// Mock use-toast
const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

// Mock api
const mockGet = vi.fn();
vi.mock('@/lib/api', () => ({ default: { get: (...args: any[]) => mockGet(...args) } }));

import AnalysisHistoryPage from '@/app/dashboard/analyst/history/page';

describe('AnalysisHistoryPage', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('renders empty state when no jobs', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    render(<AnalysisHistoryPage />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
    expect(screen.getByText('No runs found')).toBeInTheDocument();
  });

  it('renders a row for jobs and view report link', async () => {
    const jobs = [
      { runId: 'r-1', modelId: 'm1', datasetId: 'd1', runType: 'baseline', status: 'completed', createdAt: '2025-01-01T00:00:00Z', completedAt: '2025-01-01T00:01:00Z', reportId: 'rep-1' },
      { runId: 'r-2', modelId: 'm2', datasetId: 'd2', runType: 'drift', status: 'running', createdAt: '2025-01-02T00:00:00Z' },
    ];
    mockGet.mockResolvedValueOnce({ data: jobs });
    render(<AnalysisHistoryPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
    expect(screen.getByText('r-1')).toBeInTheDocument();
    expect(screen.getByText('m1')).toBeInTheDocument();
    expect(screen.getByText('d1')).toBeInTheDocument();
    expect(screen.getByText('baseline')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('View report')).toBeInTheDocument();
    expect(screen.getByText('r-2')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
  });

  it('refreshes when analysis:runCompleted event fires', async () => {
    type Run = {
      runId: string;
      modelId: string;
      datasetId: string;
      runType: string;
      status: string;
      createdAt: string;
      completedAt?: string;
      reportId?: string;
    };
    const initial: Run[] = [];
    const refreshed: Run[] = [
      { runId: 'r-3', modelId: 'm3', datasetId: 'd3', runType: 'baseline', status: 'completed', createdAt: '2025-01-03T00:00:00Z', completedAt: '2025-01-03T00:01:00Z', reportId: 'rep-3' },
    ];
    mockGet.mockResolvedValueOnce({ data: initial });
    render(<AnalysisHistoryPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
    expect(screen.getByText('No runs found')).toBeInTheDocument();

    mockGet.mockResolvedValueOnce({ data: refreshed });
    // dispatch event
    window.dispatchEvent(new CustomEvent('analysis:runCompleted', { detail: { runId: 'r-3', reportId: 'rep-3' } }));

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('r-3')).toBeInTheDocument());
    expect(screen.getByText('m3')).toBeInTheDocument();
  });

  it('shows toast on api error', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    render(<AnalysisHistoryPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
  });
});
