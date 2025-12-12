import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/layout/breadcrumbs', () => ({ default: () => <div data-testid="breadcrumbs" /> }));
vi.mock('@/components/layout/page-header', () => ({ default: ({ title }: any) => <h1>{title}</h1> }));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPost = vi.fn();
vi.mock('@/lib/api', () => ({ default: { get: (...args: any[]) => mockGet(...args), put: (...args: any[]) => mockPut(...args), post: (...args: any[]) => mockPost(...args) } }));

import ProfilePage from '@/app/account/profile/page';

describe('ProfilePage', () => {
  beforeEach(() => { mockGet.mockReset(); mockPut.mockReset(); mockPost.mockReset(); toast.mockReset(); });

  it('loads and saves profile', async () => {
    mockGet.mockResolvedValueOnce({ data: { name: 'Alice', email: 'alice@example.com' } });
    mockPut.mockResolvedValueOnce({});
    render(<ProfilePage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alice2' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/v1/users/me', { name: 'Alice2', email: 'alice@example.com' }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
  });

  it('changes password', async () => {
    mockGet.mockResolvedValueOnce({ data: { name: 'Bob', email: 'bob@example.com' } });
    mockPost.mockResolvedValueOnce({});
    render(<ProfilePage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'NewPass123!' } });
    fireEvent.click(screen.getByText('Update password'));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/v1/users/me/password', { password: 'NewPass123!' }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
  });

  it('shows toast on load error', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    render(<ProfilePage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() => expect(toast).toHaveBeenCalled());
  });
});
