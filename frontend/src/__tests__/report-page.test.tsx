import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Import the page component (relative to src)
import ReportPage from '@/app/report/[id]/page';

// Mock the api module used by the page
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { report: { summary: { n_rows: 10 }, explanation_plot: null } } })),
  },
}));

// Stub heavy child components that rely on browser-only APIs
vi.mock('@/components/dashboard/fairness-charts', () => ({
  FairnessCharts: () => React.createElement('div', null, 'Fairness Charts'),
}));

describe('Report page', () => {
  it('shows loading and then the report content', async () => {
    render(<ReportPage params={{ id: 'test-id' }} /> as any);
    expect(screen.getByText(/Loading report/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/Loading report/i)).not.toBeInTheDocument());
    const fairness = screen.getAllByText(/Fairness Charts/i);
    expect(fairness.length).toBeGreaterThan(0);
  });
});
