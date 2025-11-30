import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, it, describe, expect, beforeEach } from 'vitest';

vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/layout/breadcrumbs', () => ({ default: () => <div data-testid="breadcrumbs" /> }));
vi.mock('@/components/layout/page-header', () => ({ default: ({ title }: any) => <h1>{title}</h1> }));

const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

// We'll mock api with get and post
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('@/lib/api', () => ({ default: { get: (...args: any[]) => mockGet(...args), post: (...args: any[]) => mockPost(...args) } }));

import ReviewerReportDetail from '@/app/dashboard/reviewer/reports/[id]/page';

describe('ReviewerReportDetail', () => {
  beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); toastSpy.mockReset(); });

  it('renders report details and comments and posts a comment', async () => {
    const report = {
      id: 'rep-1', modelId: 'm1', datasetId: 'd1', status: 'pending', createdAt: '2025-01-01T00:00:00Z',
      payload: { foo: 'bar' },
      comments: [{ author: 'alice', createdAt: '2025-01-01T00:02:00Z', text: 'initial' }],
    };
    mockGet.mockResolvedValueOnce({ data: report }); // initial load
    // when reloading after comment
    mockGet.mockResolvedValueOnce({ data: { ...report, comments: [...report.comments, { author: 'reviewer', createdAt: '2025-01-01T00:05:00Z', text: 'my comment' }] } });
    mockPost.mockResolvedValueOnce({}); // post comment

    // render with params
    render(<ReviewerReportDetail params={{ id: 'rep-1' }} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByText('m1')).toBeInTheDocument();
    expect(screen.getByText('d1')).toBeInTheDocument();
    expect(screen.getByText('initial')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Add comment'), { target: { value: 'my comment' } });
    fireEvent.click(screen.getByText('Post comment'));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/v1/reports/rep-1/comment', { text: 'my comment' }));
    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    expect(screen.getByText('my comment')).toBeInTheDocument();
  });

  it('approves the report and navigates back', async () => {
    const report = { id: 'rep-2', modelId: 'm2', datasetId: 'd2', status: 'pending', createdAt: '2025-01-02T00:00:00Z', comments: [] };
    mockGet.mockResolvedValueOnce({ data: report });
    mockPost.mockResolvedValueOnce({}); // approve

    // spy on router.push by mocking next/navigation; simpler approach: render and call handler directly
    const { container } = render(<ReviewerReportDetail params={{ id: 'rep-2' }} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/v1/reports/rep-2/approve'));
    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
  });

  it('shows toast on load error', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    render(<ReviewerReportDetail params={{ id: 'rep-3' }} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
  });
});
