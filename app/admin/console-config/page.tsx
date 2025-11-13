'use client';

/**
 * Console Configuration Admin Page
 *
 * Allows administrators to manage console prompts and system instructions
 * directly from the database. Changes take effect immediately.
 *
 * PROTECTED: Only accessible to admin users. Non-admins are redirected to /dashboard.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentAdminUser } from '@/lib/auth/admin-check';
import type { ConsoleConfig } from '@/lib/console/console-loader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, Save, FileCode, Info } from 'lucide-react';

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
  const [systemInstructions, setSystemInstructions] = useState('');
  const [loading, setLoading] = useState<LoadingState>({ consoles: true, save: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessMessage | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Define loadConsoles before useEffects to avoid forward reference
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
        const adminUser = await getCurrentAdminUser(supabase);
        if (!adminUser) {
          router.replace('/dashboard');
          return;
        }
        setIsAdmin(true);
      } catch (err) {
        console.error('[ConsoleConfig] Error checking admin status:', err);
        router.replace('/dashboard');
      } finally {
        setAuthChecking(false);
      }
    }
    checkAdmin();
  }, [router, supabase]);

  // Load all consoles on mount (only after auth is verified)
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
        text: `Console "${selectedConsole.displayName}" updated successfully`,
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Admin Access</h2>
          <p className="text-gray-500">Please wait while we verify your permissions...</p>
        </div>
      </div>
    );
  }

  // This shouldn't happen (redirect should occur), but failsafe
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Console Configuration</h1>
          <p className="text-gray-500 mt-2">
            Manage system prompts and behavior rules for agent consoles
          </p>
        </div>
        <Button
          onClick={loadConsoles}
          disabled={loading.consoles}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading.consoles ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Warning Banner */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-900">
            <strong className="font-semibold">Live Changes:</strong> Updates to console prompts
            take effect immediately for all new conversations. Existing sessions will continue
            with their original prompt.
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-900">{error}</div>
          </CardContent>
        </Card>
      )}

      {/* Success Alert */}
      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-900">{success.text}</div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Console List Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Consoles</CardTitle>
            <CardDescription>Select a console to edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading.consoles ? (
              <div className="text-sm text-gray-500 text-center py-4">Loading consoles...</div>
            ) : consoles.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">No consoles found</div>
            ) : (
              consoles.map((console) => (
                <button
                  key={console.id}
                  onClick={() => selectConsole(console)}
                  className={`w-full text-left p-3 rounded-lg transition-all border ${
                    selectedConsole?.id === console.id
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{console.displayName}</div>
                      <div className="text-xs text-gray-500">v{console.version}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Editor Panel */}
        <div className="lg:col-span-3 space-y-6">
          {selectedConsole ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedConsole.displayName}</CardTitle>
                      <CardDescription className="mt-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {selectedConsole.name}
                        </code>
                        <Badge variant="secondary" className="ml-2">
                          v{selectedConsole.version}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="system" className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="system" className="flex-1">System Prompt</TabsTrigger>
                      <TabsTrigger value="behavior" className="flex-1">Behavior Rules</TabsTrigger>
                      <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
                    </TabsList>

                    <TabsContent value="system" className="mt-6">
                      <div className="space-y-4">
                        <Textarea
                          value={systemInstructions}
                          onChange={(e) => setSystemInstructions(e.target.value)}
                          className="font-mono text-sm min-h-[400px]"
                          placeholder="Enter system instructions for this console..."
                        />
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Character count: {systemInstructions.length}</span>
                          {systemInstructions !== selectedConsole.systemInstructions && (
                            <span className="text-amber-600 font-medium">Unsaved changes</span>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="behavior" className="mt-6">
                      {selectedConsole.behaviorRules && selectedConsole.behaviorRules.length > 0 ? (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <pre className="text-sm text-gray-700 overflow-x-auto">
                            {JSON.stringify(selectedConsole.behaviorRules, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">No behavior rules defined for this console</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="info" className="mt-6">
                      <div className="space-y-4 text-sm text-gray-600">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">System Instructions</h4>
                          <p>
                            The base prompt that defines the agent&apos;s behavior and capabilities.
                            This is passed to OpenAI as the system message.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Behavior Rules</h4>
                          <p>
                            Additional constraints and rules in JSON format. Currently stored but not
                            actively used in the system.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Live Updates</h4>
                          <p>
                            When you save changes, they are immediately available for new
                            conversations but don&apos;t affect ongoing sessions.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Versioning</h4>
                          <p>
                            Each save increments the version number for tracking changes over time.
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={saveConsole}
                      disabled={loading.save || systemInstructions === selectedConsole.systemInstructions}
                      className="flex-1"
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

                    <Button
                      onClick={() => selectConsole(selectedConsole)}
                      variant="outline"
                      disabled={systemInstructions === selectedConsole.systemInstructions}
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12 text-gray-500">
                <FileCode className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Select a console from the list to edit</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
