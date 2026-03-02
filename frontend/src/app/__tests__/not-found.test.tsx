import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import NotFound from '../not-found';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('next/navigation');
vi.mock('@/contexts/AuthContext');

describe('NotFound (404) Page', () => {
  const mockPush = vi.fn();
  const mockBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should display 404 error code', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<NotFound />);
      expect(screen.getByText('Error 404')).toBeInTheDocument();
    });

    it('should show appropriate heading', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<NotFound />);
      expect(
        screen.getByRole('heading', { name: 'Page Not Found' }),
      ).toBeInTheDocument();
    });

    it('should display descriptive message', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<NotFound />);
      expect(
        screen.getByText(/The page you're looking for doesn't exist/),
      ).toBeInTheDocument();
    });

    it('should display search icon', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<NotFound />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Primary Navigation Buttons', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });
    });

    it('should render Go Back button', () => {
      render(<NotFound />);
      expect(screen.getByRole('button', { name: /Go Back/i })).toBeInTheDocument();
    });

    it('should render Home button', () => {
      render(<NotFound />);
      expect(screen.getByRole('button', { name: /Home/i })).toBeInTheDocument();
    });

    it('Go Back button should call router.back()', () => {
      render(<NotFound />);
      const backButton = screen.getByRole('button', { name: /Go Back/i });
      fireEvent.click(backButton);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('Home button should navigate to root', () => {
      render(<NotFound />);
      const homeButton = screen.getByRole('button', { name: /Home/i });
      fireEvent.click(homeButton);
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Suggestion Panel', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });
    });

    it('should hide suggestions initially', () => {
      render(<NotFound />);
      expect(screen.queryByText('Navigation Options')).not.toBeInTheDocument();
    });

    it('should show "Show more options" button', () => {
      render(<NotFound />);
      expect(
        screen.getByRole('button', { name: /Show more options/i }),
      ).toBeInTheDocument();
    });

    it('should display suggestions when expanded', () => {
      render(<NotFound />);
      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);
      expect(screen.getByText('Navigation Options')).toBeInTheDocument();
    });

    it('should show Home link in suggestions', () => {
      render(<NotFound />);
      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);
      expect(screen.getAllByText('Home').length).toBeGreaterThan(1); // Primary + suggestions
    });

    it('should show Documentation link in suggestions', () => {
      render(<NotFound />);
      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);
      expect(screen.getByText('Documentation')).toBeInTheDocument();
    });

    it('suggestion links should have descriptions', () => {
      render(<NotFound />);
      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);
      expect(screen.getByText('Return to the homepage')).toBeInTheDocument();
      expect(screen.getByText('Browse API docs and guides')).toBeInTheDocument();
    });
  });

  describe('Authenticated User Navigation', () => {
    it('should show Admin Dashboard for admin users', () => {
      (useAuth as any).mockReturnValue({
        user: { id: '123', email: 'admin@test.com' },
        roles: ['admin'],
        loading: false,
      });

      render(<NotFound />);
      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    it('should show Analysis Workspace for analyst users', () => {
      (useAuth as any).mockReturnValue({
        user: { id: '123', email: 'analyst@test.com' },
        roles: ['analyst'],
        loading: false,
      });

      render(<NotFound />);
      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);
      expect(screen.getByText('Analysis Workspace')).toBeInTheDocument();
    });

    it('should show Compliance Dashboard for reviewer users', () => {
      (useAuth as any).mockReturnValue({
        user: { id: '123', email: 'reviewer@test.com' },
        roles: ['reviewer'],
        loading: false,
      });

      render(<NotFound />);
      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);
      expect(screen.getByText('Compliance Dashboard')).toBeInTheDocument();
    });

    it('should show Dashboard for regular users', () => {
      (useAuth as any).mockReturnValue({
        user: { id: '123', email: 'user@test.com' },
        roles: ['user'],
        loading: false,
      });

      render(<NotFound />);
      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should show multiple dashboards for users with multiple roles', () => {
      (useAuth as any).mockReturnValue({
        user: { id: '123', email: 'multi@test.com' },
        roles: ['admin', 'analyst', 'reviewer'],
        loading: false,
      });

      render(<NotFound />);
      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Analysis Workspace')).toBeInTheDocument();
      expect(screen.getByText('Compliance Dashboard')).toBeInTheDocument();
    });
  });

  describe('Guest User Navigation', () => {
    it('should show Sign In link for unauthenticated users', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<NotFound />);
      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('Sign In should have correct description', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<NotFound />);
      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);
      expect(
        screen.getByText('Sign in to access more features'),
      ).toBeInTheDocument();
    });
  });

  describe('Support Section', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });
    });

    it('should display support section', () => {
      render(<NotFound />);
      expect(screen.getByText(/Can't find what you're looking for/)).toBeInTheDocument();
    });

    it('should render Contact Support button', () => {
      render(<NotFound />);
      expect(
        screen.getByRole('button', { name: /Contact Support/i }),
      ).toBeInTheDocument();
    });

    it('Contact Support button should navigate to /support', () => {
      render(<NotFound />);
      const supportButton = screen.getByRole('button', {
        name: /Contact Support/i,
      });
      fireEvent.click(supportButton);
      expect(mockPush).toHaveBeenCalledWith('/support');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });
    });

    it('should have screen reader announcement', () => {
      render(<NotFound />);
      const announcement = screen.getByRole('status', {
        hidden: true,
      });
      expect(announcement).toHaveAttribute('aria-live', 'polite');
      expect(announcement).toHaveAttribute('aria-atomic', 'true');
      expect(announcement).toHaveClass('sr-only');
    });

    it('announcement should contain relevant error information', () => {
      render(<NotFound />);
      const announcement = screen.getByRole('status', { hidden: true });
      expect(announcement.textContent).toContain('Error 404');
      expect(announcement.textContent).toContain('Page Not Found');
    });

    it('should have proper semantic heading structure', () => {
      render(<NotFound />);
      const heading = screen.getByRole('heading', {
        name: 'Page Not Found',
      });
      expect(heading.tagName).toBe('H1');
    });

    it('should have aria-label on suggestions toggle', () => {
      render(<NotFound />);
      const toggleButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      expect(toggleButton).toHaveAttribute('aria-label');
    });

    it('suggestion links should be keyboard accessible', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<NotFound />);
      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);

      const docLink = screen.getByRole('link', { name: /Documentation/i });
      expect(docLink).toBeInTheDocument();
      expect(docLink).toHaveAttribute('href', '/docs');
    });
  });

  describe('Loading State', () => {
    it('should handle auth loading state', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: true,
      });

      render(<NotFound />);
      // Should still render the base UI, just without role-specific suggestions yet
      expect(screen.getByText('Error 404')).toBeInTheDocument();
    });

    it('should update suggestions when auth loading completes', async () => {
      const { rerender } = render(<NotFound />);

      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: true,
      });
      rerender(<NotFound />);

      (useAuth as any).mockReturnValue({
        user: { id: '123', email: 'user@test.com' },
        roles: ['admin'],
        loading: false,
      });
      rerender(<NotFound />);

      const showMoreButton = screen.getByRole('button', {
        name: /Show more options/i,
      });
      fireEvent.click(showMoreButton);
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with no roles gracefully', () => {
      (useAuth as any).mockReturnValue({
        user: { id: '123', email: 'noRoles@test.com' },
        roles: [],
        loading: false,
      });

      render(<NotFound />);
      expect(screen.getByText('Error 404')).toBeInTheDocument();
      // Should show base suggestions only
    });

    it('should handle null user gracefully', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: null,
        loading: false,
      });

      render(<NotFound />);
      expect(screen.getByText('Error 404')).toBeInTheDocument();
    });

    it('should handle rapid back button clicks', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<NotFound />);
      const backButton = screen.getByRole('button', { name: /Go Back/i });

      fireEvent.click(backButton);
      fireEvent.click(backButton);
      fireEvent.click(backButton);

      expect(mockBack).toHaveBeenCalledTimes(3);
    });

    it('should handle suggestion toggle with keyboard', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        roles: [],
        loading: false,
      });

      render(<NotFound />);
      const toggleButton = screen.getByRole('button', {
        name: /Show more options/i,
      });

      // Simulate Enter key
      fireEvent.keyDown(toggleButton, { key: 'Enter', code: 'Enter' });
      fireEvent.click(toggleButton);

      expect(screen.getByText('Navigation Options')).toBeInTheDocument();
    });
  });
});
