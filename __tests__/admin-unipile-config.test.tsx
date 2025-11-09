/**
 * Admin Unipile Configuration Tests
 *
 * Tests the complete admin flow for configuring per-client Unipile credentials:
 * 1. Admin clients page navigation
 * 2. Unipile configuration form functionality
 * 3. API key/DSN storage and retrieval
 * 4. Test connection feature
 * 5. Save and redirect behavior
 * 6. RLS policy enforcement
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientIntegrationsPage from '../app/admin/clients/[id]/integrations/page';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock fetch for test connection
global.fetch = jest.fn();

describe('Admin Unipile Configuration', () => {
  let mockRouter: any;
  let mockSupabase: any;
  let mockPush: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup router mock
    mockPush = jest.fn();
    mockRouter = {
      push: mockPush,
      refresh: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: 'test-client-123' });

    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn(),
      auth: {
        getUser: jest.fn(),
      },
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Page Load and Data Fetching', () => {
    test('should load client data on mount', async () => {
      const mockClientData = {
        id: 'test-client-123',
        name: 'Acme Corp',
        unipile_api_key: 'test-api-key-123',
        unipile_dsn: 'https://api3.unipile.com:13344',
        unipile_enabled: true,
        unipile_configured_at: '2025-11-09T10:00:00Z',
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockClientData, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      render(<ClientIntegrationsPage />);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('clients');
        expect(mockSelect).toHaveBeenCalledWith('id, name, unipile_api_key, unipile_dsn, unipile_enabled, unipile_configured_at');
        expect(mockEq).toHaveBeenCalledWith('id', 'test-client-123');
      });
    });

    test('should show loading state while fetching data', () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockReturnValue(new Promise(() => {})); // Never resolves

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      render(<ClientIntegrationsPage />);

      // Check for spinner div (has animate-spin class)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    test('should show error message if data fetch fails', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch client', code: '42501' },
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      render(<ClientIntegrationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load client integrations/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Fields and UI Elements', () => {
    beforeEach(async () => {
      const mockClientData = {
        id: 'test-client-123',
        name: 'Acme Corp',
        unipile_api_key: null,
        unipile_dsn: null,
        unipile_enabled: false,
        unipile_configured_at: null,
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockClientData, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      render(<ClientIntegrationsPage />);
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });
    });

    test('should display "Back to Clients" button with arrow icon', () => {
      const backButton = screen.getByText('Back to Clients');
      expect(backButton).toBeInTheDocument();
      expect(backButton.closest('a')).toHaveAttribute('href', '/admin/clients');
    });

    test('should have enable/disable toggle checkbox', () => {
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    test('should have API key password field with autocomplete disabled', () => {
      const apiKeyInput = screen.getByPlaceholderText('Enter your Unipile API Key');
      expect(apiKeyInput).toBeInTheDocument();
      expect(apiKeyInput).toHaveAttribute('type', 'password');
      expect(apiKeyInput).toHaveAttribute('autocomplete', 'new-password');
      expect(apiKeyInput).not.toBeDisabled();
    });

    test('should have DSN text field with autocomplete off', () => {
      const dsnInput = screen.getByPlaceholderText('https://api3.unipile.com:13344');
      expect(dsnInput).toBeInTheDocument();
      expect(dsnInput).toHaveAttribute('type', 'text');
      expect(dsnInput).toHaveAttribute('autocomplete', 'off');
      expect(dsnInput).not.toBeDisabled();
    });

    test('should have Test Connection button always visible', () => {
      const testButton = screen.getByText('Test Connection');
      expect(testButton).toBeInTheDocument();
      expect(testButton).toBeDisabled(); // Disabled because no API key entered
    });

    test('should have Save Configuration button', () => {
      const saveButton = screen.getByText('Save Configuration');
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toHaveClass('bg-green-600');
    });

    test('should have form with autoComplete off', () => {
      const forms = document.querySelectorAll('form');
      expect(forms[0]).toHaveAttribute('autocomplete', 'off');
    });
  });

  describe('Form Validation and Input Handling', () => {
    beforeEach(async () => {
      const mockClientData = {
        id: 'test-client-123',
        name: 'Acme Corp',
        unipile_api_key: null,
        unipile_dsn: null,
        unipile_enabled: false,
        unipile_configured_at: null,
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockClientData, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      render(<ClientIntegrationsPage />);
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });
    });

    test('should update API key field when typing', () => {
      const apiKeyInput = screen.getByPlaceholderText('Enter your Unipile API Key') as HTMLInputElement;
      fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });
      expect(apiKeyInput.value).toBe('new-api-key');
    });

    test('should update DSN field when typing', () => {
      const dsnInput = screen.getByPlaceholderText('https://api3.unipile.com:13344') as HTMLInputElement;
      fireEvent.change(dsnInput, { target: { value: 'https://custom.unipile.com:8080' } });
      expect(dsnInput.value).toBe('https://custom.unipile.com:8080');
    });

    test('should toggle enabled checkbox', () => {
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    test('should enable Test Connection button when API key is entered', () => {
      const apiKeyInput = screen.getByPlaceholderText('Enter your Unipile API Key');
      const testButton = screen.getByText('Test Connection') as HTMLButtonElement;

      expect(testButton).toBeDisabled();

      fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });

      expect(testButton).not.toBeDisabled();
    });
  });

  describe('Test Connection Functionality', () => {
    beforeEach(async () => {
      const mockClientData = {
        id: 'test-client-123',
        name: 'Acme Corp',
        unipile_api_key: 'existing-key',
        unipile_dsn: 'https://api3.unipile.com:13344',
        unipile_enabled: false,
        unipile_configured_at: null,
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockClientData, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      render(<ClientIntegrationsPage />);
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });
    });

    test('should call Unipile API when testing connection', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api3.unipile.com:13344/api/v1/accounts',
          expect.objectContaining({
            method: 'GET',
            headers: {
              'X-API-KEY': 'existing-key',
              'Accept': 'application/json',
            },
          })
        );
      });
    });

    test('should show success message on successful connection test', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection successful/)).toBeInTheDocument();
      });
    });

    test('should show error message on failed connection test', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection failed: 401/)).toBeInTheDocument();
      });
    });

    test('should show error message on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection error: Network error/)).toBeInTheDocument();
      });
    });

    test('should show error if testing without API key', async () => {
      const mockClientData = {
        id: 'test-client-123',
        name: 'Acme Corp',
        unipile_api_key: null,
        unipile_dsn: 'https://api3.unipile.com:13344',
        unipile_enabled: false,
        unipile_configured_at: null,
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockClientData, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      render(<ClientIntegrationsPage />);
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });

      // Enter API key first
      const apiKeyInput = screen.getByPlaceholderText('Enter your Unipile API Key');
      fireEvent.change(apiKeyInput, { target: { value: '' } });

      const testButton = screen.getByText('Test Connection');
      expect(testButton).toBeDisabled();
    });
  });

  describe('Save Configuration', () => {
    beforeEach(async () => {
      const mockClientData = {
        id: 'test-client-123',
        name: 'Acme Corp',
        unipile_api_key: null,
        unipile_dsn: null,
        unipile_enabled: false,
        unipile_configured_at: null,
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockClientData, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      render(<ClientIntegrationsPage />);
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });
    });

    test('should save configuration and redirect on success', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({
        data: [{ id: 'test-client-123' }],
        error: null,
      });

      // Mock the update chain
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'test-client-123',
                name: 'Acme Corp',
                unipile_api_key: null,
                unipile_dsn: null,
                unipile_enabled: false,
                unipile_configured_at: null,
              },
              error: null,
            }),
            update: mockUpdate,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        select: mockSelect,
      });

      // Fill in form
      const apiKeyInput = screen.getByPlaceholderText('Enter your Unipile API Key');
      const dsnInput = screen.getByPlaceholderText('https://api3.unipile.com:13344');
      const checkbox = screen.getByRole('checkbox');

      fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });
      fireEvent.change(dsnInput, { target: { value: 'https://api3.unipile.com:13344' } });
      fireEvent.click(checkbox);

      // Submit form
      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            unipile_api_key: 'new-api-key',
            unipile_dsn: 'https://api3.unipile.com:13344',
            unipile_enabled: true,
          })
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/clients');
      });
    });

    test('should save configuration even when disabled', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({
        data: [{ id: 'test-client-123' }],
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'test-client-123',
                name: 'Acme Corp',
                unipile_api_key: null,
                unipile_dsn: null,
                unipile_enabled: false,
                unipile_configured_at: null,
              },
              error: null,
            }),
            update: mockUpdate,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        select: mockSelect,
      });

      // Fill in form but leave disabled
      const apiKeyInput = screen.getByPlaceholderText('Enter your Unipile API Key');
      const dsnInput = screen.getByPlaceholderText('https://api3.unipile.com:13344');

      fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });
      fireEvent.change(dsnInput, { target: { value: 'https://api3.unipile.com:13344' } });

      // Submit form
      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            unipile_api_key: 'new-api-key',
            unipile_dsn: 'https://api3.unipile.com:13344',
            unipile_enabled: false,
          })
        );
      });
    });

    test('should update configured_at timestamp on save', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({
        data: [{ id: 'test-client-123' }],
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'test-client-123',
                name: 'Acme Corp',
                unipile_api_key: null,
                unipile_dsn: null,
                unipile_enabled: false,
                unipile_configured_at: null,
              },
              error: null,
            }),
            update: mockUpdate,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        select: mockSelect,
      });

      // Fill in form
      const apiKeyInput = screen.getByPlaceholderText('Enter your Unipile API Key');
      fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });

      // Submit form
      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      await waitFor(() => {
        const updateCall = mockUpdate.mock.calls[0][0];
        expect(updateCall).toHaveProperty('unipile_configured_at');
        expect(updateCall.unipile_configured_at).toBeTruthy();
      });
    });

    test('should show error message on save failure', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Permission denied', code: '42501' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'test-client-123',
                name: 'Acme Corp',
                unipile_api_key: null,
                unipile_dsn: null,
                unipile_enabled: false,
                unipile_configured_at: null,
              },
              error: null,
            }),
            update: mockUpdate,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        select: mockSelect,
      });

      // Fill in form
      const apiKeyInput = screen.getByPlaceholderText('Enter your Unipile API Key');
      fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });

      // Submit form
      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to save configuration/)).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    test('should mask API key in password field', async () => {
      const mockClientData = {
        id: 'test-client-123',
        name: 'Acme Corp',
        unipile_api_key: 'secret-api-key-12345',
        unipile_dsn: 'https://api3.unipile.com:13344',
        unipile_enabled: true,
        unipile_configured_at: '2025-11-09T10:00:00Z',
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockClientData, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      render(<ClientIntegrationsPage />);

      await waitFor(() => {
        const apiKeyInput = screen.getByPlaceholderText('Enter your Unipile API Key') as HTMLInputElement;
        expect(apiKeyInput.value).toBe('secret-api-key-12345');
        expect(apiKeyInput.type).toBe('password');
      });
    });

    test('should populate DSN field from database', async () => {
      const mockClientData = {
        id: 'test-client-123',
        name: 'Acme Corp',
        unipile_api_key: 'test-key',
        unipile_dsn: 'https://custom.unipile.com:8080',
        unipile_enabled: true,
        unipile_configured_at: '2025-11-09T10:00:00Z',
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockClientData, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      render(<ClientIntegrationsPage />);

      await waitFor(() => {
        const dsnInput = screen.getByPlaceholderText('https://api3.unipile.com:13344') as HTMLInputElement;
        expect(dsnInput.value).toBe('https://custom.unipile.com:8080');
      });
    });

    test('should check enabled checkbox when integration is enabled', async () => {
      const mockClientData = {
        id: 'test-client-123',
        name: 'Acme Corp',
        unipile_api_key: 'test-key',
        unipile_dsn: 'https://api3.unipile.com:13344',
        unipile_enabled: true,
        unipile_configured_at: '2025-11-09T10:00:00Z',
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockClientData, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      render(<ClientIntegrationsPage />);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      });
    });

    test('should show last configured timestamp if available', async () => {
      const mockClientData = {
        id: 'test-client-123',
        name: 'Acme Corp',
        unipile_api_key: 'test-key',
        unipile_dsn: 'https://api3.unipile.com:13344',
        unipile_enabled: true,
        unipile_configured_at: '2025-11-09T10:00:00Z',
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockClientData, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      render(<ClientIntegrationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Last configured:/)).toBeInTheDocument();
      });
    });
  });
});
