import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock role protection to render children directly
vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => children }));
// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
// Mock navigation hooks used by Breadcrumbs and page
const mockSearchParams = { get: vi.fn() };
const mockUsePathname = vi.fn(() => '/dashboard/analyst/fairness');
vi.mock('next/navigation', () => ({ useSearchParams: () => mockSearchParams, usePathname: () => mockUsePathname() }));

// Mock api
vi.mock('@/lib/api');
import api from '@/lib/api';

import FairnessPage from '@/app/dashboard/analyst/fairness/page';

describe('Analyst Fairness events pagination', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSearchParams.get.mockImplementation(() => null);
  });

  test('happy path: renders events with pagination controls', async () => {
    // Mock by URL to avoid call-order fragility
    (api.get as Mock).mockImplementation((path: string) => {
      if (path.includes('/v1/fairness/events')) {
        return Promise.resolve({ data: { items: [
          { id: 'e1', timestamp: '2025-12-01', modelId: 'm1', datasetId: 'd1', type: 'DI_ALERT', severity: 'high' },
          { id: 'e2', timestamp: '2025-12-02', modelId: 'm2', datasetId: 'd2', type: 'SP_WARN', severity: 'medium' },
        ], total: 12 } });
      }
      return Promise.resolve({ data: { xLabels: [], yLabels: [], values: [] } });
    });

    render(<FairnessPage />);

    // Table should render with rows
    await waitFor(() => {
      expect(screen.getByText('Recent fairness events')).toBeInTheDocument();
      expect(screen.getByText('2025-12-01')).toBeInTheDocument();
      expect(screen.getByText('2025-12-02')).toBeInTheDocument();
    });

    // Pagination footer text
    expect(screen.getByText(/Showing page 1/i)).toBeInTheDocument();

    // Numeric buttons appear when total provided
    const page1Btn = screen.getByRole('button', { name: '1' });
    expect(page1Btn).toBeDisabled();
    const page2Btn = screen.getByRole('button', { name: '2' });
    expect(page2Btn).toBeEnabled();
  });

  test('empty state: shows No events when API returns empty', async () => {
    (api.get as Mock).mockImplementation((path: string) => {
      if (path.includes('/v1/fairness/events')) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      return Promise.resolve({ data: { xLabels: [], yLabels: [], values: [] } });
    });

    render(<FairnessPage />);

    expect(await screen.findByText('Recent fairness events')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('No events')).toBeInTheDocument());
  });

  test('page-size selector behavior: changes limit and resets to page 1', async () => {
    let lastLimit = 10;
    (api.get as Mock).mockImplementation((path: string) => {
      if (path.includes('/v1/fairness/events')) {
        const is20 = path.includes('limit=20');
        lastLimit = is20 ? 20 : 10;
        return Promise.resolve({ data: { items: Array.from({ length: lastLimit }, (_, i) => ({ id: `e${i}`, timestamp: `2025-12-${i+1}`, severity: 'low' })), total: 100 } });
      }
      return Promise.resolve({ data: { xLabels: [], yLabels: [], values: [] } });
    });

    render(<FairnessPage />);

    // initial render
    expect(await screen.findByText('Recent fairness events')).toBeInTheDocument();
    // change page size to 20
    const pageSize = screen.getByLabelText('Page size:');
    fireEvent.change(pageSize, { target: { value: '20' } });

    // Next events fetch resolves with 20 items and total unchanged
    await waitFor(() => {
      expect(screen.getByText(/Showing page 1 — 20 of 100/)).toBeInTheDocument();
    });
  });

  test('numeric buttons render only when total present', async () => {
    (api.get as Mock).mockImplementation((path: string) => {
      if (path.includes('/v1/fairness/events')) {
        return Promise.resolve({ data: [
          { id: 'e1', timestamp: '2025-12-01', severity: 'low' },
          { id: 'e2', timestamp: '2025-12-02', severity: 'low' },
        ] });
      }
      return Promise.resolve({ data: { xLabels: [], yLabels: [], values: [] } });
    });

    render(<FairnessPage />);

    await waitFor(() => expect(screen.getByText('2025-12-01')).toBeInTheDocument());
    // No numeric buttons because total is null in array response
    expect(screen.queryByRole('button', { name: '2' })).toBeNull();
  });
});
