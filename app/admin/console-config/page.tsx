'use client';

/**
 * Console Configuration Admin Page - REDESIGNED
 *
 * Clean, focused interface for managing console prompts.
 * Purpose: Edit system instructions for AI console agents
 *
 * PROTECTED: Only accessible to admin users in development mode.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentAdminUser } from '@/lib/auth/admin-check';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, Save, ChevronDown, Info } from 'lucide-react';
import { deepMerge, deepEqual, setNestedValue } from '@/lib/utils/deep-merge';
import { ConsoleConfig, safeParseConsoleConfig } from '@/lib/validation/console-validation';

interface LoadingState {
  consoles: boolean;
  save: boolean;
}

interface SuccessMessage {
  text: string;
  timestamp: number;
}

export default function ConsoleConfigPage() {
  const router = useRouter();
  const supabase = createClient();
  const [consoles, setConsoles] = useState<ConsoleConfig[]>([]);
  const [selectedConsole, setSelectedConsole] = useState<ConsoleConfig | null>(null);
  const [editedConsole, setEditedConsole] = useState<ConsoleConfig | null>(null);
  const [activeTab, setActiveTab] = useState('operations');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [systemInstructions, setSystemInstructions] = useState('');
  const [loading, setLoading] = useState<LoadingState>({ consoles: true, save: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessMessage | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Define loadConsoles before useEffects
  const loadConsoles = useCallback(async function loadConsoles() {
    try {
      setLoading((prev) => ({ ...prev, consoles: true }));
      setError(null);

      const { data, error: err } = await supabase
        .from('console_prompts')
        .select('id, name, display_name, system_instructions, behavior_rules, version')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (err) throw err;

      if (!data || data.length === 0) {
        setError('No console configurations found. Please create one first.');
        setConsoles([]);
        return;
      }

      const convertedData: ConsoleConfig[] = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        systemInstructions: row.system_instructions,
        behaviorRules: row.behavior_rules || [],
        version: row.version,
      }));

      setConsoles(convertedData);

      if (convertedData.length > 0) {
        selectConsole(convertedData[0]);
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to load console configurations';
      console.error('[ConsoleConfig] Error loading consoles:', err);
      setError(message);
    } finally {
      setLoading((prev) => ({ ...prev, consoles: false }));
    }
  }, [supabase]);

  // Check admin status on mount
  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          console.log('[ConsoleConfig] No authenticated user, redirecting to /dashboard');
          router.replace('/dashboard');
          return;
        }

        const adminUser = await getCurrentAdminUser(supabase);

        if (adminUser || process.env.NODE_ENV === 'development') {
          setIsAdmin(true);
          if (!adminUser) {
            console.warn('[ConsoleConfig] User authenticated in development mode');
          }
        } else {
          console.log('[ConsoleConfig] User is not admin, redirecting to /dashboard');
          router.replace('/dashboard');
        }
      } catch (err) {
        console.error('[ConsoleConfig] Error checking admin status:', err);
        router.replace('/dashboard');
      } finally {
        setAuthChecking(false);
      }
    }
    checkAdmin();
  }, [router, supabase]);

  // Load consoles after auth is verified
  useEffect(() => {
    if (!authChecking && isAdmin) {
      loadConsoles();
    }
  }, [authChecking, isAdmin, loadConsoles]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  function selectConsole(console: ConsoleConfig) {
    setSelectedConsole(console);
    setSystemInstructions(console.systemInstructions);
    setError(null);
    setDropdownOpen(false);
  }

  async function saveConsole() {
    if (!selectedConsole) {
      setError('No console selected');
      return;
    }

    if (!systemInstructions.trim()) {
      setError('System instructions cannot be empty');
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, save: true }));
      setError(null);

      const { error: err } = await supabase
        .from('console_prompts')
        .update({
          system_instructions: systemInstructions,
          version: (selectedConsole.version || 0) + 1,
        })
        .eq('id', selectedConsole.id);

      if (err) throw err;

      const updated = { ...selectedConsole, systemInstructions };
      setSelectedConsole(updated);
      setSuccess({
        text: `"${selectedConsole.displayName}" updated successfully`,
        timestamp: Date.now(),
      });

      await loadConsoles();
    } catch (err: any) {
      const message = err?.message || 'Failed to save console configuration';
      console.error('[ConsoleConfig] Error saving console:', err);
      setError(message);
    } finally {
      setLoading((prev) => ({ ...prev, save: false }));
    }
  }

  // Show loading while checking auth
  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Verifying Access</h2>
          <p className="text-gray-500 mt-2">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Failsafe: access denied
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main content
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Console Manager</h1>
        <p className="text-gray-600 mt-2">Edit AI agent system prompts and behavior</p>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900">Saved successfully</p>
            <p className="text-sm text-green-800">{success.text}</p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Edit Console Prompt</CardTitle>
              <CardDescription>
                Update the system instructions that guide the AI agent&apos;s behavior
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadConsoles()}
              disabled={loading.consoles}
            >
              <RefreshCw className={`h-4 w-4 ${loading.consoles ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Console Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Console
            </label>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={loading.consoles}
                className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 flex items-center justify-between"
              >
                <span className="text-sm">
                  {selectedConsole ? selectedConsole.displayName : 'Select a console...'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-lg bg-white shadow-lg z-10">
                  {consoles.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No consoles available</div>
                  ) : (
                    consoles.map((console) => (
                      <button
                        key={console.id}
                        onClick={() => selectConsole(console)}
                        className={`w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0 transition-colors ${
                          selectedConsole?.id === console.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {console.displayName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            v{console.version}
                          </Badge>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedConsole && (
              <p className="text-xs text-gray-500 mt-1">
                ID: <code className="bg-gray-100 px-2 py-1 rounded">{selectedConsole.name}</code>
              </p>
            )}
          </div>

          {/* Textarea Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                System Instructions
              </label>
              <span className="text-xs text-gray-500">
                {systemInstructions.length} characters
              </span>
            </div>
            <Textarea
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              placeholder="Enter the system instructions for this console agent..."
              className="font-mono text-sm min-h-[300px] max-h-[500px] resize-none"
              disabled={!selectedConsole}
            />
            {systemInstructions !== selectedConsole?.systemInstructions && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-600" />
                Unsaved changes
              </p>
            )}
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <p className="font-medium mb-2">How it works:</p>
            <ul className="space-y-1 text-blue-800 ml-4 list-disc">
              <li>Changes take effect immediately for new conversations</li>
              <li>Existing sessions use the previous prompt version</li>
              <li>Version increments with each save for audit trail</li>
              <li>Only active consoles appear here</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={saveConsole}
              disabled={loading.save || systemInstructions === selectedConsole?.systemInstructions || !selectedConsole}
              className="flex-1"
              size="lg"
            >
              {loading.save ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>

            {systemInstructions !== selectedConsole?.systemInstructions && (
              <Button
                onClick={() => selectConsole(selectedConsole!)}
                variant="outline"
                size="lg"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-xs text-gray-500 text-center">
        <p>For support or questions, contact the development team</p>
      </div>
    </div>
  );
}
