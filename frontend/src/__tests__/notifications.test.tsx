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

import NotificationsPage from '@/app/dashboard/user/notifications/page';

describe('NotificationsPage', () => {
  beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); toast.mockReset(); });

  it('renders empty state', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    render(<NotificationsPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('renders notifications and marks read', async () => {
    const notes = [{ id: 'n1', title: 'T1', body: 'B1', createdAt: '2025-01-01T00:00:00Z', read: false }];
    mockGet.mockResolvedValueOnce({ data: notes });
    mockPost.mockResolvedValueOnce({});
    render(<NotificationsPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByText('T1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Mark read'));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/v1/notifications/n1/mark-read'));
    expect(screen.getByText('T1')).toBeInTheDocument();
  });

  it('adds notification on analysis:runCompleted event', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    render(<NotificationsPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    // dispatch event
    window.dispatchEvent(new CustomEvent('analysis:runCompleted', { detail: { runId: 'r-1', reportId: 'rep-1' } }));
    await waitFor(() => expect(screen.getByText('Run completed')).toBeInTheDocument());
    expect(toast).toHaveBeenCalled();
  });
});
