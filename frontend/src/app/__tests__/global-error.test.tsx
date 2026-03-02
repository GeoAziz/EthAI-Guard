import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlobalError from '../global-error';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

// Mock window.location
delete (window as any).location;
(window as any).location = { href: '' };

describe('GlobalError (Critical Error Boundary)', () => {
  const mockReset = vi.fn();
  const testError = new Error('Critical system error');
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
    (window as any).location.href = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Initial Render', () => {
    it('should render with HTML structure', () => {
      const { container } = render(<GlobalError error={testError} reset={mockReset} />);
      expect(container.querySelector('html')).toBeInTheDocument();
      expect(container.querySelector('body')).toBeInTheDocument();
    });

    it('should display CRITICAL ERROR badge', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(screen.getByText('CRITICAL ERROR')).toBeInTheDocument();
    });

    it('should show System Error heading', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(
        screen.getByRole('heading', { name: 'System Error' }),
      ).toBeInTheDocument();
    });

    it('should display urgent message', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(
        screen.getByText(/We encountered a critical error and need to restart/),
      ).toBeInTheDocument();
    });

    it('should display AlertCircle icon', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Error ID Generation', () => {
    it('should generate unique error IDs', () => {
      const { rerender } = render(<GlobalError error={testError} reset={mockReset} />);
      const firstId = screen.getByText(/Error ID/).nextElementSibling?.textContent;

      rerender(<GlobalError error={new Error('Another error')} reset={mockReset} />);
      const secondId = screen.getByText(/Error ID/).nextElementSibling?.textContent;

      expect(firstId).not.toBe(secondId);
    });

    it('error ID should be 10 uppercase alphanumeric characters', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const errorId = screen.getByText(/Error ID/).nextElementSibling?.textContent;
      expect(errorId).toMatch(/^[A-Z0-9]{10}$/);
    });

    it('should include error ID in accessibility announcement', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const alert = screen.getByRole('alert', { hidden: true });
      expect(alert.textContent).toContain('Error ID:');
    });
  });

  describe('Timestamp Display', () => {
    it('should display current time', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(screen.getByText(/Time/)).toBeInTheDocument();
      const timestamp = screen
        .getByText(/Time/)
        .parentElement?.nextElementSibling?.textContent;
      expect(timestamp).toBeTruthy();
    });

    it('timestamp should be in valid format', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const timeElement = screen.getByText(/Time/).parentElement?.nextElementSibling;
      const timestamp = timeElement?.textContent;
      // Should contain date/time information
      expect(timestamp).toMatch(/\d/);
    });
  });

  describe('System Status Check', () => {
    it('should show Check System Status button initially', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(
        screen.getByRole('button', { name: /Check System Status/i }),
      ).toBeInTheDocument();
    });

    it('should display system status after check', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      render(<GlobalError error={testError} reset={mockReset} />);
      const statusButton = screen.getByRole('button', {
        name: /Check System Status/i,
      });

      fireEvent.click(statusButton);

      await waitFor(() => {
        expect(screen.getByText('System Status')).toBeInTheDocument();
      });
    });

    it('should show API Service status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      render(<GlobalError error={testError} reset={mockReset} />);
      const statusButton = screen.getByRole('button', {
        name: /Check System Status/i,
      });

      fireEvent.click(statusButton);

      await waitFor(() => {
        expect(screen.getByText('API Service')).toBeInTheDocument();
      });
    });

    it('should show Database status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      render(<GlobalError error={testError} reset={mockReset} />);
      const statusButton = screen.getByRole('button', {
        name: /Check System Status/i,
      });

      fireEvent.click(statusButton);

      await waitFor(() => {
        expect(screen.getByText('Database')).toBeInTheDocument();
      });
    });

    it('should indicate online service with checkmark and green color', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      render(<GlobalError error={testError} reset={mockReset} />);
      const statusButton = screen.getByRole('button', {
        name: /Check System Status/i,
      });

      fireEvent.click(statusButton);

      await waitFor(() => {
        expect(screen.getByText(/✓ Online/)).toBeInTheDocument();
      });
    });

    it('should indicate offline service with X and red color', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(<GlobalError error={testError} reset={mockReset} />);
      const statusButton = screen.getByRole('button', {
        name: /Check System Status/i,
      });

      fireEvent.click(statusButton);

      await waitFor(() => {
        expect(screen.getByText(/✗ Offline/)).toBeInTheDocument();
      });
    });

    it('should handle partial service outage', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, status: 200 }) // API OK
        .mockRejectedValueOnce(new Error('DB connection failed')); // DB failed

      render(<GlobalError error={testError} reset={mockReset} />);
      const statusButton = screen.getByRole('button', {
        name: /Check System Status/i,
      });

      fireEvent.click(statusButton);

      await waitFor(() => {
        const onlineStatuses = screen.getAllByText(/✓ Online/);
        const offlineStatuses = screen.getAllByText(/✗ Offline/);
        expect(onlineStatuses.length).toBeGreaterThan(0);
        expect(offlineStatuses.length).toBeGreaterThan(0);
      });
    });

    it('should disable button while checking', async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100)),
      );

      render(<GlobalError error={testError} reset={mockReset} />);
      const statusButton = screen.getByRole('button', {
        name: /Check System Status/i,
      });

      fireEvent.click(statusButton);
      expect(statusButton).toBeDisabled();
    });
  });

  describe('Primary Recovery Actions', () => {
    it('should render Restart Application button', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(
        screen.getByRole('button', { name: /Restart Application/i }),
      ).toBeInTheDocument();
    });

    it('Restart Application should reload to home page', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const restartButton = screen.getByRole('button', {
        name: /Restart Application/i,
      });

      fireEvent.click(restartButton);
      expect((window as any).location.href).toBe('/');
    });

    it('should have prominent styling on restart button', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const restartButton = screen.getByRole('button', {
        name: /Restart Application/i,
      });

      expect(restartButton).toHaveClass('bg-red-600');
    });
  });

  describe('Fallback Recovery Options', () => {
    it('should show Try to Recover button', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(
        screen.getByRole('button', { name: /Try to Recover/i }),
      ).toBeInTheDocument();
    });

    it('Try to Recover button should call reset', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const recoverButton = screen.getByRole('button', {
        name: /Try to Recover/i,
      });

      fireEvent.click(recoverButton);
      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('should have subtle styling on recover button', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const recoverButton = screen.getByRole('button', {
        name: /Try to Recover/i,
      });

      expect(recoverButton).toHaveClass('outline');
    });
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      vi.stubGlobal('NODE_ENV', 'development');
    });

    it('should show Error Details section in development', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(
        screen.getByRole('button', { name: /Error Details/i }),
      ).toBeInTheDocument();
    });

    it('should display error details expanded by default in dev', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(screen.getByText('Critical system error')).toBeInTheDocument();
    });

    it('should show error message', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(screen.getByText('Error Message:')).toBeInTheDocument();
      expect(screen.getByText('Critical system error')).toBeInTheDocument();
    });

    it('should display stack trace when available', () => {
      const errorWithStack = new Error('Error with stack');
      errorWithStack.stack = 'at app.tsx:10:5\nat main.tsx:20:3';
      render(<GlobalError error={errorWithStack} reset={mockReset} />);

      expect(screen.getByText(/Stack Trace:/)).toBeInTheDocument();
      expect(screen.getByText(/app.tsx/)).toBeInTheDocument();
    });

    it('should allow toggling details visibility', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const toggleButton = screen.getByRole('button', {
        name: /Error Details/i,
      });

      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('details should have monospace font', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const details = screen.getByText('Critical system error').closest('div');
      expect(details).toHaveClass('font-mono');
    });

    it('details should be scrollable for long content', () => {
      const longError = new Error('A'.repeat(1000));
      render(<GlobalError error={longError} reset={mockReset} />);
      const details = screen.getByText('Error Message:').closest('div');
      expect(details).toHaveClass('overflow-auto');
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      vi.stubGlobal('NODE_ENV', 'production');
    });

    it('should not show Error Details in production', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(
        screen.queryByRole('button', { name: /Error Details/i }),
      ).not.toBeInTheDocument();
    });

    it('should not expose stack trace in production', () => {
      const errorWithStack = new Error('Production error');
      errorWithStack.stack = 'at sensitive-app.tsx:10:5';
      render(<GlobalError error={errorWithStack} reset={mockReset} />);

      expect(screen.queryByText(/sensitive-app.tsx/)).not.toBeInTheDocument();
    });

    it('should only show user-friendly message', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(
        screen.getByText(/We encountered a critical error/),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Critical system error/)).not.toBeInTheDocument();
    });
  });

  describe('Support Section', () => {
    it('should display support contact information', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      expect(screen.getByText(/If this problem persists/)).toBeInTheDocument();
    });

    it('should show error ID in support message', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const supportText = screen.getByText(/If this problem persists/);
      expect(supportText.textContent).toContain('Error ID:');
    });

    it('should have link to support portal', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const supportLink = screen.getByRole('link', { name: /Contact Support/i });
      expect(supportLink).toHaveAttribute('href', 'https://support.ethixai.com');
      expect(supportLink).toHaveAttribute('target', '_blank');
      expect(supportLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Accessibility', () => {
    it('should have screen reader alert announcement', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const alert = screen.getByRole('alert', { hidden: true });
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
      expect(alert).toHaveClass('sr-only');
    });

    it('alert should contain critical information', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const alert = screen.getByRole('alert', { hidden: true });
      expect(alert.textContent).toContain('Critical system error');
      expect(alert.textContent).toContain('Error ID:');
      expect(alert.textContent).toContain('restart');
      expect(alert.textContent).toContain('Contact Support');
    });

    it('should have proper heading hierarchy', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const heading = screen.getByRole('heading', { name: 'System Error' });
      expect(heading.tagName).toBe('H1');
    });

    it('buttons should be keyboard accessible', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('collapsible sections should announce expand state in dev', () => {
      vi.stubGlobal('NODE_ENV', 'development');
      render(<GlobalError error={testError} reset={mockReset} />);
      const toggle = screen.getByRole('button', { name: /Error Details/i });
      expect(toggle).toHaveAttribute('aria-expanded');
    });
  });

  describe('Visual Design', () => {
    it('should use red color scheme for critical error', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const criticalBadge = screen.getByText('CRITICAL ERROR').closest('div');
      expect(criticalBadge).toHaveClass('bg-red-900/30');
    });

    it('should have animated pulse effect on icon', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const iconContainer = document
        .querySelector('svg')
        ?.closest('div')
        ?.closest('div');
      expect(iconContainer).toHaveClass('animate-pulse');
    });

    it('should use gradient background', () => {
      const { container } = render(
        <GlobalError error={testError} reset={mockReset} />,
      );
      const body = container.querySelector('body');
      expect(body).toHaveClass('bg-gradient-to-br');
    });

    it('should have proper centering and spacing', () => {
      const { container } = render(
        <GlobalError error={testError} reset={mockReset} />,
      );
      const main = container.querySelector('div[class*="flex"]');
      expect(main).toHaveClass('min-h-screen');
      expect(main).toHaveClass('flex');
      expect(main).toHaveClass('items-center');
      expect(main).toHaveClass('justify-center');
    });
  });

  describe('Edge Cases', () => {
    it('should handle error without message', () => {
      const emptyError = new Error();
      render(<GlobalError error={emptyError} reset={mockReset} />);
      expect(screen.getByText('CRITICAL ERROR')).toBeInTheDocument();
    });

    it('should handle very long error message', () => {
      const longError = new Error('E'.repeat(1000));
      render(<GlobalError error={longError} reset={mockReset} />);
      expect(screen.getByText('CRITICAL ERROR')).toBeInTheDocument();
    });

    it('should handle rapid restart clicks', () => {
      render(<GlobalError error={testError} reset={mockReset} />);
      const restartButton = screen.getByRole('button', {
        name: /Restart Application/i,
      });

      fireEvent.click(restartButton);
      fireEvent.click(restartButton);
      fireEvent.click(restartButton);

      // Should still redirect to home (last click wins)
      expect((window as any).location.href).toBe('/');
    });

    it('should handle null error', () => {
      const nullError = null as any;
      render(<GlobalError error={nullError} reset={mockReset} />);
      expect(screen.getByText('System Error')).toBeInTheDocument();
    });

    it('should handle undefined error', () => {
      const undefinedError = undefined as any;
      render(<GlobalError error={undefinedError} reset={mockReset} />);
      expect(screen.getByText('System Error')).toBeInTheDocument();
    });

    it('should handle fetch failure when checking status', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network down'));

      render(<GlobalError error={testError} reset={mockReset} />);
      const statusButton = screen.getByRole('button', {
        name: /Check System Status/i,
      });

      fireEvent.click(statusButton);

      await waitFor(() => {
        // Should show offline for all services
        const offlineStatuses = screen.getAllByText(/✗ Offline/);
        expect(offlineStatuses.length).toBeGreaterThan(0);
      });
    });

    it('should handle mixed fetch responses', async () => {
      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ ok: true });
        } else {
          return Promise.reject(new Error('DB error'));
        }
      });

      render(<GlobalError error={testError} reset={mockReset} />);
      const statusButton = screen.getByRole('button', {
        name: /Check System Status/i,
      });

      fireEvent.click(statusButton);

      await waitFor(() => {
        expect(screen.getByText('System Status')).toBeInTheDocument();
      });
    });
  });

  describe('Error Digest', () => {
    it('should handle error with digest property', () => {
      const errorWithDigest = new Error('Error with digest');
      (errorWithDigest as any).digest = 'abc123';
      render(<GlobalError error={errorWithDigest} reset={mockReset} />);
      expect(screen.getByText('System Error')).toBeInTheDocument();
    });
  });
});
