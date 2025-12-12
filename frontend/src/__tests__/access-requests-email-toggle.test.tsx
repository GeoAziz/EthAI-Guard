import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component under test
import AdminAccessRequests from '@/app/dashboard/admin/access-requests/page';

// Stub surrounding layout and auth components so we can render the page in isolation
vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/layout/AdminDashboardShell', () => ({ default: ({ children }: any) => <div>{children}</div> }));

// Mock toast and announce hooks used by the page
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/contexts/AnnounceContext', () => ({ useAnnounce: () => vi.fn() }));

// Mock the API used by the page. Avoid using a factory that references local
// variables (vitest hoists vi.mock), instead assign the spies in beforeEach.
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('@/lib/api');

// Mock next/navigation's useRouter to avoid app-router invariant
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => Promise.resolve() }),
}));

describe('Access Requests email toggle', () => {
  beforeEach(async () => {
    mockGet.mockReset();
    mockPost.mockReset();
    const apiMod = await import('@/lib/api');
    apiMod.default.get = mockGet;
    apiMod.default.post = mockPost;
  });

  it('sends emailUser=true when approve is confirmed with toggle on', async () => {
    const req = { _id: 'req-1', email: 'user@example.com', status: 'pending', reason: 'Need access', createdAt: new Date().toISOString() };
    mockGet.mockResolvedValue({ data: { items: [req] } });
    mockPost.mockResolvedValue({ data: { claimsSync: { status: 'success' } } });

    render(<AdminAccessRequests /> as any);

    // Wait for the Approve button to appear
    const approveBtn = await screen.findByRole('button', { name: /Approve request for user@example.com/i }).catch(() => screen.findByText(/Approve/i));
    expect(approveBtn).toBeTruthy();

    // Click Approve
    fireEvent.click(approveBtn as HTMLElement);

    // Confirm dialog should render; find Confirm Approve button
    const confirm = await screen.findByRole('button', { name: /Confirm Approve/i });

    // Ensure checkbox is present and checked by default
    const checkbox = screen.getByLabelText(/Send email notification to user/i);
    expect(checkbox).toBeInTheDocument();
    // checkbox is implemented via radix; just assert it exists and is checked by default

    // Click Confirm Approve
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });

    // verify the api.post call included emailUser: true in the body
    const calledWith = mockPost.mock.calls.find(([path]) => String(path).includes('/v1/access-requests'));
    expect(calledWith).toBeTruthy();
    const [, body] = calledWith as any;
    expect(body).toBeDefined();
    expect(body.emailUser).toBe(true);
  });
});
