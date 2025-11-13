'use client';

/**
 * Console Configuration Admin Page
 *
 * Allows administrators to manage console prompts and system instructions
 * directly from the database. Changes take effect immediately.
 *
 * PROTECTED: Only accessible to admin users. Non-admins are redirected to /dashboard.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentAdminUser } from '@/lib/auth/admin-check';
import type { ConsoleConfig } from '@/lib/console/console-loader';

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

  // Check admin status on mount
  useEffect(() => {
    async function checkAdmin() {
      try {
        const adminUser = await getCurrentAdminUser(supabase);
        if (!adminUser) {
          // Not an admin - redirect to dashboard
          router.replace('/dashboard');
          return;
        }
        // User is admin, allow access
        setIsAdmin(true);
      } catch (err) {
        console.error('[ConsoleConfig] Error checking admin status:', err);
        // On error, redirect to be safe
        router.replace('/dashboard');
      } finally {
        setAuthChecking(false);
      }
    }
    checkAdmin();
  }, [router]);

  // Load all consoles on mount (only after auth is verified)
  useEffect(() => {
    if (!authChecking && isAdmin) {
      loadConsoles();
    }
  }, [authChecking, isAdmin]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  async function loadConsoles() {
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

      // Convert database format to ConsoleConfig
      const convertedData: ConsoleConfig[] = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        systemInstructions: row.system_instructions,
        behaviorRules: row.behavior_rules || [],
        version: row.version,
      }));

      setConsoles(convertedData);

      // Auto-select first console
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
  }

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

      // Update local state
      const updated = { ...selectedConsole, systemInstructions };
      setSelectedConsole(updated);
      setSuccess({
        text: `✅ Console "${selectedConsole.displayName}" updated successfully`,
        timestamp: Date.now(),
      });

      // Refresh consoles to get updated data
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4 text-4xl">⏳</div>
          <h2 className="text-xl font-semibold mb-2">Verifying Admin Access</h2>
          <p className="text-slate-400">Please wait while we verify your permissions...</p>
        </div>
      </div>
    );
  }

  // This shouldn't happen (redirect should occur), but failsafe
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-slate-400">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Console Configuration</h1>
          <p className="text-slate-400">
            Manage system prompts and behavior rules for agent consoles
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-500/20 border border-amber-500 rounded-lg p-4 mb-6 text-amber-200">
          <div className="flex gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <strong>Live Changes:</strong> Updates to console prompts take effect immediately
              for all new conversations. Existing sessions will continue with their original
              prompt.
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-200">
            <div className="flex gap-2">
              <span className="text-lg">❌</span>
              <div>{error}</div>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6 text-green-200">
            <div className="flex gap-2">
              <span className="text-lg">✅</span>
              <div>{success.text}</div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Console List Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Consoles</h2>

              {loading.consoles ? (
                <div className="text-slate-400 text-sm">Loading consoles...</div>
              ) : consoles.length === 0 ? (
                <div className="text-slate-400 text-sm">No consoles found</div>
              ) : (
                <div className="space-y-2">
                  {consoles.map((console) => (
                    <button
                      key={console.id}
                      onClick={() => selectConsole(console)}
                      className={`w-full text-left p-3 rounded transition-all ${
                        selectedConsole?.id === console.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                      }`}
                    >
                      <div className="font-medium text-sm">{console.displayName}</div>
                      <div className="text-xs text-slate-300 mt-1">v{console.version}</div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={loadConsoles}
                disabled={loading.consoles}
                className="w-full mt-4 px-3 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 text-white rounded text-sm transition-all"
              >
                {loading.consoles ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Editor Panel */}
          <div className="lg:col-span-3">
            {selectedConsole ? (
              <div className="bg-slate-700 rounded-lg p-6">
                {/* Console Info */}
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">{selectedConsole.displayName}</h2>
                  <div className="text-sm text-slate-400 space-y-1">
                    <div>
                      <strong>Name:</strong> <code className="bg-slate-800 px-2 py-1 rounded text-slate-300">
                        {selectedConsole.name}
                      </code>
                    </div>
                    <div>
                      <strong>Version:</strong> {selectedConsole.version}
                    </div>
                  </div>
                </div>

                {/* System Instructions Editor */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-3">System Instructions</label>
                  <textarea
                    value={systemInstructions}
                    onChange={(e) => setSystemInstructions(e.target.value)}
                    className="w-full h-96 bg-slate-800 text-white border border-slate-600 rounded-lg p-4 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter system instructions for this console..."
                  />
                  <div className="mt-2 text-xs text-slate-400">
                    Character count: {systemInstructions.length}
                  </div>
                </div>

                {/* Behavior Rules Info */}
                {selectedConsole.behaviorRules && selectedConsole.behaviorRules.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-2">Behavior Rules</h3>
                    <div className="bg-slate-800 p-3 rounded text-sm text-slate-300">
                      <pre className="overflow-x-auto">
                        {JSON.stringify(selectedConsole.behaviorRules, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={saveConsole}
                    disabled={loading.save}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {loading.save ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        Save Changes
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => selectConsole(selectedConsole)}
                    className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-all"
                  >
                    Reset
                  </button>
                </div>

                {/* Change Detection */}
                {systemInstructions !== selectedConsole.systemInstructions && (
                  <div className="mt-4 text-sm text-amber-400">
                    📝 You have unsaved changes
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-700 rounded-lg p-6 text-center text-slate-400">
                <p>Select a console from the list to edit</p>
              </div>
            )}
          </div>
        </div>

        {/* Information Panel */}
        <div className="mt-8 bg-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">About Console Configuration</h3>
          <div className="text-sm text-slate-300 space-y-2">
            <p>
              <strong>System Instructions:</strong> The base prompt that defines the agent&apos;s
              behavior and capabilities. This is passed to OpenAI as the system message.
            </p>
            <p>
              <strong>Behavior Rules:</strong> Additional constraints and rules in JSON format.
              Currently stored but not actively used in the system.
            </p>
            <p>
              <strong>Live Updates:</strong> When you save changes, they are immediately available
              for new conversations but don&apos;t affect ongoing sessions.
            </p>
            <p>
              <strong>Versioning:</strong> Each save increments the version number for tracking
              changes over time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
