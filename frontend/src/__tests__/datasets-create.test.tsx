/// <reference types="vitest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import CreateDatasetModal from '@/components/datasets/CreateDatasetModal';

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

import api from '@/lib/api';

test('creates dataset and calls onCreated', async () => {
  (api.post as any).mockResolvedValueOnce({ data: { datasetId: 'ds-123' } });

  const onCreated = vi.fn();
  const onClose = vi.fn();

  render(<CreateDatasetModal onCreated={onCreated} onClose={onClose} />);

  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'Test dataset' } });

  // choose retention (programmatically associated label)
  const retention = screen.getByLabelText('Retention');
  fireEvent.change(retention, { target: { value: '30' } });

  const btn = screen.getByText('Create');
  fireEvent.click(btn);

  await waitFor(() => {
    expect(onCreated).toHaveBeenCalledWith('ds-123');
    // ensure api.post was called with retention_days
    expect((api.post as any)).toHaveBeenCalledWith('/v1/datasets', expect.objectContaining({ name: 'Test dataset', retention_days: 30 }));
  });
});
