import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AboutPage from '../page';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock window.open
global.open = vi.fn();

describe('About Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render page title', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: 'About EthixAI' })).toBeInTheDocument();
    });

    it('should display main mission statement', () => {
      render(<AboutPage />);
      expect(
        screen.getByText(/We're on a mission to make AI systems fair/),
      ).toBeInTheDocument();
    });

    it('should render mission card with icon', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: 'Our Mission' })).toBeInTheDocument();
    });

    it('should display four core values', () => {
      render(<AboutPage />);
      expect(screen.getByText('Trust & Transparency')).toBeInTheDocument();
      expect(screen.getByText('Fairness First')).toBeInTheDocument();
      expect(screen.getByText('Innovation')).toBeInTheDocument();
      expect(screen.getByText('Global Compliance')).toBeInTheDocument();
    });

    it('should display Our Story section', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: 'Our Story' })).toBeInTheDocument();
    });

    it('should display schema.org structured data', () => {
      const { container } = render(<AboutPage />);
      const schemaScript = container.querySelector('script[type="application/ld+json"]');
      expect(schemaScript).toBeInTheDocument();
      expect(schemaScript?.textContent).toContain('EthixAI');
    });
  });

  describe('Impact Metrics Section', () => {
    it('should display impact heading', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: 'Our Impact' })).toBeInTheDocument();
    });

    it('should display financial institutions metric', () => {
      render(<AboutPage />);
      expect(screen.getByText('Financial Institutions')).toBeInTheDocument();
    });

    it('should display loan applications metric', () => {
      render(<AboutPage />);
      expect(screen.getByText('Loan Applications Analyzed')).toBeInTheDocument();
    });

    it('should display bias reduction metric', () => {
      render(<AboutPage />);
      expect(screen.getByText('Average Bias Reduction')).toBeInTheDocument();
    });

    it('should display research papers metric', () => {
      render(<AboutPage />);
      expect(screen.getByText('Research Papers Published')).toBeInTheDocument();
    });

    it('should animate counters when visible', async () => {
      render(<AboutPage />);
      await waitFor(() => {
        // Counters should show values
        expect(document.body.textContent).toContain('50');
      });
    });
  });

  describe('Team Section', () => {
    it('should display team heading', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: 'Meet Our Team' })).toBeInTheDocument();
    });

    it('should display all team members initially unexpanded', () => {
      render(<AboutPage />);
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
      expect(screen.getByText('Marcus Johnson')).toBeInTheDocument();
      expect(screen.getByText('Elena Rodriguez')).toBeInTheDocument();
      expect(screen.getByText('David Park')).toBeInTheDocument();
    });

    it('should show team member roles', () => {
      render(<AboutPage />);
      expect(screen.getByText('Founder & CEO')).toBeInTheDocument();
      expect(screen.getByText('VP Research')).toBeInTheDocument();
      expect(screen.getByText('VP Compliance')).toBeInTheDocument();
      expect(screen.getByText('VP Engineering')).toBeInTheDocument();
    });

    it('should expand team member card on button click', () => {
      render(<AboutPage />);
      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      fireEvent.click(expandButtons[0]);
      expect(screen.getByText('AI researcher with 12 years')).toBeInTheDocument();
    });

    it('should show expertise tags when expanded', () => {
      render(<AboutPage />);
      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      fireEvent.click(expandButtons[0]);
      expect(screen.getByText('AI Fairness')).toBeInTheDocument();
    });

    it('should collapse team member card on second click', () => {
      render(<AboutPage />);
      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      fireEvent.click(expandButtons[0]);
      fireEvent.click(expandButtons[0]);
      expect(screen.queryByText('AI researcher with 12 years')).not.toBeInTheDocument();
    });

    it('should have proper aria labels for team members', () => {
      render(<AboutPage />);
      expect(screen.getByLabelText('Sarah Chen, Founder & CEO')).toBeInTheDocument();
    });

    it('should independently expand multiple team members', () => {
      render(<AboutPage />);
      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      fireEvent.click(expandButtons[0]);
      fireEvent.click(expandButtons[1]);
      expect(screen.getByText('AI researcher with 12 years')).toBeInTheDocument();
      expect(screen.getByText('Published 40+ papers')).toBeInTheDocument();
    });
  });

  describe('Testimonials Carousel', () => {
    it('should display testimonials heading', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: 'What Our Clients Say' })).toBeInTheDocument();
    });

    it('should display first testimonial by default', () => {
      render(<AboutPage />);
      expect(screen.getByText(/Jennifer Lee/)).toBeInTheDocument();
    });

    it('should display testimonial company name', () => {
      render(<AboutPage />);
      expect(screen.getByText('Global Finance Corp')).toBeInTheDocument();
    });

    it('should have next and previous buttons', () => {
      render(<AboutPage />);
      expect(screen.getByLabelText('Next testimonial')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous testimonial')).toBeInTheDocument();
    });

    it('should navigate to next testimonial', () => {
      render(<AboutPage />);
      const nextButton = screen.getByLabelText('Next testimonial');
      fireEvent.click(nextButton);
      expect(screen.getByText('Robert Chen')).toBeInTheDocument();
    });

    it('should navigate to previous testimonial', () => {
      render(<AboutPage />);
      const nextButton = screen.getByLabelText('Next testimonial');
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      const prevButton = screen.getByLabelText('Previous testimonial');
      fireEvent.click(prevButton);
      expect(screen.getByText('Robert Chen')).toBeInTheDocument();
    });

    it('should have indicator dots for each testimonial', () => {
      render(<AboutPage />);
      const indicatorButtons = screen.getAllByRole('button', {
        name: /Go to testimonial/i,
      });
      expect(indicatorButtons.length).toBe(3);
    });

    it('should navigate via indicator dots', () => {
      render(<AboutPage />);
      const indicatorButtons = screen.getAllByRole('button', {
        name: /Go to testimonial/i,
      });
      fireEvent.click(indicatorButtons[1]);
      expect(screen.getByText('Robert Chen')).toBeInTheDocument();
    });

    it('should auto-rotate testimonials', async () => {
      vi.useFakeTimers();
      render(<AboutPage />);

      expect(screen.getByText('Jennifer Lee')).toBeInTheDocument();

      vi.advanceTimersByTime(5000);
      await waitFor(() => {
        expect(screen.getByText('Robert Chen')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should stop auto-rotation when user navigates', () => {
      vi.useFakeTimers();
      render(<AboutPage />);

      const nextButton = screen.getByLabelText('Next testimonial');
      fireEvent.click(nextButton);

      vi.advanceTimersByTime(5000);

      // Should remain on user's selection
      expect(screen.getByText('Robert Chen')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('should wrap around when reaching last testimonial', () => {
      render(<AboutPage />);
      const nextButton = screen.getByLabelText('Next testimonial');

      fireEvent.click(nextButton); // 2nd
      fireEvent.click(nextButton); // 3rd
      fireEvent.click(nextButton); // Back to 1st

      expect(screen.getByText('Jennifer Lee')).toBeInTheDocument();
    });

    it('should have aria-live region for testimonials', () => {
      render(<AboutPage />);
      expect(screen.getByRole('region', { name: 'Client testimonials' })).toBeInTheDocument();
    });
  });

  describe('Timeline Section', () => {
    it('should display timeline heading', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: 'Our Journey' })).toBeInTheDocument();
    });

    it('should display founding year 2023', () => {
      render(<AboutPage />);
      expect(screen.getByText('Company founded with mission')).toBeInTheDocument();
    });

    it('should display all milestone years', () => {
      render(<AboutPage />);
      const yearElements = screen.getAllByText(/^20\d{2}$/);
      expect(yearElements.length).toBeGreaterThan(0);
    });

    it('should have milestone descriptions', () => {
      render(<AboutPage />);
      expect(screen.getByText(/Released open-source/)).toBeInTheDocument();
      expect(screen.getByText(/Reached 500K GitHub/)).toBeInTheDocument();
    });

    it('should have checkmark icons in timeline', () => {
      const { container } = render(<AboutPage />);
      const checkIcons = container.querySelectorAll('svg');
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Recognition Section', () => {
    it('should display recognition heading', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: /Recognition & Achievements/ })).toBeInTheDocument();
    });

    it('should display all recognition items with checkmarks', () => {
      render(<AboutPage />);
      expect(screen.getByText(/Partnered with 50\+/)).toBeInTheDocument();
      expect(screen.getByText(/Analyzed over 10 million/)).toBeInTheDocument();
      expect(screen.getByText(/Reduced bias-related/)).toBeInTheDocument();
    });

    it('should have list role for recognition items', () => {
      render(<AboutPage />);
      const recognitionList = screen.getByRole('list');
      expect(recognitionList).toBeInTheDocument();
    });
  });

  describe('CTA Section', () => {
    it('should display CTA heading', () => {
      render(<AboutPage />);
      expect(
        screen.getByRole('heading', { name: 'Ready to Get Started?' }),
      ).toBeInTheDocument();
    });

    it('should display Contact Us button', () => {
      render(<AboutPage />);
      expect(screen.getByRole('button', { name: /Contact Us/i })).toBeInTheDocument();
    });

    it('should display View Documentation button', () => {
      render(<AboutPage />);
      expect(screen.getByRole('button', { name: /View Documentation/i })).toBeInTheDocument();
    });

    it('should display Try Demo button', () => {
      render(<AboutPage />);
      expect(screen.getByRole('button', { name: /Try Demo/i })).toBeInTheDocument();
    });

    it('Contact Us button should open form modal', () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);
      expect(screen.getByRole('heading', { name: 'Get in Touch' })).toBeInTheDocument();
    });

    it('View Documentation should open new tab', () => {
      render(<AboutPage />);
      const docsButton = screen.getByRole('button', { name: /View Documentation/i });
      fireEvent.click(docsButton);
      expect(global.open).toHaveBeenCalledWith('/docs', '_blank');
    });

    it('Try Demo should open new tab', () => {
      render(<AboutPage />);
      const demoButton = screen.getByRole('button', { name: /Try Demo/i });
      fireEvent.click(demoButton);
      expect(global.open).toHaveBeenCalledWith('/demo', '_blank');
    });
  });

  describe('Contact Form Modal', () => {
    it('should not display form by default', () => {
      render(<AboutPage />);
      expect(screen.queryByRole('heading', { name: 'Get in Touch' })).not.toBeInTheDocument();
    });

    it('should display form when Contact Us clicked', () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);
      expect(screen.getByRole('heading', { name: 'Get in Touch' })).toBeInTheDocument();
    });

    it('should have name input field', () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });

    it('should have email input field', () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('should have message textarea', () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);
      expect(screen.getByLabelText('Message')).toBeInTheDocument();
    });

    it('should have submit button in form', () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);
      expect(screen.getByRole('button', { name: /Send/i })).toBeInTheDocument();
    });

    it('should have close button in form', () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);
      const closeButton = screen.getByRole('button', { name: 'Close' });
      expect(closeButton).toBeInTheDocument();
    });

    it('should close form when close button clicked', () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);
      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);
      expect(screen.queryByRole('heading', { name: 'Get in Touch' })).not.toBeInTheDocument();
    });

    it('should show success message after form submission', async () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);

      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');
      const messageInput = screen.getByLabelText('Message');
      const submitButton = screen.getByRole('button', { name: /Send/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(messageInput, { target: { value: 'Test message' } });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Thanks for reaching out/)).toBeInTheDocument();
      });
    });

    it('should close form after successful submission', async () => {
      vi.useFakeTimers();
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);

      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');
      const messageInput = screen.getByLabelText('Message');
      const submitButton = screen.getByRole('button', { name: /Send/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(messageInput, { target: { value: 'Test message' } });

      fireEvent.click(submitButton);

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(
          screen.queryByRole('heading', { name: 'Get in Touch' }),
        ).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should require name field', () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);
      const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
      expect(nameInput.required).toBe(true);
    });

    it('should require email field', () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      expect(emailInput.required).toBe(true);
      expect(emailInput.type).toBe('email');
    });

    it('should require message field', () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);
      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement;
      expect(messageInput.required).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper page structure with sections', () => {
      render(<AboutPage />);
      const sections = screen.getAllByRole('region');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should have screen reader announcement', () => {
      render(<AboutPage />);
      const announcement = screen.getByRole('status', { hidden: true });
      expect(announcement).toBeInTheDocument();
      expect(announcement).toHaveAttribute('aria-live', 'polite');
    });

    it('should announce testimonials region', () => {
      render(<AboutPage />);
      expect(screen.getByRole('region', { name: 'Client testimonials' })).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(<AboutPage />);
      const h1 = screen.getByRole('heading', { level: 1, name: 'About EthixAI' });
      expect(h1).toBeInTheDocument();
    });

    it('should label value cards with proper text', () => {
      render(<AboutPage />);
      expect(screen.getByText('Financial Institutions')).toBeInTheDocument();
      expect(screen.getByText('Loan Applications Analyzed')).toBeInTheDocument();
    });

    it('should have aria-modal on contact form', async () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have proper form labels', () => {
      render(<AboutPage />);
      const contactButton = screen.getByRole('button', { name: /Contact Us/i });
      fireEvent.click(contactButton);

      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Message')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render responsively', () => {
      const { container } = render(<AboutPage />);
      expect(container.querySelector('.container')).toBeInTheDocument();
    });

    it('should have grid layouts', () => {
      const { container } = render(<AboutPage />);
      const grids = container.querySelectorAll('[class*="grid"]');
      expect(grids.length).toBeGreaterThan(0);
    });
  });

  describe('Content Completeness', () => {
    it('should display all four core values', () => {
      render(<AboutPage />);
      expect(screen.getByText('Trust & Transparency')).toBeInTheDocument();
      expect(screen.getByText('Fairness First')).toBeInTheDocument();
      expect(screen.getByText('Innovation')).toBeInTheDocument();
      expect(screen.getByText('Global Compliance')).toBeInTheDocument();
    });

    it('should mention company purpose', () => {
      render(<AboutPage />);
      expect(
        screen.getByText(/eliminate bias and ensure fairness/),
      ).toBeInTheDocument();
    });

    it('should have team members listed', () => {
      render(<AboutPage />);
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
      expect(screen.getByText('Marcus Johnson')).toBeInTheDocument();
      expect(screen.getByText('Elena Rodriguez')).toBeInTheDocument();
      expect(screen.getByText('David Park')).toBeInTheDocument();
    });

    it('should include company achievements', () => {
      render(<AboutPage />);
      expect(screen.getByText(/50\+ financial institutions/)).toBeInTheDocument();
      expect(screen.getByText(/10 million loan applications/)).toBeInTheDocument();
    });
  });
});
