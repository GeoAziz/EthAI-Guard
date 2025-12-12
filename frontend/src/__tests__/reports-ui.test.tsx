import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RiskBadge from '@/components/report/RiskBadge';
import ReportActions from '@/components/report/ReportActions';

describe('RiskBadge', () => {
  it('renders low/medium/high badges', () => {
    const { container: c1 } = render(<RiskBadge risk="low" /> as any);
    expect(c1.textContent).toContain('Low');
    const { container: c2 } = render(<RiskBadge risk="medium" /> as any);
    expect(c2.textContent).toContain('Medium');
    const { container: c3 } = render(<RiskBadge risk="high" /> as any);
    expect(c3.textContent).toContain('High');
  });
});

describe('downloadJSON helper', () => {
  beforeEach(() => {
    // mock fetch for report
    global.fetch = vi.fn((url) => {
      return Promise.resolve({ json: () => Promise.resolve({ report: { id: 'r1', summary: { a: 1 } } }) });
    }) as any;
    // spy on createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob://1') as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches report and triggers download', async () => {
    const { getByText } = render(<ReportActions reportId="r1" /> as any);
    const btn = getByText('Download JSON');
    fireEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect((URL.createObjectURL as any)).toHaveBeenCalled();
  });
});
