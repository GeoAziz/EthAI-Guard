/**
 * Unauthorized (403) Error Page Tests
 * Tests error contexts, role detection, user guidance, and accessibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import UnauthorizedPage from '@/app/unauthorized/page';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock('@/contexts/AnnounceContext', () => ({
  useAnnounce: vi.fn(() => vi.fn()),
}));

describe('UnauthorizedPage (403 Error)', () => {
  let mockPush: any;
  let mockParamGet: any;

  beforeEach(() => {
    mockPush = vi.fn();
    mockParamGet = vi.fn((key: string) => {
      const params: Record<string, string> = {
        context: null,
        resource: null,
      };
      return params[key];
    });

    (useRouter as any).mockReturnValue({
      push: mockPush,
    });

    (useSearchParams as any).mockReturnValue({
      get: mockParamGet,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Display', () => {
    it('should display 403 error code badge', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText('Error 403')).toBeInTheDocument();
    });

    it('should display lock icon for unauthorized state', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      // Lock icon should be rendered
      const iconText = screen.getByText(/Access Denied|Access denied/i);
      expect(iconText).toBeInTheDocument();
    });

    it('should show loading state while checking auth', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: true,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText('Checking permissions...')).toBeInTheDocument();
    });
  });

  describe('Error Contexts', () => {
    it('should display role-required message when context is role-required', () => {
      mockParamGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          context: 'role-required',
          resource: null,
        };
        return params[key];
      });

      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText('Admin Access Required')).toBeInTheDocument();
      expect(screen.getByText(/restricted to administrators only/i)).toBeInTheDocument();
    });

    it('should display resource-forbidden message when context is resource-forbidden', () => {
      mockParamGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          context: 'resource-forbidden',
          resource: null,
        };
        return params[key];
      });

      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText('Access Forbidden')).toBeInTheDocument();
      expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    });

    it('should display permission-denied message when context is permission-denied', () => {
      mockParamGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          context: 'permission-denied',
          resource: null,
        };
        return params[key];
      });

      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['analyst'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText('Permission Denied')).toBeInTheDocument();
      expect(screen.getByText(/current role does not grant/i)).toBeInTheDocument();
    });

    it('should default to unknown error when context is not recognized', () => {
      mockParamGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          context: 'invalid-context',
          resource: null,
        };
        return params[key];
      });

      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('User Information Display', () => {
    it('should display user email when authenticated', () => {
      (useAuth as any).mockReturnValue({
        user: { email: 'john@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
    });

    it('should display user roles when authenticated with roles', () => {
      (useAuth as any).mockReturnValue({
        user: { email: 'john@example.com', uid: 'user123' },
        roles: ['analyst', 'reviewer'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText(/analyst, reviewer/)).toBeInTheDocument();
    });

    it('should not display user info when not authenticated', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.queryByText(/Signed in as:/)).not.toBeInTheDocument();
    });
  });

  describe('Attempted Resource Display', () => {
    it('should display attempted resource path when provided', () => {
      mockParamGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          context: 'permission-denied',
          resource: '/dashboard/admin/users',
        };
        return params[key];
      });

      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText(/\/dashboard\/admin\/users/)).toBeInTheDocument();
    });

    it('should display encoded resource path correctly', () => {
      mockParamGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          context: 'permission-denied',
          resource: '/dashboard/admin/users%3Fpage%3D1',
        };
        return params[key];
      });

      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText(/\/dashboard\/admin\/users\?page=1/)).toBeInTheDocument();
    });
  });

  describe('Navigation Buttons', () => {
    it('should show sign in button for unauthenticated users', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const signInBtn = screen.getByRole('button', { name: /sign in/i });
      expect(signInBtn).toBeInTheDocument();
    });

    it('should show home button for unauthenticated users', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const homeBtn = screen.getByRole('button', { name: /home/i });
      expect(homeBtn).toBeInTheDocument();
    });

    it('should show dashboard button for authenticated users', () => {
      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const dashboardBtn = screen.getByRole('button', { name: /go to dashboard/i });
      expect(dashboardBtn).toBeInTheDocument();
    });

    it('should show request access button for authenticated users with roles', () => {
      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const requestBtn = screen.getByRole('button', { name: /request role upgrade/i });
      expect(requestBtn).toBeInTheDocument();
    });

    it('should not show request access button if user has no roles', () => {
      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.queryByRole('button', { name: /request role upgrade/i })).not.toBeInTheDocument();
    });
  });

  describe('Button Navigation', () => {
    it('should navigate to /login when sign in button clicked', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const signInBtn = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(signInBtn);

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should navigate to / when home button clicked', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const homeBtn = screen.getByRole('button', { name: /home/i });
      fireEvent.click(homeBtn);

      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('should navigate to /dashboard when go to dashboard clicked', () => {
      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const dashboardBtn = screen.getByRole('button', { name: /go to dashboard/i });
      fireEvent.click(dashboardBtn);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to request-access when request role upgrade clicked', () => {
      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const requestBtn = screen.getByRole('button', { name: /request role upgrade/i });
      fireEvent.click(requestBtn);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/request-access');
    });

    it('should navigate to /support when contact support clicked', () => {
      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const supportBtn = screen.getByRole('button', { name: /contact support/i });
      fireEvent.click(supportBtn);

      expect(mockPush).toHaveBeenCalledWith('/support');
    });
  });

  describe('Accessibility', () => {
    it('should have alert role for error message', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have aria-atomic for complete error announcement', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have descriptive aria-label on show more button', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const moreBtn = screen.getByRole('button', { name: /show additional details/i });
      expect(moreBtn).toHaveAttribute('aria-label');
    });

    it('should display semantic error code styling', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const errorCode = screen.getByText('Error 403');
      expect(errorCode).toBeInTheDocument();
      expect(errorCode).toHaveClass('font-mono');
    });
  });

  describe('Details Toggle', () => {
    it('should show more details button initially', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const moreBtn = screen.getByRole('button', { name: /show more details/i });
      expect(moreBtn).toBeInTheDocument();
    });

    it('should toggle details section when button clicked', async () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const moreBtn = screen.getByRole('button', { name: /show more details/i });

      // Details shouldn't be visible initially
      expect(screen.queryByText('Why am I seeing this?')).not.toBeInTheDocument();

      fireEvent.click(moreBtn);

      // Details should now be visible
      await waitFor(() => {
        expect(screen.getByText('Why am I seeing this?')).toBeInTheDocument();
      });
    });

    it('should show troubleshooting steps when details opened', async () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const moreBtn = screen.getByRole('button', { name: /show more details/i });
      fireEvent.click(moreBtn);

      await waitFor(() => {
        expect(screen.getByText('What can I do?')).toBeInTheDocument();
        expect(screen.getByText(/Check if you're signed in with the correct account/)).toBeInTheDocument();
      });
    });

    it('should show role-specific troubleshooting for role-required context', async () => {
      mockParamGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          context: 'role-required',
          resource: null,
        };
        return params[key];
      });

      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const moreBtn = screen.getByRole('button', { name: /show more details/i });
      fireEvent.click(moreBtn);

      await waitFor(() => {
        expect(screen.getByText(/Request admin access through your administrator/)).toBeInTheDocument();
      });
    });

    it('should show permission-related troubleshooting for permission-denied context', async () => {
      mockParamGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          context: 'permission-denied',
          resource: null,
        };
        return params[key];
      });

      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      const moreBtn = screen.getByRole('button', { name: /show more details/i });
      fireEvent.click(moreBtn);

      await waitFor(() => {
        expect(screen.getByText(/Request a role upgrade to gain access/)).toBeInTheDocument();
      });
    });
  });

  describe('Design & Layout', () => {
    it('should have gradient background', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      const { container } = render(<UnauthorizedPage />);

      const bgElement = container.querySelector('.bg-gradient-to-br');
      expect(bgElement).toBeInTheDocument();
    });

    it('should center content vertically and horizontally', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      const { container } = render(<UnauthorizedPage />);

      const mainContainer = container.querySelector('.min-h-screen.flex.items-center.justify-center');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should have responsive padding', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      const { container } = render(<UnauthorizedPage />);

      const mainContainer = container.querySelector('.p-4');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('User Guidance', () => {
    it('should show different suggestions for role-required context', () => {
      mockParamGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          context: 'role-required',
          resource: null,
        };
        return params[key];
      });

      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText(/Contact your administrator to request admin access/)).toBeInTheDocument();
    });

    it('should show different suggestions for permission-denied context', () => {
      mockParamGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          context: 'permission-denied',
          resource: null,
        };
        return params[key];
      });

      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText(/may request a role upgrade to gain access/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user gracefully', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: null,
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText('Error 403')).toBeInTheDocument();
    });

    it('should handle empty roles array', () => {
      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: [],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.queryByText(/Roles:/)).not.toBeInTheDocument();
    });

    it('should handle long email addresses', () => {
      (useAuth as any).mockReturnValue({
        user: { email: 'very.long.email.address.with.many.characters@subdomain.example.com', uid: 'user123' },
        roles: ['user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText(/very\.long\.email\.address\.with\.many\.characters@subdomain\.example\.com/)).toBeInTheDocument();
    });

    it('should handle multiple roles display', () => {
      (useAuth as any).mockReturnValue({
        user: { email: 'user@example.com', uid: 'user123' },
        roles: ['admin', 'analyst', 'reviewer', 'user'],
        loading: false,
      });

      render(<UnauthorizedPage />);

      expect(screen.getByText(/admin, analyst, reviewer, user/)).toBeInTheDocument();
    });
  });
});
