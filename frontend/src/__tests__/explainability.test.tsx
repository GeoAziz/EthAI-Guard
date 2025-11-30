import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { expect, vi, beforeEach, describe, test } from 'vitest';

// Mock RoleProtected to just render children
vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => children }));

// Mock useToast to avoid UI effects
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

// Create a mutable mock for useSearchParams and provide a simple usePathname
const mockSearchParams = { get: vi.fn() };
vi.mock('next/navigation', () => ({ useSearchParams: () => mockSearchParams, usePathname: () => '/explainability' }));
// Mock layout pieces that rely on next/navigation or SSR features
vi.mock('@/components/layout/breadcrumbs', () => ({ default: () => <div data-testid="breadcrumbs" /> }));
vi.mock('@/components/layout/page-header', () => ({ default: ({ title }: any) => <h1>{title}</h1> }));

// Mock the api client
vi.mock('@/lib/api');
import api from '@/lib/api';

import ExplainabilityPage from '@/app/explainability/page';

describe('Explainability page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('renders global SHAP features when modelId and datasetId provided', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'modelId') {return 'm1';}
      if (key === 'datasetId') {return 'd1';}
      return null;
    });

    // Mock api.get for global endpoint
    vi.mocked(api.get).mockResolvedValueOnce({ data: { features: [{ feature: 'age', mean_abs_shap: 0.12 }, { feature: 'income', mean_abs_shap: 0.34 }] } });

    render(<ExplainabilityPage />);

    expect(await screen.findByText(/Global feature importance/i)).toBeInTheDocument();

    // Wait for fetched feature to appear
    await waitFor(() => expect(screen.getByText('age')).toBeInTheDocument());
    expect(screen.getByText('income')).toBeInTheDocument();
  });

  test('renders local contributions when reportId provided', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'reportId') {return 'r1';}
      return null;
    });

    vi.mocked(api.get).mockResolvedValueOnce({ data: { contributions: [{ feature: 'age', contribution: -0.12 }, { feature: 'income', contribution: 0.34 }] } });

    render(<ExplainabilityPage />);

    expect(await screen.findByText(/Local explanation/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('age')).toBeInTheDocument());
    expect(screen.getByText('-0.12')).toBeInTheDocument();
    expect(screen.getByText('income')).toBeInTheDocument();
  });
});
