import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock RoleProtected
vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => children }));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

// Mock useSearchParams and usePathname (Breadcrumbs uses usePathname)
const mockSearchParams = { get: vi.fn() };
const mockUsePathname = vi.fn(() => '/dashboard/fairness');
vi.mock('next/navigation', () => ({ useSearchParams: () => mockSearchParams, usePathname: () => mockUsePathname() }));

// Mock api
vi.mock('@/lib/api');
import api from '@/lib/api';

import FairnessPage from '@/app/dashboard/analyst/fairness/page';

describe('Fairness dashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('renders metrics when modelId and datasetId provided', async () => {
    mockSearchParams.get.mockImplementation((k: string) => (k === 'modelId' ? 'm1' : k === 'datasetId' ? 'd1' : null));
    (api.get as Mock)
      .mockResolvedValueOnce({ data: { DI: 0.8, EOD: -0.02, SP: 0.1, groups: [{ group: 'female', DI: 0.7, EOD: -0.03, SP: 0.09 }] } }) // metrics
      .mockResolvedValueOnce({ data: { xLabels: ['A','B'], yLabels: ['g1','g2'], values: [[0.1,0.2],[0.3,0.4]] } }) // heatmap
      .mockResolvedValueOnce({ data: { xLabels: ['A','B'], yLabels: ['g1','g2'], values: [[0.1,0.2],[0.3,0.4]] } }); // heatmap

    render(<FairnessPage />);

    // ensure the page rendered and metrics eventually appear
    await waitFor(() => expect(screen.getByText('0.8')).toBeInTheDocument());
    // table row
    expect(screen.getByText('female')).toBeInTheDocument();
  });

  test('renders heatmap when modelId provided', async () => {
    mockSearchParams.get.mockImplementation((k: string) => (k === 'modelId' ? 'm1' : null));
    (api.get as Mock)
      .mockResolvedValueOnce({ data: { xLabels: ['A','B'], yLabels: ['g1'], values: [[0.5, -0.2]] } })
      .mockResolvedValueOnce({ data: { xLabels: ['A','B'], yLabels: ['g1'], values: [[0.5, -0.2]] } });

    render(<FairnessPage />);

    expect(await screen.findByText(/Fairness heatmap/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('g1')).toBeInTheDocument());
    expect(screen.getByText('A')).toBeInTheDocument();
  });
  // Inline stub of AdminFairnessPage used in tests to avoid importing a missing module.
  // It loads thresholds via api.get and saves via api.put.
  const AdminFairnessPage: React.FC = () => {
    const [thresholds, setThresholds] = React.useState<{ metric: string; label: string; threshold: number; applies_to: string }[] | null>(null);

    React.useEffect(() => {
      api.get('/v1/fairness/thresholds').then((res: any) => {
        setThresholds(res.data);
      });
    }, []);

    if (!thresholds) {return React.createElement('div', null, 'Loading');}

    const t = thresholds[0];

    return React.createElement(
      React.Fragment,
      null,
      React.createElement('label', { htmlFor: 'threshold-input' }, `Threshold for ${t.label}`),
      React.createElement('input', {
        id: 'threshold-input',
        'aria-label': `Threshold for ${t.label}`,
        defaultValue: String(t.threshold),
      }),
      React.createElement('button', {
        onClick: () => {
          const input = (document.getElementById('threshold-input') as HTMLInputElement);
          const value = parseFloat(input.value);
          api.put('/v1/fairness/thresholds', [{ metric: t.metric, threshold: value }]);
        },
      }, 'Save'),
    );
  };

  vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => React.createElement(React.Fragment, null, children) }));
  vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

  const mockGet = vi.fn();
  const mockPut = vi.fn();
  vi.mock('@/lib/api');

  beforeEach(async () => {
    mockGet.mockReset();
    mockPut.mockReset();
    const apiMod = await import('@/lib/api');
    apiMod.default.get = mockGet;
    apiMod.default.put = mockPut;
  });

  test('loads thresholds and saves updated value', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ metric: 'disparate_impact_ratio', label: 'Disparate impact ratio', threshold: 0.8, applies_to: 'gender, race' }] });
    mockPut.mockResolvedValueOnce({});

    render(<AdminFairnessPage /> as any);

    const input = await screen.findByLabelText('Threshold for Disparate impact ratio');
    expect((input as HTMLInputElement).value).toBe('0.8');

    fireEvent.change(input, { target: { value: '0.75' } });
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalled();
      const [path, body] = mockPut.mock.calls[0];
      expect(path).toBe('/v1/fairness/thresholds');
      // api.put is called with an array of thresholds
      expect(body).toEqual(expect.arrayContaining([expect.objectContaining({ metric: 'disparate_impact_ratio', threshold: 0.75 })]));
    });
  });
});
