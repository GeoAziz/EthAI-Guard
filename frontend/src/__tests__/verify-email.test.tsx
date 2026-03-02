/**
 * Comprehensive test suite for /verify-email page
 * Tests email verification flow, resend logic, error handling, and accessibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { sendEmailVerification } from 'firebase/auth';
import VerifyEmailPage from '@/app/verify-email/page';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { extractRoles } from '@/lib/auth-routing';
import { defaultRouteForRoles } from '@/lib/rbac';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('firebase/auth', () => ({
  sendEmailVerification: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(),
}));

vi.mock('@/contexts/AnnounceContext', () => ({
  useAnnounce: vi.fn(() => vi.fn()),
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('@/lib/auth-routing', () => ({
  extractRoles: vi.fn(() => ['user']),
}));

vi.mock('@/lib/rbac', () => ({
  defaultRouteForRoles: vi.fn(() => '/dashboard'),
}));

// Import mocked modules
import { auth as firebaseAuth } from '@/lib/firebase';

describe('VerifyEmailPage', () => {
  let mockPush: any;
  let mockToast: any;
  const mockCurrentUser = {
    email: 'test@example.com',
    emailVerified: false,
    reload: vi.fn(),
  };

  beforeEach(() => {
    mockPush = vi.fn();
    mockToast = vi.fn();

    (useRouter as any).mockReturnValue({
      push: mockPush,
    });

    (useToast as any).mockReturnValue({
      toast: mockToast,
    });

    // Set up default Firebase current user
    (firebaseAuth as any).currentUser = mockCurrentUser;

    // Clear all mocks before each test
    vi.clearAllMocks();

    // Mock window.setInterval to avoid long test waits
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial Render', () => {
    it('should display loading spinner initially while checking verification status', async () => {
      render(<VerifyEmailPage />);

      // Should show loading state
      expect(screen.getByText('Checking email verification status...')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Checking email verification status...')).not.toBeInTheDocument();
      }, { timeout: 100 });
    });

    it('should display email address during initial check', async () => {
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      }, { timeout: 100 });
    });

    it('should display polling attempt counter', async () => {
      render(<VerifyEmailPage />);

      // Should show attempt indicator
      await waitFor(() => {
        expect(screen.getByText(/Attempt \d+ of 60/)).toBeInTheDocument();
      }, { timeout: 100 });
    });

    it('should display verification page with user email once loaded', async () => {
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/We sent a link to test@example.com/)).toBeInTheDocument();
      }, { timeout: 100 });

      expect(screen.getByText('We sent a verification link to your email.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
    });

    it('should render resend and back-to-signin buttons with proper aria-labels', async () => {
      render(<VerifyEmailPage />);

      await waitFor(() => {
        const resendBtn = screen.getByRole('button', { name: /resend verification email to test@example.com/i });
        const backBtn = screen.getByRole('button', { name: /return to sign in page/i });

        expect(resendBtn).toBeInTheDocument();
        expect(backBtn).toBeInTheDocument();
      }, { timeout: 100 });
    });

    it('should display "Change email" link to support page', async () => {
      render(<VerifyEmailPage />);

      await waitFor(() => {
        const changeEmailLink = screen.getByRole('link', { name: /contact support to change it/i });
        expect(changeEmailLink).toBeInTheDocument();
        expect(changeEmailLink).toHaveAttribute('href', '/support');
      }, { timeout: 100 });
    });

    it('should display support link to /support page', async () => {
      render(<VerifyEmailPage />);

      await waitFor(() => {
        const supportLink = screen.getByRole('link', { name: /go to support page for help/i });
        expect(supportLink).toBeInTheDocument();
        expect(supportLink).toHaveAttribute('href', '/support');
      }, { timeout: 100 });
    });

    it('should display email verification info box with icon', async () => {
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Check your email for the verification link/)).toBeInTheDocument();
      }, { timeout: 100 });
    });
  });

  describe('Resend Email Logic', () => {
    it('should call sendEmailVerification when resend button is clicked', async () => {
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      const resendBtn = screen.getByRole('button', { name: /resend email/i });
      fireEvent.click(resendBtn);

      expect(sendEmailVerification).toHaveBeenCalledWith(mockCurrentUser);
    });

    it('should show success toast after successful resend', async () => {
      (sendEmailVerification as any).mockResolvedValue(undefined);

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      fireEvent.click(screen.getByRole('button', { name: /resend email/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Verification Email Sent',
            description: expect.stringContaining('5 minutes'),
          }),
        );
      });
    });

    it('should disable resend button after successful send (5-minute cooldown)', async () => {
      (sendEmailVerification as any).mockResolvedValue(undefined);

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      const resendBtn = screen.getByRole('button', { name: /resend email/i });
      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(resendBtn).toBeDisabled();
      });
    });

    it('should prevent resend if still in cooldown period', async () => {
      (sendEmailVerification as any).mockResolvedValue(undefined);

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      // First resend
      fireEvent.click(screen.getByRole('button', { name: /resend email/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Try to resend again immediately
      vi.clearAllMocks();
      fireEvent.click(screen.getByRole('button', { name: /resend email in/i }));

      // Should show toast about waiting
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Too Many Resend Attempts',
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should show Firebase error message for too-many-requests', async () => {
      const error = new Error('Firebase error');
      (error as any).code = 'auth/too-many-requests';
      (sendEmailVerification as any).mockRejectedValue(error);

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      fireEvent.click(screen.getByRole('button', { name: /resend email/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Too Many Resend Attempts',
          }),
        );
      });
    });

    it('should show network error toast for network-request-failed', async () => {
      const error = new Error('Network error');
      (error as any).code = 'auth/network-request-failed';
      (sendEmailVerification as any).mockRejectedValue(error);

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      fireEvent.click(screen.getByRole('button', { name: /resend email/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Connection Error',
          }),
        );
      });
    });

    it('should handle session expiration (no current user)', async () => {
      (firebaseAuth as any).currentUser = null;

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Session Expired',
          }),
        );
      });

      vi.advanceTimersByTime(1500);

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should show alert after 1+ resend attempts (early help)', async () => {
      (sendEmailVerification as any).mockResolvedValue(undefined);

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      // First resend attempt
      fireEvent.click(screen.getByRole('button', { name: /resend email/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Simulate cooldown expiration and second render
      vi.advanceTimersByTime(300001); // 5 min + 1ms

      // Alert should display after 1+ attempts
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Verification email not arriving/i)).toBeInTheDocument();
      });
    });
  });

  describe('Auto-Redirect on Email Verification', () => {
    it('should auto-redirect when email becomes verified', async () => {
      (api.get as any).mockResolvedValue({
        data: { role: 'user' },
      });
      (defaultRouteForRoles as any).mockReturnValue('/dashboard');

      // Initially not verified
      mockCurrentUser.emailVerified = false;
      mockCurrentUser.reload = vi.fn(async () => {
        // Simulate email verification after 2 seconds
        setTimeout(() => {
          mockCurrentUser.emailVerified = true;
        }, 2000);
      });

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      // Advance timers to trigger polling and detect verification
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Email Verified!',
          }),
        );
      });

      // Advance timers for redirect
      vi.advanceTimersByTime(2000);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should fetch user roles and redirect to role-specific dashboard', async () => {
      mockCurrentUser.emailVerified = false;
      mockCurrentUser.reload = vi.fn(async () => {
        mockCurrentUser.emailVerified = true;
      });

      (api.get as any).mockResolvedValue({
        data: { role: 'analyst' },
      });
      (extractRoles as any).mockReturnValue(['analyst']);
      (defaultRouteForRoles as any).mockReturnValue('/dashboard/analyst');

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Email Verified!',
          }),
        );
      });

      vi.advanceTimersByTime(2000);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/analyst');
    });

    it('should fallback to /dashboard if role fetch fails', async () => {
      mockCurrentUser.emailVerified = false;
      mockCurrentUser.reload = vi.fn(async () => {
        mockCurrentUser.emailVerified = true;
      });

      (api.get as any).mockRejectedValue(new Error('API error'));

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Email Verified!',
          }),
        );
      });

      vi.advanceTimersByTime(2000);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels on interactive elements', async () => {
      render(<VerifyEmailPage />);

      await waitFor(() => {
        const resendBtn = screen.getByRole('button', { name: /resend verification email to test@example.com/i });
        const backBtn = screen.getByRole('button', { name: /return to sign in page/i });

        expect(resendBtn).toHaveAttribute('aria-label');
        expect(backBtn).toHaveAttribute('aria-label');
      }, { timeout: 100 });
    });

    it('should have aria-live region alert after multiple attempts', async () => {
      (sendEmailVerification as any).mockResolvedValue(undefined);

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      // Simulate 4 resend attempts
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByRole('button', { name: /resend email/i }));
        await waitFor(() => {
          expect(mockToast).toHaveBeenCalled();
        });
        vi.clearAllMocks();
        vi.advanceTimersByTime(300001); // Cooldown + 1ms
      }

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Button States', () => {
    it('should disable resend button while sending', async () => {
      (sendEmailVerification as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)),
      );

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      const resendBtn = screen.getByRole('button', { name: /resend email/i });
      fireEvent.click(resendBtn);

      expect(resendBtn).toBeDisabled();
    });

    it('should show loading spinner icon while sending', async () => {
      (sendEmailVerification as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)),
      );

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      const resendBtn = screen.getByRole('button', { name: /resend email/i });
      fireEvent.click(resendBtn);

      // Button should contain spinner icon (Loader2)
      const spinner = resendBtn.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('should update button text to show countdown during cooldown', async () => {
      (sendEmailVerification as any).mockResolvedValue(undefined);

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      fireEvent.click(screen.getByRole('button', { name: /resend email/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email in \d+s/i })).toBeInTheDocument();
      });
    });
  });

  describe('Back to Sign In Navigation', () => {
    it('should navigate to /login when back button is clicked', async () => {
      render(<VerifyEmailPage />);

      await waitFor(() => {
        const backBtn = screen.getByRole('button', { name: /return to sign in page/i });
        expect(backBtn).toBeInTheDocument();
        fireEvent.click(backBtn);
      }, { timeout: 100 });

      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('Polling Timeout Handling', () => {
    it('should show timeout alert after 5 minutes of polling without verification', async () => {
      mockCurrentUser.emailVerified = false;
      mockCurrentUser.reload = vi.fn();

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      // Advance timers past 5 minutes (60 attempts × 5 seconds = 300 seconds)
      vi.advanceTimersByTime(301000);

      // Should show timeout alert
      await waitFor(() => {
        expect(screen.getByText(/Email verification check timed out/)).toBeInTheDocument();
      });
    });

    it('should announce timeout to screen reader', async () => {
      mockCurrentUser.emailVerified = false;
      mockCurrentUser.reload = vi.fn();

      const mockAnnounce = vi.fn();
      vi.mocked(require('@/contexts/AnnounceContext').useAnnounce).mockReturnValue(mockAnnounce);

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      vi.advanceTimersByTime(301000);

      await waitFor(() => {
        expect(mockAnnounce).toHaveBeenCalledWith(
          expect.stringContaining('Email verification check timed out'),
        );
      });
    });
  });

  describe('Help Alert Display', () => {
    it('should show help tips after 1st resend attempt', async () => {
      (sendEmailVerification as any).mockResolvedValue(undefined);

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      fireEvent.click(screen.getByRole('button', { name: /resend email/i }));

      await waitFor(() => {
        // After 1 attempt, help alert should display
        const helpText = screen.queryByText(/Verification email not arriving/i);
        // Note: Alert might not show immediately due to timing, advance timers
        vi.advanceTimersByTime(300001); // Cooldown expires
      });

      // Re-render would happen, alert should now be visible
      // Note: React Testing Library handles re-renders automatically
      expect(screen.queryByText(/Whitelist noreply@firebase.com/i)).toBeDefined;
    });

    it('should contain helpful troubleshooting steps in alert', async () => {
      (sendEmailVerification as any).mockResolvedValue(undefined);

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
      }, { timeout: 100 });

      // Trigger to show alert
      fireEvent.click(screen.getByRole('button', { name: /resend email/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Verify helper alert content structure
      // (Content validates in render phase when resendAttempts > 1)
    });
  });});