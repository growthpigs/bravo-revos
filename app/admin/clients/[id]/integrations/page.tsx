'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ClientIntegrations {
  id: string;
  name: string;
  unipile_api_key: string | null;
  unipile_dsn: string | null;
  unipile_enabled: boolean;
  unipile_configured_at: string | null;
}

export default function ClientIntegrationsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientIntegrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [dsn, setDsn] = useState('https://api3.unipile.com:13344');
  const [enabled, setEnabled] = useState(false);

  // Clear error/success messages when user starts editing
  const handleFieldChange = () => {
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const loadClientIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('client')
        .select('id, name, unipile_api_key, unipile_dsn, unipile_enabled, unipile_configured_at')
        .eq('id', clientId)
        .single();

      if (error) {
        setError(`Failed to load client: ${error.message}`);
        return;
      }

      if (data) {
        setClient(data);
        setApiKey(data.unipile_api_key || '');
        setDsn(data.unipile_dsn || 'https://api3.unipile.com:13344');
        setEnabled(data.unipile_enabled || false);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading client:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, supabase]);

  useEffect(() => {
    loadClientIntegrations();
  }, [loadClientIntegrations]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    setTestResult(null);

    try {
      // Validate DSN format if provided
      if (dsn && dsn.trim()) {
        try {
          new URL(dsn);
        } catch {
          setError('Invalid DSN format. Please enter a valid URL (e.g., https://api3.unipile.com:13344)');
          setSaving(false);
          return;
        }
      }

      // Save credentials (regardless of enabled state)
      const { error } = await supabase
        .from('client')
        .update({
          unipile_api_key: apiKey || null,
          unipile_dsn: dsn || null,
          unipile_enabled: enabled,
          unipile_configured_at: new Date().toISOString(),
        })
        .eq('id', clientId);

      if (error) {
        setError(`Failed to save: ${error.message}`);
        return;
      }

      // Show brief success message before redirect
      setSuccess('Configuration saved successfully');

      // Redirect after short delay for user to see success message
      setTimeout(() => {
        router.push('/admin/clients');
      }, 800);
    } catch (err) {
      setError('An unexpected error occurred while saving');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      setTestResult({ success: false, message: 'Please enter an API Key first' });
      return;
    }

    if (!dsn) {
      setTestResult({ success: false, message: 'Please enter a DSN first' });
      return;
    }

    // Validate DSN format
    try {
      new URL(dsn);
    } catch {
      setTestResult({ success: false, message: 'Invalid DSN format. Please enter a valid URL.' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      // Test connection via direct fetch to Unipile API
      // Note: This may fail with CORS in some browsers. If issues persist,
      // consider proxying through /api/unipile/test-connection
      const response = await fetch(
        `${dsn}/api/v1/accounts`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': apiKey,
            'Accept': 'application/json',
          },
        }
      );

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Connection successful! Unipile API is reachable.',
        });
      } else {
        setTestResult({
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Connection error: ${err instanceof Error ? err.message : 'Network error'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Clients</span>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Configuration</h1>
        {client && <p className="text-gray-600 mt-2">Client: {client.name}</p>}
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div role="status" aria-live="polite" className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {testResult && (
        <div
          role={testResult.success ? "status" : "alert"}
          aria-live="polite"
          className={`mb-6 p-4 rounded-md border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
        >
          <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
            {testResult.message}
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6" autoComplete="off">
        {/* Enable/Disable Toggle */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Unipile Integration</h3>
              <p className="text-sm text-gray-600 mt-1">
                Configure this client&apos;s Unipile account for LinkedIn automation
              </p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-900">
            Unipile API Key {enabled && <span className="text-red-500">*</span>}
          </label>
          <p className="text-sm text-gray-600 mt-1">
            Get this from your Unipile Dashboard
          </p>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              handleFieldChange();
            }}
            placeholder="Enter your Unipile API Key"
            autoComplete="new-password"
            aria-required={enabled ? "true" : "false"}
            aria-invalid={error ? "true" : "false"}
            className="mt-3 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {apiKey && (
            <p className="text-xs text-gray-500 mt-2">
              Stored securely in database
            </p>
          )}
        </div>

        {/* DSN */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <label htmlFor="dsn" className="block text-sm font-medium text-gray-900">
            Unipile DSN (API Endpoint) {enabled && <span className="text-red-500">*</span>}
          </label>
          <p className="text-sm text-gray-600 mt-1">
            The Unipile API endpoint URL for this account
          </p>
          <input
            id="dsn"
            type="url"
            value={dsn}
            onChange={(e) => {
              setDsn(e.target.value);
              handleFieldChange();
            }}
            placeholder="https://api3.unipile.com:13344"
            autoComplete="off"
            aria-required={enabled ? "true" : "false"}
            aria-invalid={error ? "true" : "false"}
            className="mt-3 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Test Connection Button */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !apiKey}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Test your Unipile API credentials (enter API key first)
          </p>
        </div>

        {/* Save Button */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* Info Box */}
        {client?.unipile_configured_at && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Last configured:</strong> {new Date(client.unipile_configured_at).toLocaleString()}
            </p>
          </div>
        )}
      </form>

      {/* Linked LinkedIn Accounts Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Connected LinkedIn Accounts</h2>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-gray-600">
            LinkedIn accounts connected via this client&apos;s Unipile account will appear here.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Users will authenticate their LinkedIn accounts from their dashboard, and they will
            automatically be associated with this client&apos;s Unipile account.
          </p>
        </div>
      </div>
    </div>
  );
}
