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

import ReviewerReportsPage from '@/app/dashboard/reviewer/reports/page';

describe('ReviewerReportsPage pagination', () => {
  beforeEach(() => { mockGet.mockReset(); toast.mockReset(); });

  it('navigates next and previous pages', async () => {
    // page 1 response
    mockGet.mockResolvedValueOnce({ data: { items: [{ id: 'r1' }], total: 25 } });
    render(<ReviewerReportsPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/reports?page=1&limit=10&role=reviewer'));

    // prepare page 2 response and click Next
    mockGet.mockResolvedValueOnce({ data: { items: [{ id: 'r11' }], total: 25 } });
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/reports?page=2&limit=10&role=reviewer'));

    // prepare page 1 response and click Previous
    mockGet.mockResolvedValueOnce({ data: { items: [{ id: 'r1' }], total: 25 } });
    fireEvent.click(screen.getByText('Previous'));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/reports?page=1&limit=10&role=reviewer'));
  });
});
