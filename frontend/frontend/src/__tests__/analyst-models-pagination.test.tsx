import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import type { Mock } from 'vitest';

// Mock RoleProtected to render children directly
vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => <div>{children}</div> }));
// Mock Breadcrumbs
vi.mock('@/components/layout/breadcrumbs', () => ({ default: () => <div data-testid="breadcrumbs" /> }));
// Mock PageHeader
vi.mock('@/components/layout/page-header', () => ({ default: ({ title }: any) => <h1>{title}</h1> }));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

// Mock api
vi.mock('@/lib/api');
import api from '@/lib/api';

import AnalystModelsPage from '@/app/dashboard/analyst/models/page';

describe('Analyst Models Registry pagination', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('happy path: renders models with pagination controls and navigates pages', async () => {
    // Initial page 1
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        items: [
          { id: 'm1', name: 'ModelA', version: '1.0.0', active: true, createdAt: '2025-12-01' },
          { id: 'm2', name: 'ModelB', version: '2.0.0', active: false, createdAt: '2025-12-02' },
        ],
        total: 22,
      },
    });

    render(<AnalystModelsPage />);

    // Wait for models to render
    await waitFor(() => {
      expect(screen.getByText('ModelA')).toBeInTheDocument();
      expect(screen.getByText('ModelB')).toBeInTheDocument();
    });

    // Verify pagination footer shows page 1, total count
    expect(screen.getByText(/Showing page 1 — 2 of 22/i)).toBeInTheDocument();

    // Numeric page buttons should render (total is known)
    const page1Btn = screen.getByRole('button', { name: '1' });
    expect(page1Btn).toBeDisabled(); // current page
    const page2Btn = screen.getByRole('button', { name: '2' });
    expect(page2Btn).toBeEnabled();

    // Prepare page 2 response and click Next
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        items: [
          { id: 'm11', name: 'ModelK', version: '3.0.0', active: true, createdAt: '2025-12-03' },
        ],
        total: 22,
      },
    });
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/v1/models?page=2&limit=10');
      expect(screen.getByText('ModelK')).toBeInTheDocument();
    });

    // Page 2 should now be disabled
    const updatedPage2Btn = screen.getByRole('button', { name: '2' });
    expect(updatedPage2Btn).toBeDisabled();
  });

  it('empty state: shows No models found when API returns empty', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { items: [], total: 0 } });

    render(<AnalystModelsPage />);

    expect(await screen.findByText('Models registry')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('No models found')).toBeInTheDocument());
  });

  it('page-size selector behavior: changes limit and resets to page 1', async () => {
    // Initial load with limit=10
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        items: Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, name: `Model${i}`, version: '1.0', active: true })),
        total: 100,
      },
    });

    render(<AnalystModelsPage />);

    await waitFor(() => expect(screen.getByText('Model0')).toBeInTheDocument());
    expect(screen.getByText(/Showing page 1 — 10 of 100/i)).toBeInTheDocument();

    // Change page size to 20
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        items: Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, name: `Model${i}`, version: '1.0', active: true })),
        total: 100,
      },
    });

    const pageSizeSelect = screen.getByLabelText('Page size:');
    fireEvent.change(pageSizeSelect, { target: { value: '20' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/v1/models?page=1&limit=20');
      expect(screen.getByText(/Showing page 1 — 20 of 100/i)).toBeInTheDocument();
    });
  });

  it('numeric buttons render only when total is present', async () => {
    // Return array (no total)
    (api.get as Mock).mockResolvedValueOnce({
      data: [
        { id: 'm1', name: 'ModelA', version: '1.0.0', active: true },
        { id: 'm2', name: 'ModelB', version: '2.0.0', active: false },
      ],
    });

    render(<AnalystModelsPage />);

    await waitFor(() => expect(screen.getByText('ModelA')).toBeInTheDocument());

    // No numeric buttons because total is null
    expect(screen.queryByRole('button', { name: '1' })).toBeNull();
    expect(screen.queryByRole('button', { name: '2' })).toBeNull();

    // Previous/Next should still render
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    (api.get as Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<AnalystModelsPage />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to load models', variant: 'destructive' })
      );
    });

    // Should show empty state or no table
    expect(screen.getByText('No models found')).toBeInTheDocument();
  });
});
