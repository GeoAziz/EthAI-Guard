/// <reference types="vitest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import CreateDatasetModal from '@/components/datasets/CreateDatasetModal';

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn()
  }
}));

import api from '@/lib/api';

test('creates dataset and calls onCreated', async () => {
  (api.post as any).mockResolvedValueOnce({ data: { datasetId: 'ds-123' } });

  const onCreated = vi.fn();
  const onClose = vi.fn();

  render(<CreateDatasetModal onCreated={onCreated} onClose={onClose} />);

  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'Test dataset' } });

  const btn = screen.getByText('Create');
  fireEvent.click(btn);

  await waitFor(() => {
    expect(onCreated).toHaveBeenCalledWith('ds-123');
  });
});
