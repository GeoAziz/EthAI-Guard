import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, expect, beforeEach, describe, test } from 'vitest';

vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => children }));
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/components/layout/breadcrumbs', () => ({ default: () => null }));

vi.mock('@/lib/api');

describe('Run Analysis flow', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  test('starts run, polls status and shows completed link', async () => {
    // set fast poll interval for test
    process.env.NEXT_PUBLIC_POLL_INTERVAL_MS = '50';
    const apiMod = await import('@/lib/api');
    const { default: RunAnalysisPage } = await import('@/app/dashboard/analyst/run-analysis/page');
    // POST response returns runId
    apiMod.default.post = vi.fn().mockResolvedValueOnce({ data: { runId: 'run-123' } });

    // Polling: first returns running, then completed with reportId
    const pollResponses = [
      { data: { status: 'running' } },
      { data: { status: 'completed', reportId: 'r-999' } },
    ];
    apiMod.default.get = vi.fn().mockImplementation(() => Promise.resolve(pollResponses.shift()));

    render(<RunAnalysisPage />);

  // fill form (use labels to avoid ambiguity when multiple inputs share placeholders)
  fireEvent.change(screen.getByLabelText('Model ID'), { target: { value: 'm1' } });
  fireEvent.change(screen.getByLabelText('Dataset ID'), { target: { value: 'd1' } });

    const startBtn = screen.getByRole('button', { name: /Start run/i });
    fireEvent.click(startBtn);

    // POST called
    await waitFor(() => expect(apiMod.default.post).toHaveBeenCalledWith('/v1/analysis', { modelId: 'm1', datasetId: 'd1', runType: 'full' }));

    // Run started -> status running
    expect(await screen.findByText(/Status: running/i)).toBeInTheDocument();

    // wait for first poll to be called (within a short timeout)
    await waitFor(() => expect(apiMod.default.get).toHaveBeenCalledWith('/v1/analysis/run-123/status'), { timeout: 2000 });

    // wait for completion to be reflected in UI
    await waitFor(() => expect(screen.getByText(/View report/)).toBeInTheDocument(), { timeout: 2000 });
  }, 15000);

  test('handles run failure during polling', async () => {
    process.env.NEXT_PUBLIC_POLL_INTERVAL_MS = '50';
    const apiMod = await import('@/lib/api');
    const { default: RunAnalysisPage } = await import('@/app/dashboard/analyst/run-analysis/page');
    apiMod.default.post = vi.fn().mockResolvedValueOnce({ data: { runId: 'run-err' } });
    apiMod.default.get = vi.fn().mockResolvedValueOnce({ data: { status: 'failed' } });

  render(<RunAnalysisPage />);
  fireEvent.change(screen.getByLabelText('Model ID'), { target: { value: 'mX' } });
  fireEvent.change(screen.getByLabelText('Dataset ID'), { target: { value: 'dY' } });
    fireEvent.click(screen.getByRole('button', { name: /Start run/i }));

    await waitFor(() => expect(apiMod.default.post).toHaveBeenCalled());

    // wait for the poll to run and detect failure
    await waitFor(() => expect(apiMod.default.get).toHaveBeenCalledWith('/v1/analysis/run-err/status'), { timeout: 2000 });

    // toast for run failed should be called
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Run failed' })), { timeout: 2000 });
  }, 15000);
});
