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

describe('UserReportsPage pagination', () => {
  beforeEach(() => { mockGet.mockReset(); toast.mockReset(); });

  it('navigates next and previous pages', async () => {
    // page 1 response
    mockGet.mockResolvedValueOnce({ data: { items: [{ id: 'rep1' }], total: 15 } });
    render(<UserReportsPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/reports?userId=me&page=1&limit=10'));

    // page 2
    mockGet.mockResolvedValueOnce({ data: { items: [{ id: 'rep11' }], total: 15 } });
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/reports?userId=me&page=2&limit=10'));

    // back to page 1
    mockGet.mockResolvedValueOnce({ data: { items: [{ id: 'rep1' }], total: 15 } });
    fireEvent.click(screen.getByText('Previous'));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/reports?userId=me&page=1&limit=10'));
  });
});
