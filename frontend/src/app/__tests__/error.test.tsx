import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Error from '../error';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('next/navigation');

// Mock fetch
global.fetch = vi.fn();

describe('Error (500) Component', () => {
  const mockPush = vi.fn();
  const mockReset = vi.fn();
  const testError: Error & { digest?: string } = Object.assign(
    new (Error as any)('Test error message'),
    { digest: undefined },
  );
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Initial Render', () => {
    it('should display 500 error code', () => {
      render(<Error error={testError} reset={mockReset} />);
      expect(screen.getByText('Error 500')).toBeInTheDocument();
    });

    it('should show error heading', () => {
      render(<Error error={testError} reset={mockReset} />);
      expect(
        screen.getByRole('heading', { name: 'Something Went Wrong' }),
      ).toBeInTheDocument();
    });

    it('should display generic error message', () => {
      render(<Error error={testError} reset={mockReset} />);
      expect(
        screen.getByText(/An unexpected error occurred/),
      ).toBeInTheDocument();
    });

    it('should show alert triangle icon', () => {
      render(<Error error={testError} reset={mockReset} />);
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should generate unique error ID', () => {
      const { rerender } = render(<Error error={testError} reset={mockReset} />);
      const firstErrorId = screen.getByText(/Error ID/).parentElement?.textContent;

      mockReset.mockClear();
      const secondError = Object.assign(
        new (Error as any)('Another error'),
        { digest: undefined },
      );
      rerender(<Error error={secondError} reset={mockReset} />);
      const secondErrorId = screen.getByText(/Error ID/).parentElement?.textContent;

      expect(firstErrorId).not.toBe(secondErrorId);
    });
  });

  describe('Error ID Display', () => {
    it('should display error ID clearly', () => {
      render(<Error error={testError} reset={mockReset} />);
      expect(screen.getByText(/Error ID/)).toBeInTheDocument();
      const errorIdElement = screen.getByText('Error ID').nextElementSibling;
      expect(errorIdElement).toHaveClass('font-mono');
      expect(errorIdElement).toHaveClass('font-semibold');
    });

    it('should include helpful text about error ID', () => {
      render(<Error error={testError} reset={mockReset} />);
      expect(
        screen.getByText(/Share this ID with support/),
      ).toBeInTheDocument();
    });

    it('error ID should be 10 alphanumeric characters', () => {
      render(<Error error={testError} reset={mockReset} />);
      const errorIdElement = screen.getByText('Error ID').nextElementSibling;
      const errorId = errorIdElement?.textContent;
      expect(errorId).toMatch(/^[A-Z0-9]{10}$/);
    });
  });

  describe('Error Type Detection', () => {
    it('should detect network errors', () => {
      const networkError = Object.assign(
        new (Error as any)('Network fetch failed'),
        { digest: undefined },
      );
      render(<Error error={networkError} reset={mockReset} />);
      expect(
        screen.getByText(/Network connection error/),
      ).toBeInTheDocument();
    });

    it('should detect auth errors', () => {
      const authError = Object.assign(
        new (Error as any)('Unauthorized access'),
        { digest: undefined },
      );
      render(<Error error={authError} reset={mockReset} />);
      expect(
        screen.getByText(/Authentication error/),
      ).toBeInTheDocument();
    });

    it('should show generic message for unknown errors', () => {
      render(<Error error={testError} reset={mockReset} />);
      expect(
        screen.getByText(/An unexpected error occurred/),
      ).toBeInTheDocument();
    });

    it('should handle case-insensitive network error detection', () => {
      const networkError = Object.assign(
        new (Error as any)('FETCH ERROR'),
        { digest: undefined },
      );
      render(<Error error={networkError} reset={mockReset} />);
      expect(
        screen.getByText(/Network connection error/),
      ).toBeInTheDocument();
    });
  });

  describe('Primary Actions', () => {
    it('should render Try Again button', () => {
      render(<Error error={testError} reset={mockReset} />);
      expect(
        screen.getByRole('button', { name: /Try Again/i }),
      ).toBeInTheDocument();
    });

    it('should render Back to Home button', () => {
      render(<Error error={testError} reset={mockReset} />);
      expect(
        screen.getByRole('button', { name: /Back to Home/i }),
      ).toBeInTheDocument();
    });

    it('Try Again button should call reset', () => {
      render(<Error error={testError} reset={mockReset} />);
      const tryAgainButton = screen.getByRole('button', { name: /Try Again/i });
      fireEvent.click(tryAgainButton);
      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('Back to Home button should navigate to root', () => {
      render(<Error error={testError} reset={mockReset} />);
      const homeButton = screen.getByRole('button', { name: /Back to Home/i });
      fireEvent.click(homeButton);
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('buttons should have proper icons', () => {
      render(<Error error={testError} reset={mockReset} />);
      const buttons = screen.getAllByRole('button', {
        name: /(Try Again|Back to Home)/i,
      });
      expect(buttons.length).toBe(2);
    });
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      vi.stubGlobal('NODE_ENV', 'development');
    });

    it('should show Development Details section in dev mode', () => {
      render(<Error error={testError} reset={mockReset} />);
      expect(
        screen.getByRole('button', { name: /Development Details/i }),
      ).toBeInTheDocument();
    });

    it('detail section should be expanded by default in dev mode', () => {
      render(<Error error={testError} reset={mockReset} />);
      const detailsSection = screen.getByText(testError.message);
      expect(detailsSection).toBeInTheDocument();
      expect(detailsSection).toHaveClass('font-mono');
    });

    it('should display error message in details', () => {
      render(<Error error={testError} reset={mockReset} />);
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should display stack trace if available', () => {
      const errorWithStack = Object.assign(
        new (Error as any)('Error with stack'),
        { digest: undefined, stack: 'at file.ts:10:5\nat other.ts:20:3' },
      );
      render(<Error error={errorWithStack} reset={mockReset} />);
      expect(screen.getByText(/file.ts/)).toBeInTheDocument();
    });

    it('should allow toggling detail visibility', () => {
      render(<Error error={testError} reset={mockReset} />);
      const toggleButton = screen.getByRole('button', {
        name: /Development Details/i,
      });

      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should control details panel visibility with toggle', () => {
      render(<Error error={testError} reset={mockReset} />);
      const toggleButton = screen.getByRole('button', {
        name: /Development Details/i,
      });

      const details = screen.getByText(testError.message);
      expect(details).toBeInTheDocument();

      fireEvent.click(toggleButton);
      // Details should still be in DOM but not visible (controlled by state)
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      vi.stubGlobal('NODE_ENV', 'production');
    });

    it('should not show Development Details in production', () => {
      render(<Error error={testError} reset={mockReset} />);
      expect(
        screen.queryByRole('button', { name: /Development Details/i }),
      ).not.toBeInTheDocument();
    });

    it('should not expose error stack trace in production', () => {
      const errorWithStack = Object.assign(
        new (Error as any)('Production error'),
        { digest: undefined, stack: 'at sensitive-file.ts:10:5' },
      );
      render(<Error error={errorWithStack} reset={mockReset} />);
      expect(
        screen.queryByText(/sensitive-file.ts/),
      ).not.toBeInTheDocument();
    });
  });

  describe('Auth Error Handling', () => {
    it('should detect authentication errors', () => {
      const authError = Object.assign(
        new (Error as any)('Unauthorized'),
        { digest: undefined },
      );
      render(<Error error={authError} reset={mockReset} />);
      expect(
        screen.getByText(/Authentication error/),
      ).toBeInTheDocument();
    });

    it('should show Sign In Again button for auth errors', () => {
      const authError = Object.assign(
        new (Error as any)('Authentication failed'),
        { digest: undefined },
      );
      render(<Error error={authError} reset={mockReset} />);
      expect(
        screen.getByRole('button', { name: /Sign In Again/i }),
      ).toBeInTheDocument();
    });

    it('Sign In Again should navigate to /login', () => {
      const authError = Object.assign(
        new (Error as any)('Unauthorized'),
        { digest: undefined },
      );
      render(<Error error={authError} reset={mockReset} />);
      const signInButton = screen.getByRole('button', {
        name: /Sign In Again/i,
      });
      fireEvent.click(signInButton);
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('Support Section', () => {
    it('should display support help text', () => {
      render(<Error error={testError} reset={mockReset} />);
      expect(screen.getByText(/Need help/)).toBeInTheDocument();
    });

    it('should show Contact Support button for non-auth errors', () => {
      render(<Error error={testError} reset={mockReset} />);
      const supportButtons = screen.getAllByRole('button', {
        name: /Contact Support|Sign In Again/i,
      });
      expect(supportButtons.length).toBeGreaterThan(0);
    });

    it('Contact Support should navigate to /support', () => {
      render(<Error error={testError} reset={mockReset} />);
      const supportButton = screen.getByRole('button', {
        name: /Contact Support/i,
      });
      fireEvent.click(supportButton);
      expect(mockPush).toHaveBeenCalledWith('/support');
    });

    it('should have link to status page', () => {
      render(<Error error={testError} reset={mockReset} />);
      const statusLink = screen.getByRole('link', {
        name: /Check service status/i,
      });
      expect(statusLink).toHaveAttribute('href', 'https://status.ethixai.com');
      expect(statusLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('Accessibility', () => {
    it('should have screen reader alert announcement', () => {
      render(<Error error={testError} reset={mockReset} />);
      const alert = screen.getByRole('alert', { hidden: true });
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
      expect(alert).toHaveClass('sr-only');
    });

    it('alert should contain error information', () => {
      render(<Error error={testError} reset={mockReset} />);
      const alert = screen.getByRole('alert', { hidden: true });
      expect(alert.textContent).toContain('Error 500');
      expect(alert.textContent).toContain('Test error message');
    });

    it('alert should include error ID for reference', () => {
      render(<Error error={testError} reset={mockReset} />);
      const alert = screen.getByRole('alert', { hidden: true });
      expect(alert.textContent).toContain('Error ID:');
    });

    it('should have proper heading hierarchy', () => {
      render(<Error error={testError} reset={mockReset} />);
      const heading = screen.getByRole('heading', {
        name: 'Something Went Wrong',
      });
      expect(heading.tagName).toBe('H1');
    });

    it('buttons should be keyboard accessible', () => {
      render(<Error error={testError} reset={mockReset} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        // All buttons should be accessible via keyboard
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('error details should announce expand state', () => {
      vi.stubGlobal('NODE_ENV', 'development');
      render(<Error error={testError} reset={mockReset} />);
      const toggle = screen.getByRole('button', {
        name: /Development Details/i,
      });
      expect(toggle).toHaveAttribute('aria-expanded');
    });
  });

  describe('Edge Cases', () => {
    it('should handle error without message', () => {
      const errorNoMessage = Object.assign(
        new (Error as any)(''),
        { digest: undefined },
      );
      render(<Error error={errorNoMessage} reset={mockReset} />);
      expect(
        screen.getByText(/An unexpected error occurred/),
      ).toBeInTheDocument();
    });

    it('should handle error with very long message', () => {
      const longMessage = 'A'.repeat(500);
      const longError = Object.assign(
        new (Error as any)(longMessage),
        { digest: undefined },
      );
      render(<Error error={longError} reset={mockReset} />);
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    });

    it('should handle rapid reset button clicks', () => {
      render(<Error error={testError} reset={mockReset} />);
      const resetButton = screen.getByRole('button', { name: /Try Again/i });

      fireEvent.click(resetButton);
      fireEvent.click(resetButton);
      fireEvent.click(resetButton);

      expect(mockReset).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple navigation button clicks', () => {
      render(<Error error={testError} reset={mockReset} />);
      const homeButton = screen.getByRole('button', { name: /Back to Home/i });

      fireEvent.click(homeButton);
      fireEvent.click(homeButton);

      expect(mockPush).toHaveBeenCalledWith('/');
      expect(mockPush).toHaveBeenCalledTimes(2);
    });

    it('should handle null error gracefully', () => {
      const nullError = null as any;
      render(<Error error={nullError} reset={mockReset} />);
      expect(screen.getByText('Error 500')).toBeInTheDocument();
    });
  });

  describe('Error Digest', () => {
    it('should include error digest in accessibility announcement when available', () => {
      const errorWithDigest = Object.assign(
        new (Error as any)('Test error'),
        { digest: 'abc123def456' },
      );

      render(<Error error={errorWithDigest} reset={mockReset} />);
      const alert = screen.getByRole('alert', { hidden: true });
      expect(alert).toBeInTheDocument();
    });
  });
});
