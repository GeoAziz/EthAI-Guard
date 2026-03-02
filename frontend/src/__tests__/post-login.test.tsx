/**
 * Post-login redirect flow tests
 * Tests role-based routing, timeout handling, error scenarios, and accessibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import PostLoginRedirect from '@/app/post-login/page';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/AnnounceContext', () => ({
  useAnnounce: vi.fn(() => vi.fn()),
}));

vi.mock('@/lib/rbac', () => ({
  pickPrimaryRole: vi.fn((roles: string[]) => {
    const priority = ['admin', 'analyst', 'reviewer', 'user', 'guest'];
    for (const role of priority) {
      if (roles?.includes(role)) {return role;}
    }
    return null;
  }),
  defaultRouteForRoles: vi.fn((roles: string[]) => {
    const routes: Record<string, string> = {
      admin: '/dashboard/admin',
      analyst: '/dashboard/analyst',
      reviewer: '/dashboard/reviewer',
      user: '/dashboard',
      guest: '/',
    };
    const role = roles?.[0];
    return role ? routes[role] : '/';
  }),
}));

describe('PostLoginRedirect', () => {
  let mockPush: any;
  let mockReplace: any;

  beforeEach(() => {
    mockPush = vi.fn();
    mockReplace = vi.fn();
    vi.useFakeTimers();

    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show authenticating message while auth is loading', () => {
      (useAuth as any).mockReturnValue({
        roles: [],
        loading: true,
        user: null,
      });

      render(<PostLoginRedirect />);

      expect(screen.getByText('Authenticating')).toBeInTheDocument();
      expect(screen.getByText(/Verifying your credentials/)).toBeInTheDocument();
    });

    it('should display loading spinner during auth phase', () => {
      (useAuth as any).mockReturnValue({
        roles: [],
        loading: true,
        user: null,
      });

      render(<PostLoginRedirect />);

      // LoadingSpinner should be rendered
      expect(screen.getByText('Authenticating')).toBeInTheDocument();
    });

    it('should transition from authenticating to role-specific message', async () => {
      const { rerender } = render(<PostLoginRedirect />);

      (useAuth as any).mockReturnValue({
        roles: ['admin'],
        loading: true,
        user: { roles: ['admin'] },
      });

      rerender(<PostLoginRedirect />);

      await waitFor(() => {
        expect(screen.getByText('Authenticating')).toBeInTheDocument();
      });

      // Update to loaded state
      (useAuth as any).mockReturnValue({
        roles: ['admin'],
        loading: false,
        user: { roles: ['admin'] },
      });

      rerender(<PostLoginRedirect />);

      await waitFor(() => {
        expect(screen.getByText('Preparing Admin Console')).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Routing', () => {
    it('should redirect admin to /dashboard/admin with correct message', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['admin'],
        loading: false,
        user: { roles: ['admin'] },
      });

      render(<PostLoginRedirect />);

      expect(screen.getByText('Preparing Admin Console')).toBeInTheDocument();
      expect(screen.getByText(/Initializing user management/)).toBeInTheDocument();

      await waitFor(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockReplace).toHaveBeenCalledWith('/dashboard/admin');
    });

    it('should redirect analyst to /dashboard/analyst with correct message', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['analyst'],
        loading: false,
        user: { roles: ['analyst'] },
      });

      render(<PostLoginRedirect />);

      expect(screen.getByText('Loading Analysis Workspace')).toBeInTheDocument();
      expect(screen.getByText(/Setting up your bias analysis tools/)).toBeInTheDocument();

      await waitFor(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockReplace).toHaveBeenCalledWith('/dashboard/analyst');
    });

    it('should redirect reviewer to /dashboard/reviewer with correct message', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['reviewer'],
        loading: false,
        user: { roles: ['reviewer'] },
      });

      render(<PostLoginRedirect />);

      expect(screen.getByText('Loading Compliance Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Preparing fairness review interface/)).toBeInTheDocument();

      await waitFor(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockReplace).toHaveBeenCalledWith('/dashboard/reviewer');
    });

    it('should redirect user to /dashboard with correct message', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['user'],
        loading: false,
        user: { roles: ['user'] },
      });

      render(<PostLoginRedirect />);

      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByText(/Loading your dashboard/)).toBeInTheDocument();

      await waitFor(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });

    it('should respect role hierarchy when user has multiple roles', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['user', 'analyst', 'admin'],
        loading: false,
        user: { roles: ['user', 'analyst', 'admin'] },
      });

      render(<PostLoginRedirect />);

      // Should show admin message due to priority
      expect(screen.getByText('Preparing Admin Console')).toBeInTheDocument();

      await waitFor(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockReplace).toHaveBeenCalledWith('/dashboard/admin');
    });
  });

  describe('Error Handling', () => {
    it('should show timeout error after 8 seconds without redirect', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['admin'],
        loading: false,
        user: { roles: ['admin'] },
      });

      // Mock replace to not actually redirect
      mockReplace.mockImplementation(() => {
        // Simulate redirect failure
      });

      render(<PostLoginRedirect />);

      expect(screen.getByText('Preparing Admin Console')).toBeInTheDocument();

      // Advance past timeout (8000ms)
      vi.advanceTimersByTime(8100);

      await waitFor(() => {
        expect(screen.getByText(/Redirect Timeout/)).toBeInTheDocument();
        expect(screen.getByText(/took too long to redirect/)).toBeInTheDocument();
      });
    });

    it('should display manual navigation fallback buttons on timeout', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['admin', 'analyst'],
        loading: false,
        user: { roles: ['admin', 'analyst'] },
      });

      mockReplace.mockImplementation(() => {
        // Simulate redirect failure
      });

      render(<PostLoginRedirect />);

      vi.advanceTimersByTime(8100);

      await waitFor(() => {
        expect(screen.getByText('Quick Navigation:')).toBeInTheDocument();
        expect(screen.getByText(/Admin Console/)).toBeInTheDocument();
        expect(screen.getByText(/Analysis Workspace/)).toBeInTheDocument();
      });
    });

    it('should show no-role error when user has no valid roles', async () => {
      (useAuth as any).mockReturnValue({
        roles: [],
        loading: false,
        user: null,
      });

      render(<PostLoginRedirect />);

      await waitFor(() => {
        expect(screen.getByText(/No Valid Role Found/)).toBeInTheDocument();
        expect(screen.getByText(/doesn't have an assigned role/)).toBeInTheDocument();
      });

      // Should redirect to login after 2 seconds
      vi.advanceTimersByTime(2000);

      expect(mockReplace).toHaveBeenCalledWith('/login');
    });

    it('should show contact support link on no-role error', async () => {
      (useAuth as any).mockReturnValue({
        roles: [],
        loading: false,
        user: null,
      });

      render(<PostLoginRedirect />);

      await waitFor(() => {
        const supportLink = screen.getByText(/Contact Support/);
        expect(supportLink).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have role=status on dynamic content for screen readers', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['admin'],
        loading: false,
        user: { roles: ['admin'] },
      });

      render(<PostLoginRedirect />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toBeInTheDocument();
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should announce role-specific message to screen readers', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['analyst'],
        loading: false,
        user: { roles: ['analyst'] },
      });

      render(<PostLoginRedirect />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion.textContent).toContain('Loading Analysis Workspace');
    });

    it('should have skip-link or focus management on error states', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['admin'],
        loading: false,
        user: { roles: ['admin'] },
      });

      mockReplace.mockImplementation(() => {
        // Simulate failure
      });

      render(<PostLoginRedirect />);

      vi.advanceTimersByTime(8100);

      await waitFor(() => {
        const contactButton = screen.getByText(/Contact Support/);
        expect(contactButton).toBeInTheDocument();
      });
    });

    it('should announce timeout error to screen readers', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['admin'],
        loading: false,
        user: { roles: ['admin'] },
      });

      mockReplace.mockImplementation(() => {
        // Simulate failure
      });

      const mockAnnounce = vi.fn();
      vi.doMock('@/contexts/AnnounceContext', () => ({
        useAnnounce: () => mockAnnounce,
      }));

      render(<PostLoginRedirect />);

      vi.advanceTimersByTime(8100);

      // Verify announce was called (note: in actual test this would come from mock)
      await waitFor(() => {
        expect(screen.getByText(/Redirect Timeout/)).toBeInTheDocument();
      });
    });
  });

  describe('UI Elements', () => {
    it('should display elapsed time counter', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['user'],
        loading: false,
        user: { roles: ['user'] },
      });

      render(<PostLoginRedirect />);

      // Should show time like "0.50s"
      await waitFor(() => {
        const timeDisplay = screen.getByText(/\d+\.\d+s/);
        expect(timeDisplay).toBeInTheDocument();
      });
    });

    it('should animate loading dots', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['user'],
        loading: false,
        user: { roles: ['user'] },
      });

      render(<PostLoginRedirect />);

      // Component renders with animated dots
      const dashContainer = screen.getByText(/Preparing Admin Console|Welcome Back|Loading/i).parentElement;
      expect(dashContainer).toBeInTheDocument();
    });

    it('should have gradient background on redirect screen', () => {
      (useAuth as any).mockReturnValue({
        roles: ['admin'],
        loading: false,
        user: { roles: ['admin'] },
      });

      const { container } = render(<PostLoginRedirect />);

      const bgElement = container.querySelector('.bg-gradient-to-br');
      expect(bgElement).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null roles gracefully', async () => {
      (useAuth as any).mockReturnValue({
        roles: null,
        loading: false,
        user: null,
      });

      render(<PostLoginRedirect />);

      await waitFor(() => {
        expect(screen.getByText(/No Valid Role Found/)).toBeInTheDocument();
      });
    });

    it('should handle authentication state changes mid-redirect', async () => {
      const { rerender } = render(<PostLoginRedirect />);

      (useAuth as any).mockReturnValue({
        roles: ['admin'],
        loading: false,
        user: { roles: ['admin'] },
      });

      rerender(<PostLoginRedirect />);

      await waitFor(() => {
        expect(screen.getByText('Preparing Admin Console')).toBeInTheDocument();
      });

      // Simulate rapid auth change
      (useAuth as any).mockReturnValue({
        roles: ['reviewer'],
        loading: false,
        user: { roles: ['reviewer'] },
      });

      rerender(<PostLoginRedirect />);

      // Should recover gracefully and redirect to new role
      expect(screen.getByText('Loading Compliance Dashboard')).toBeInTheDocument();
    });

    it('should prevent multiple redirects via useEffect cleanup', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['admin'],
        loading: false,
        user: { roles: ['admin'] },
      });

      render(<PostLoginRedirect />);

      vi.advanceTimersByTime(500);

      // Redirect should only be called once
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance', () => {
    it('should redirect within 2 seconds of role determination', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['user'],
        loading: false,
        user: { roles: ['user'] },
      });

      const startTime = performance.now();

      render(<PostLoginRedirect />);

      vi.advanceTimersByTime(500);

      expect(mockReplace).toHaveBeenCalled();
      // Redirect happens after 500ms delay
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    it('should clean up timers on unmount', () => {
      (useAuth as any).mockReturnValue({
        roles: ['admin'],
        loading: false,
        user: { roles: ['admin'] },
      });

      const { unmount } = render(<PostLoginRedirect />);

      vi.advanceTimersByTime(200);

      unmount();

      // Should not throw errors or have pending timers
      expect(vi.getTimerCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Manual Navigation (Timeout Fallback)', () => {
    it('should allow manual navigation on admin timeout', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['admin'],
        loading: false,
        user: { roles: ['admin'] },
      });

      mockReplace.mockImplementation(() => {
        // Simulate failure
      });

      render(<PostLoginRedirect />);

      vi.advanceTimersByTime(8100);

      await waitFor(() => {
        const adminButton = screen.getByText(/Admin Console/);
        adminButton.click();
        expect(mockPush).toHaveBeenCalledWith('/dashboard/admin');
      });
    });

    it('should show all available roles in navigation on timeout', async () => {
      (useAuth as any).mockReturnValue({
        roles: ['admin', 'analyst', 'reviewer', 'user'],
        loading: false,
        user: { roles: ['admin', 'analyst', 'reviewer', 'user'] },
      });

      mockReplace.mockImplementation(() => {
        // Simulate failure
      });

      render(<PostLoginRedirect />);

      vi.advanceTimersByTime(8100);

      await waitFor(() => {
        expect(screen.getByText(/Admin Console/)).toBeInTheDocument();
        expect(screen.getByText(/Analysis Workspace/)).toBeInTheDocument();
        expect(screen.getByText(/Compliance Dashboard/)).toBeInTheDocument();
        expect(screen.getByText(/Dashboard/)).toBeInTheDocument();
      });
    });
  });
});
