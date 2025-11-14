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
import { AlertCircle, CheckCircle, RefreshCw, Save, ChevronDown, Info, Plus, Edit2, Trash2 } from 'lucide-react';
import { deepMerge, deepEqual, setNestedValue } from '@/lib/utils/deep-merge';
import { ConsoleConfig, safeParseConsoleConfig, validateCartridgeSize } from '@/lib/validation/console-validation';
import { ConsoleMetadataModal, ConsoleMetadataInput } from './components/ConsoleMetadataModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [loading, setLoading] = useState<LoadingState>({ consoles: true, save: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessMessage | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [consoleToDelete, setConsoleToDelete] = useState<ConsoleConfig | null>(null);

  // Define loadConsoles before useEffects
  const loadConsoles = useCallback(async function loadConsoles() {
    try {
      setLoading((prev) => ({ ...prev, consoles: true }));
      setError(null);

      const { data, error: err } = await supabase
        .from('console_prompts')
        .select(`
          id, name, display_name, system_instructions, behavior_rules, version,
          operations_cartridge, system_cartridge, context_cartridge, skills_cartridge,
          plugins_cartridge, knowledge_cartridge, memory_cartridge, ui_cartridge
        `)
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
        // Load all 8 cartridges from database
        operationsCartridge: row.operations_cartridge || {},
        systemCartridge: row.system_cartridge || {},
        contextCartridge: row.context_cartridge || {},
        skillsCartridge: row.skills_cartridge || {},
        pluginsCartridge: row.plugins_cartridge || {},
        knowledgeCartridge: row.knowledge_cartridge || {},
        memoryCartridge: row.memory_cartridge || {},
        uiCartridge: row.ui_cartridge || {},
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
    setEditedConsole(JSON.parse(JSON.stringify(console))); // Deep copy
    setValidationError(null);
    setError(null);
    setDropdownOpen(false);
  }

  /**
   * Update cartridge field (handles nested paths)
   *
   * Example: updateCartridge('uiCartridge.inlineButtons.style', 'new value')
   */
  function updateCartridge(path: string, value: any) {
    if (!editedConsole) return;

    setEditedConsole(setNestedValue(editedConsole, path, value));
    setValidationError(null); // Clear validation errors on edit
  }

  /**
   * Update JSON field with validation feedback
   */
  function updateJSONField(path: string, jsonString: string) {
    try {
      const parsed = JSON.parse(jsonString);
      updateCartridge(path, parsed);
      setValidationError(null);
    } catch (err: any) {
      setValidationError(`Invalid JSON: ${err.message}`);
    }
  }

  async function saveConsole() {
    if (!selectedConsole || !editedConsole) {
      setError('No console selected');
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, save: true }));
      setError(null);
      setValidationError(null);

      // Validate with Zod
      const validation = safeParseConsoleConfig(editedConsole);
      if (!validation.success) {
        const firstError = validation.error.issues[0];
        setValidationError(
          `${firstError?.path.join('.')}: ${firstError?.message}`
        );
        return;
      }

      // Size check for each cartridge
      const cartridges = [
        'operationsCartridge',
        'systemCartridge',
        'contextCartridge',
        'skillsCartridge',
        'pluginsCartridge',
        'knowledgeCartridge',
        'memoryCartridge',
        'uiCartridge',
      ] as const;

      for (const cart of cartridges) {
        try {
          validateCartridgeSize(editedConsole[cart], cart);
        } catch (err: any) {
          setError(err.message);
          return;
        }
      }

      const { error: err } = await supabase
        .from('console_prompts')
        .update({
          operations_cartridge: editedConsole.operationsCartridge,
          system_cartridge: editedConsole.systemCartridge,
          context_cartridge: editedConsole.contextCartridge,
          skills_cartridge: editedConsole.skillsCartridge,
          plugins_cartridge: editedConsole.pluginsCartridge,
          knowledge_cartridge: editedConsole.knowledgeCartridge,
          memory_cartridge: editedConsole.memoryCartridge,
          ui_cartridge: editedConsole.uiCartridge,
          version: (selectedConsole.version || 0) + 1,
        })
        .eq('id', selectedConsole.id);

      if (err) throw err;

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

  /**
   * Create new console configuration
   */
  async function handleCreateConsole(data: { name?: string; displayName: string; systemInstructions?: string; isActive: boolean }) {
    try {
      setLoading((prev) => ({ ...prev, save: true }));
      setError(null);

      const { data: newConsole, error: err } = await supabase
        .from('console_prompts')
        .insert({
          name: data.name,
          display_name: data.displayName,
          system_instructions: data.systemInstructions || 'Default system instructions',
          version: 1,
          is_active: data.isActive,
          // Initialize all 8 cartridges with empty objects
          operations_cartridge: {},
          system_cartridge: {},
          context_cartridge: {},
          skills_cartridge: {},
          plugins_cartridge: {},
          knowledge_cartridge: {},
          memory_cartridge: {},
          ui_cartridge: {},
        })
        .select()
        .single();

      if (err) throw err;

      setSuccess({
        text: `Console "${data.displayName}" created successfully`,
        timestamp: Date.now(),
      });

      await loadConsoles();
      setModalOpen(false);

      // Select the newly created console
      if (newConsole) {
        const converted: ConsoleConfig = {
          id: newConsole.id,
          name: newConsole.name,
          displayName: newConsole.display_name,
          systemInstructions: newConsole.system_instructions,
          behaviorRules: newConsole.behavior_rules || [],
          version: newConsole.version,
          operationsCartridge: newConsole.operations_cartridge || {},
          systemCartridge: newConsole.system_cartridge || {},
          contextCartridge: newConsole.context_cartridge || {},
          skillsCartridge: newConsole.skills_cartridge || {},
          pluginsCartridge: newConsole.plugins_cartridge || {},
          knowledgeCartridge: newConsole.knowledge_cartridge || {},
          memoryCartridge: newConsole.memory_cartridge || {},
          uiCartridge: newConsole.ui_cartridge || {},
        };
        selectConsole(converted);
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to create console';
      console.error('[ConsoleConfig] Error creating console:', err);
      setError(message);
      throw err; // Re-throw for modal error handling
    } finally {
      setLoading((prev) => ({ ...prev, save: false }));
    }
  }

  /**
   * Update console metadata (display name and active status)
   */
  async function handleUpdateMetadata(data: { displayName: string; isActive: boolean }) {
    if (!selectedConsole) {
      setError('No console selected');
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, save: true }));
      setError(null);

      const { error: err } = await supabase
        .from('console_prompts')
        .update({
          display_name: data.displayName,
          is_active: data.isActive,
        })
        .eq('id', selectedConsole.id);

      if (err) throw err;

      setSuccess({
        text: `Console "${data.displayName}" updated successfully`,
        timestamp: Date.now(),
      });

      await loadConsoles();
      setModalOpen(false);
    } catch (err: any) {
      const message = err?.message || 'Failed to update console';
      console.error('[ConsoleConfig] Error updating console:', err);
      setError(message);
      throw err; // Re-throw for modal error handling
    } finally {
      setLoading((prev) => ({ ...prev, save: false }));
    }
  }

  /**
   * Soft delete console (set is_active = false)
   */
  async function handleDeleteConsole() {
    if (!consoleToDelete) {
      setError('No console selected for deletion');
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, save: true }));
      setError(null);

      const { error: err } = await supabase
        .from('console_prompts')
        .update({ is_active: false })
        .eq('id', consoleToDelete.id);

      if (err) throw err;

      setSuccess({
        text: `Console "${consoleToDelete.displayName}" deleted successfully`,
        timestamp: Date.now(),
      });

      setDeleteConfirmOpen(false);
      setConsoleToDelete(null);

      // Reload and select first available console
      await loadConsoles();
    } catch (err: any) {
      const message = err?.message || 'Failed to delete console';
      console.error('[ConsoleConfig] Error deleting console:', err);
      setError(message);
    } finally {
      setLoading((prev) => ({ ...prev, save: false }));
    }
  }

  /**
   * Open modal in create mode
   */
  function openCreateModal() {
    setModalMode('create');
    setModalOpen(true);
  }

  /**
   * Open modal in edit mode
   */
  function openEditModal() {
    if (!selectedConsole) {
      setError('No console selected');
      return;
    }
    setModalMode('edit');
    setModalOpen(true);
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
              <CardTitle>Console Configuration</CardTitle>
              <CardDescription>
                Edit AI agent configuration across 8 cartridges
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

        <CardContent className="pt-6">
          {/* Console Selector with Actions */}
          <div className="space-y-2 mb-6">
            <Label htmlFor="console-select">Select Console</Label>
            <div className="flex gap-2">
              {/* Dropdown (not full width) */}
              <div className="relative flex-1 max-w-md">
                <button
                  id="console-select"
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

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={openCreateModal}
                  variant="outline"
                  size="default"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Console
                </Button>

                {selectedConsole && (
                  <>
                    <Button
                      onClick={openEditModal}
                      variant="outline"
                      size="default"
                      className="flex items-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>

                    <Button
                      onClick={() => {
                        setConsoleToDelete(selectedConsole);
                        setDeleteConfirmOpen(true);
                      }}
                      variant="outline"
                      size="default"
                      className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
            {selectedConsole && (
              <p className="text-xs text-gray-500 mt-1">
                ID: <code className="bg-gray-100 px-2 py-1 rounded">{selectedConsole.name}</code>
              </p>
            )}
          </div>

          {/* Validation Error Alert */}
          {validationError && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Validation Error:</strong> {validationError}
              </AlertDescription>
            </Alert>
          )}

          {/* 8-Tab System */}
          {editedConsole && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-8 gap-1">
                <TabsTrigger value="operations">Operations</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="context">Context</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="plugins">Plugins</TabsTrigger>
                <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
                <TabsTrigger value="memory">Memory</TabsTrigger>
                <TabsTrigger value="ui">UI</TabsTrigger>
              </TabsList>

              {/* Operations Tab */}
              <TabsContent value="operations" className="space-y-4">
                <div>
                  <Label htmlFor="prd">Product Requirements Document</Label>
                  <Textarea
                    id="prd"
                    value={editedConsole.operationsCartridge?.prd || ''}
                    onChange={(e) => updateCartridge('operationsCartridge.prd', e.target.value)}
                    rows={8}
                    className="font-mono text-sm mt-2"
                    placeholder="Product overview, key capabilities, target users..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(editedConsole.operationsCartridge?.prd || '').length} / 10,000 chars
                  </p>
                </div>

                <div>
                  <Label htmlFor="userStories">User Stories (JSON Array)</Label>
                  <Textarea
                    id="userStories"
                    value={JSON.stringify(editedConsole.operationsCartridge?.userStories || [], null, 2)}
                    onChange={(e) => updateJSONField('operationsCartridge.userStories', e.target.value)}
                    rows={8}
                    className="font-mono text-sm mt-2"
                    placeholder='["As a user, I want...", "As an admin, I need..."]'
                  />
                </div>

                <div>
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea
                    id="requirements"
                    value={editedConsole.operationsCartridge?.requirements || ''}
                    onChange={(e) => updateCartridge('operationsCartridge.requirements', e.target.value)}
                    rows={6}
                    className="font-mono text-sm mt-2"
                    placeholder="Technical requirements, constraints, dependencies..."
                  />
                </div>
              </TabsContent>

              {/* System Tab */}
              <TabsContent value="system" className="space-y-4">
                <div>
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <Textarea
                    id="systemPrompt"
                    value={editedConsole.systemCartridge?.systemPrompt || ''}
                    onChange={(e) => updateCartridge('systemCartridge.systemPrompt', e.target.value)}
                    rows={10}
                    className="font-mono text-sm mt-2"
                    placeholder="You are RevOS Intelligence, an AI agent for..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(editedConsole.systemCartridge?.systemPrompt || '').length} / 10,000 chars
                  </p>
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Textarea
                    id="role"
                    value={editedConsole.systemCartridge?.role || ''}
                    onChange={(e) => updateCartridge('systemCartridge.role', e.target.value)}
                    rows={3}
                    className="font-mono text-sm mt-2"
                    placeholder="Strategic marketing partner with deep LinkedIn expertise..."
                  />
                </div>

                <div>
                  <Label htmlFor="rules">Behavioral Rules</Label>
                  <Textarea
                    id="rules"
                    value={editedConsole.systemCartridge?.rules || ''}
                    onChange={(e) => updateCartridge('systemCartridge.rules', e.target.value)}
                    rows={8}
                    className="font-mono text-sm mt-2"
                    placeholder="AGENCY PRINCIPLES: Use judgment over rigid scripts..."
                  />
                </div>
              </TabsContent>

              {/* Context Tab */}
              <TabsContent value="context" className="space-y-4">
                <div>
                  <Label htmlFor="domain">Domain</Label>
                  <Textarea
                    id="domain"
                    value={editedConsole.contextCartridge?.domain || ''}
                    onChange={(e) => updateCartridge('contextCartridge.domain', e.target.value)}
                    rows={4}
                    className="font-mono text-sm mt-2"
                    placeholder="LinkedIn B2B marketing, lead generation..."
                  />
                </div>

                <div>
                  <Label htmlFor="appFeatures">App Features (JSON Array)</Label>
                  <Textarea
                    id="appFeatures"
                    value={JSON.stringify(editedConsole.contextCartridge?.appFeatures || [], null, 2)}
                    onChange={(e) => updateJSONField('contextCartridge.appFeatures', e.target.value)}
                    rows={10}
                    className="font-mono text-sm mt-2"
                    placeholder='["Campaigns: Create and manage LinkedIn outreach", ...]'
                  />
                </div>

                <div>
                  <Label htmlFor="structure">Application Structure</Label>
                  <Textarea
                    id="structure"
                    value={editedConsole.contextCartridge?.structure || ''}
                    onChange={(e) => updateCartridge('contextCartridge.structure', e.target.value)}
                    rows={4}
                    className="font-mono text-sm mt-2"
                    placeholder="Agency → Client → User hierarchy. Multi-tenant with RLS..."
                  />
                </div>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Editable JSON:</strong> Add chips as JSON objects with name and description fields.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="chips">Chips (JSON Array of Objects)</Label>
                  <Textarea
                    id="chips"
                    value={JSON.stringify(editedConsole.skillsCartridge?.chips || [], null, 2)}
                    onChange={(e) => updateJSONField('skillsCartridge.chips', e.target.value)}
                    rows={15}
                    className="font-mono text-sm mt-2"
                    placeholder={'[\n  {"name": "create_campaign", "description": "Create new LinkedIn campaign"},\n  {"name": "schedule_post", "description": "Schedule LinkedIn post"}\n]'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(editedConsole.skillsCartridge?.chips || []).length} chips defined
                  </p>
                </div>
              </TabsContent>

              {/* Plugins Tab */}
              <TabsContent value="plugins" className="space-y-4">
                <div>
                  <Label htmlFor="enabled">Enabled Plugins (JSON Array)</Label>
                  <Textarea
                    id="enabled"
                    value={JSON.stringify(editedConsole.pluginsCartridge?.enabled || [], null, 2)}
                    onChange={(e) => updateJSONField('pluginsCartridge.enabled', e.target.value)}
                    rows={5}
                    className="font-mono text-sm mt-2"
                    placeholder='["playwright", "sentry", "supabase", "archon"]'
                  />
                </div>

                <div>
                  <Label htmlFor="pluginConfig">Plugin Configuration (JSON Object)</Label>
                  <Textarea
                    id="pluginConfig"
                    value={JSON.stringify(editedConsole.pluginsCartridge?.config || {}, null, 2)}
                    onChange={(e) => updateJSONField('pluginsCartridge.config', e.target.value)}
                    rows={10}
                    className="font-mono text-sm mt-2"
                    placeholder='{"playwright": {"headless": true}, "sentry": {"environment": "production"}}'
                  />
                </div>

                <div>
                  <Label htmlFor="required">Required Plugins (JSON Array)</Label>
                  <Textarea
                    id="required"
                    value={JSON.stringify(editedConsole.pluginsCartridge?.required || [], null, 2)}
                    onChange={(e) => updateJSONField('pluginsCartridge.required', e.target.value)}
                    rows={5}
                    className="font-mono text-sm mt-2"
                    placeholder='["playwright", "sentry", "supabase"]'
                  />
                </div>

                <div>
                  <Label htmlFor="pluginDescription">Description</Label>
                  <Textarea
                    id="pluginDescription"
                    value={editedConsole.pluginsCartridge?.description || ''}
                    onChange={(e) => updateCartridge('pluginsCartridge.description', e.target.value)}
                    rows={3}
                    className="font-mono text-sm mt-2"
                    placeholder="MCP servers must be configured and working. Non-negotiable."
                  />
                </div>
              </TabsContent>

              {/* Knowledge Tab */}
              <TabsContent value="knowledge" className="space-y-4">
                <div>
                  <Label htmlFor="documentation">Documentation</Label>
                  <Textarea
                    id="documentation"
                    value={editedConsole.knowledgeCartridge?.documentation || ''}
                    onChange={(e) => updateCartridge('knowledgeCartridge.documentation', e.target.value)}
                    rows={6}
                    className="font-mono text-sm mt-2"
                    placeholder="See /docs for RevOS architecture, /docs/AGENTKIT_ENFORCEMENT.md for rules"
                  />
                </div>

                <div>
                  <Label htmlFor="examples">Examples (JSON Array)</Label>
                  <Textarea
                    id="examples"
                    value={JSON.stringify(editedConsole.knowledgeCartridge?.examples || [], null, 2)}
                    onChange={(e) => updateJSONField('knowledgeCartridge.examples', e.target.value)}
                    rows={10}
                    className="font-mono text-sm mt-2"
                    placeholder='["Campaign creation: Create campaign targeting CTOs...", ...]'
                  />
                </div>

                <div>
                  <Label htmlFor="bestPractices">Best Practices</Label>
                  <Textarea
                    id="bestPractices"
                    value={editedConsole.knowledgeCartridge?.bestPractices || ''}
                    onChange={(e) => updateCartridge('knowledgeCartridge.bestPractices', e.target.value)}
                    rows={8}
                    className="font-mono text-sm mt-2"
                    placeholder="Always verify user intent before major actions. Provide specific next steps..."
                  />
                </div>
              </TabsContent>

              {/* Memory Tab */}
              <TabsContent value="memory" className="space-y-4">
                <div>
                  <Label htmlFor="scoping">Memory Scoping</Label>
                  <Textarea
                    id="scoping"
                    value={editedConsole.memoryCartridge?.scoping || ''}
                    onChange={(e) => updateCartridge('memoryCartridge.scoping', e.target.value)}
                    rows={3}
                    className="font-mono text-sm mt-2"
                    placeholder="agencyId::clientId::userId (3-tier isolation via Mem0)"
                  />
                </div>

                <div>
                  <Label htmlFor="whatToRemember">What to Remember (JSON Array)</Label>
                  <Textarea
                    id="whatToRemember"
                    value={JSON.stringify(editedConsole.memoryCartridge?.whatToRemember || [], null, 2)}
                    onChange={(e) => updateJSONField('memoryCartridge.whatToRemember', e.target.value)}
                    rows={10}
                    className="font-mono text-sm mt-2"
                    placeholder='["User communication style", "Past campaigns and performance", ...]'
                  />
                </div>

                <div>
                  <Label htmlFor="contextInjection">Context Injection Strategy</Label>
                  <Textarea
                    id="contextInjection"
                    value={editedConsole.memoryCartridge?.contextInjection || ''}
                    onChange={(e) => updateCartridge('memoryCartridge.contextInjection', e.target.value)}
                    rows={5}
                    className="font-mono text-sm mt-2"
                    placeholder="Retrieve relevant memories before each request. Include in system prompt..."
                  />
                </div>

                <div>
                  <Label htmlFor="guidelines">Memory Guidelines</Label>
                  <Textarea
                    id="guidelines"
                    value={editedConsole.memoryCartridge?.guidelines || ''}
                    onChange={(e) => updateCartridge('memoryCartridge.guidelines', e.target.value)}
                    rows={5}
                    className="font-mono text-sm mt-2"
                    placeholder="Remember outcomes, not just actions. Focus on what helps user succeed."
                  />
                </div>
              </TabsContent>

              {/* UI Tab (CRITICAL) */}
              <TabsContent value="ui" className="space-y-4">
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Critical Cartridge:</strong> UI configuration affects user experience directly. Edit with care.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="inlineButtons">Inline Buttons Configuration (JSON Object)</Label>
                  <Textarea
                    id="inlineButtons"
                    value={JSON.stringify(editedConsole.uiCartridge?.inlineButtons || {}, null, 2)}
                    onChange={(e) => updateJSONField('uiCartridge.inlineButtons', e.target.value)}
                    rows={15}
                    className="font-mono text-sm mt-2"
                    placeholder={'{\n  "style": "JetBrains Mono, 9pt, UPPERCASE, black bg (#000), white text (#FFF), 4px padding, left-justified",\n  "frequency": "80% of responses should include action buttons",\n  "placement": "Directly below AI message, stacked vertically, jagged edges (left-justified)",\n  "examples": ["User: I have a post about AI → [EDIT POST] [ADD IMAGE] [POST TO LINKEDIN]"]\n}'}
                  />
                </div>

                <div>
                  <Label htmlFor="buttonActions">Button Actions (JSON Object)</Label>
                  <Textarea
                    id="buttonActions"
                    value={JSON.stringify(editedConsole.uiCartridge?.buttonActions || {}, null, 2)}
                    onChange={(e) => updateJSONField('uiCartridge.buttonActions', e.target.value)}
                    rows={8}
                    className="font-mono text-sm mt-2"
                    placeholder={'{\n  "navigation": "Clicking button navigates to relevant page (campaigns, offers, system-health, etc.)",\n  "verification": "User SEES page change - builds trust and transparency",\n  "philosophy": "Chat is primary. Buttons are shortcuts. User never NEEDS buttons but they help."\n}'}
                  />
                </div>

                <div>
                  <Label htmlFor="fullscreenTriggers">Fullscreen Triggers (JSON Object)</Label>
                  <Textarea
                    id="fullscreenTriggers"
                    value={JSON.stringify(editedConsole.uiCartridge?.fullscreenTriggers || {}, null, 2)}
                    onChange={(e) => updateJSONField('uiCartridge.fullscreenTriggers', e.target.value)}
                    rows={8}
                    className="font-mono text-sm mt-2"
                    placeholder={'{\n  "when": ["write", "create", "draft", "compose"],\n  "never": ["hi", "hello", "thanks", "yes", "no", "ok", "sure"]\n}'}
                  />
                </div>

                <div>
                  <Label htmlFor="principle">UI Principle</Label>
                  <Textarea
                    id="principle"
                    value={editedConsole.uiCartridge?.principle || ''}
                    onChange={(e) => updateCartridge('uiCartridge.principle', e.target.value)}
                    rows={5}
                    className="font-mono text-sm mt-2"
                    placeholder="Agent decides UI dynamically. Conversational by default. Fullscreen only when explicitly writing. Inline buttons almost always."
                  />
                </div>
              </TabsContent>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={saveConsole}
                  disabled={loading.save || !editedConsole || deepEqual(editedConsole, selectedConsole)}
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
                      Save All Cartridges
                    </>
                  )}
                </Button>

                {editedConsole && !deepEqual(editedConsole, selectedConsole) && (
                  <Button
                    onClick={() => selectConsole(selectedConsole!)}
                    variant="outline"
                    size="lg"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </Tabs>
          )}

          {!editedConsole && (
            <div className="text-center py-12 text-gray-500">
              <p>Select a console to begin editing cartridges</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-xs text-gray-500 text-center">
        <p>For support or questions, contact the development team</p>
      </div>

      {/* Console Metadata Modal */}
      <ConsoleMetadataModal
        open={modalOpen}
        mode={modalMode}
        initialData={
          modalMode === 'edit' && selectedConsole
            ? {
                name: selectedConsole.name,
                displayName: selectedConsole.displayName,
                systemInstructions: selectedConsole.systemInstructions,
                isActive: true, // Active consoles only (filtered by loadConsoles)
              }
            : undefined
        }
        onClose={() => setModalOpen(false)}
        onSave={async (data: ConsoleMetadataInput) => {
          if (modalMode === 'create') {
            await handleCreateConsole(data);
          } else {
            await handleUpdateMetadata(data);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Console Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{consoleToDelete?.displayName}&quot;? This will hide
              the console from the dropdown. Data will be preserved but marked as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConsole}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Console
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
