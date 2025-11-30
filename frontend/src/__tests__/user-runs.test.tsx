/// <reference types="vitest" />
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/layout/breadcrumbs', () => ({ default: () => <div data-testid="breadcrumbs" /> }));
vi.mock('@/components/layout/page-header', () => ({ default: ({ title }: any) => <h1>{title}</h1> }));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('@/lib/api', () => ({ default: { get: (...args: any[]) => mockGet(...args), post: (...args: any[]) => mockPost(...args) } }));

import UserRunsPage from '@/app/dashboard/user/runs/page';

describe('UserRunsPage', () => {
  beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); toast.mockReset(); });

  it('renders empty state', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
  render(<UserRunsPage />);
  await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/analysis/history?page=1&limit=10'));
    expect(screen.getByText('No runs found')).toBeInTheDocument();
  });

  it('submits a new run and optimistic adds', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    mockPost.mockResolvedValueOnce({ data: { runId: 'r-new', status: 'queued', modelId: 'm1', datasetId: 'd1', runType: 'baseline', createdAt: '2025-01-01T00:00:00Z' } });
  render(<UserRunsPage />);
  await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/analysis/history?page=1&limit=10'));

    fireEvent.click(screen.getByText('Request analysis'));
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'm1' } });
    fireEvent.change(screen.getByLabelText('Dataset'), { target: { value: 'd1' } });
    fireEvent.click(screen.getByText('Start'));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/v1/analysis', { modelId: 'm1', datasetId: 'd1', runType: 'baseline' }));
    await waitFor(() => expect(screen.getByText('r-new')).toBeInTheDocument());
  });

  it('cancels a running run', async () => {
    const runs = [{ runId: 'r-1', modelId: 'm1', datasetId: 'd1', runType: 'baseline', status: 'running', createdAt: '2025-01-01T00:00:00Z' }];
    mockGet.mockResolvedValueOnce({ data: runs });
    mockPost.mockResolvedValueOnce({}); // cancel
  render(<UserRunsPage />);
  await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/analysis/history?page=1&limit=10'));
    expect(screen.getByText('r-1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/v1/analysis/r-1/cancel'));
    await waitFor(() => expect(screen.getByText('cancelled')).toBeInTheDocument());
  });
});
