import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ReportsIndexClient from '@/app/report/ReportsIndexClient';

// Avoid hoisting issues: mock module and assign spies in beforeEach
const mockGet = vi.fn();
vi.mock('@/lib/api');

describe('Reports index page', () => {
  beforeEach(async () => {
    mockGet.mockReset();
    const apiMod = await import('@/lib/api');
    apiMod.default.get = mockGet;
  });

  it('renders a list of reports and links to report pages', async () => {
    const reports = [
      { id: 'r1', title: 'Report One', createdAt: new Date().toISOString(), owner: 'alice' },
      { id: 'r2', title: 'Report Two', createdAt: new Date().toISOString(), owner: 'bob' },
    ];
    mockGet.mockResolvedValue({ data: { items: reports } });

    render(<ReportsIndexClient /> as any);

    // Wait for both reports to render
    await waitFor(() => expect(screen.getByText('Report One')).toBeInTheDocument());
    expect(screen.getByText('Report Two')).toBeInTheDocument();

    // Each report should have a "View report" button
    const viewButtons = screen.getAllByText(/View report/i);
    expect(viewButtons.length).toBeGreaterThanOrEqual(2);
  });
});
