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

describe('UserRunsPage pagination', () => {
  beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); toast.mockReset(); });

  it('navigates next and previous pages and applies status filter', async () => {
    // page 1 response
    mockGet.mockResolvedValueOnce({ data: { items: [{ runId: 'r1' }], total: 25 } });
    render(<UserRunsPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/analysis/history?page=1&limit=10'));

    // prepare page 2 response and click Next
    mockGet.mockResolvedValueOnce({ data: { items: [{ runId: 'r11' }], total: 25 } });
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/analysis/history?page=2&limit=10'));

    // prepare page 1 response and click Previous
    mockGet.mockResolvedValueOnce({ data: { items: [{ runId: 'r1' }], total: 25 } });
    fireEvent.click(screen.getByText('Previous'));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/analysis/history?page=1&limit=10'));

    // test status filter resets to page 1 and includes status param
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });
  const statusSelect = screen.getByLabelText(/status/i);
  fireEvent.change(statusSelect, { target: { value: 'queued' } });
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/analysis/history?page=1&limit=10&status=queued'));
  });
});
