import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component under test
import AdminAccessRequests from '@/app/dashboard/admin/access-requests/page';

// Mock UI shell and auth guard to simplify rendering
vi.mock('@/components/auth/RoleProtected', () => ({
  default: ({ children }: any) => React.createElement(React.Fragment, null, children),
}));
vi.mock('@/components/layout/AdminDashboardShell', () => ({
  __esModule: true,
  default: ({ children }: any) => React.createElement('div', null, children),
}));

// Mock ancillary hooks/components used by the page
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: () => {} }),
}));
vi.mock('@/contexts/AnnounceContext', () => ({
  useAnnounce: () => (() => {}),
}));

// Provide a simple api mock that we can introspect. We avoid using a vi.mock factory
// that references local variables (vitest hoists vi.mock). Instead, mock the
// module and assign the spies in beforeEach.
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('@/lib/api');

// Mock next/navigation's useRouter to avoid the app-router invariant in tests
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => Promise.resolve() }),
}));

const sampleRequest = {
  _id: 'req-1',
  id: 'req-1',
  email: 'alice@example.com',
  status: 'pending',
  reason: 'Need access',
  createdAt: new Date().toISOString(),
};

beforeEach(async () => {
  mockGet.mockReset();
  mockPost.mockReset();
  // assign spies to the mocked api module
  const apiMod = await import('@/lib/api');
  apiMod.default.get = mockGet;
  apiMod.default.post = mockPost;
});

describe('Access requests page', () => {
  it('sends emailUser=true when approve is confirmed with default checkbox', async () => {
    mockGet.mockResolvedValue({ data: { items: [sampleRequest] } });
    mockPost.mockResolvedValue({ data: { claimsSync: { status: 'skipped', message: 'no-firebase' } } });

    render(<AdminAccessRequests /> as any);

    // wait for request to be rendered
    await waitFor(() => expect(screen.getByText(/alice@example.com/i)).toBeInTheDocument());

    const approveBtn = screen.getByRole('button', { name: /Approve request for alice@example.com|Approve/i });
    fireEvent.click(approveBtn);

    // dialog should appear with checkbox and confirm
    await waitFor(() => expect(screen.getByText(/Send email notification to user/i)).toBeInTheDocument());

    const confirmBtn = screen.getByRole('button', { name: /Confirm Approve/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
      const [path, body] = mockPost.mock.calls[0];
      expect(path).toContain(`/v1/access-requests/${sampleRequest._id}/approve`);
      expect(body).toEqual(expect.objectContaining({ emailUser: true }));
    });
  });

  it('sends emailUser=false when checkbox is unchecked before confirming', async () => {
    mockGet.mockResolvedValue({ data: { items: [sampleRequest] } });
    mockPost.mockResolvedValue({ data: {} });

    render(<AdminAccessRequests /> as any);

    await waitFor(() => expect(screen.getByText(/alice@example.com/i)).toBeInTheDocument());

    const approveBtn = screen.getByRole('button', { name: /Approve request for alice@example.com|Approve/i });
    fireEvent.click(approveBtn);

    await waitFor(() => expect(screen.getByText(/Send email notification to user/i)).toBeInTheDocument());

    const checkbox = screen.getByRole('checkbox', { name: /Send email notification to user/i });
    // uncheck
    fireEvent.click(checkbox);

    const confirmBtn = screen.getByRole('button', { name: /Confirm Approve/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
      const [path, body] = mockPost.mock.calls[0];
      expect(path).toContain(`/v1/access-requests/${sampleRequest._id}/approve`);
      expect(body).toEqual(expect.objectContaining({ emailUser: false }));
    });
  });
});
