'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface WorkflowFormData {
  id?: string;
  name: string;
  workflow_type: string;
  category: string;
  description: string;
  triggers: { commands: string[]; patterns: string[]; case_insensitive: boolean };
  prompts: Record<string, string>;
  steps: Array<{ step: string; ai_prompt_key?: string }>;
  output_config: Record<string, any>;
  icon: string;
  user_visible: boolean;
  is_active: boolean;
}

interface WorkflowFormProps {
  workflow?: WorkflowFormData;
  onClose: () => void;
  onSuccess: () => void;
}

export function WorkflowForm({ workflow, onClose, onSuccess }: WorkflowFormProps) {
  const router = useRouter();
  const isEdit = !!workflow?.id;

  const [formData, setFormData] = useState<WorkflowFormData>({
    name: workflow?.name || '',
    workflow_type: workflow?.workflow_type || 'content_generation',
    category: workflow?.category || 'content',
    description: workflow?.description || '',
    triggers: workflow?.triggers || { commands: [], patterns: [], case_insensitive: true },
    prompts: workflow?.prompts || {},
    steps: workflow?.steps || [],
    output_config: workflow?.output_config || { format: 'markdown', target: 'working_document' },
    icon: workflow?.icon || '✏️',
    user_visible: workflow?.user_visible ?? true,
    is_active: workflow?.is_active ?? true,
  });

  const [triggersJson, setTriggersJson] = useState(JSON.stringify(formData.triggers, null, 2));
  const [promptsJson, setPromptsJson] = useState(JSON.stringify(formData.prompts, null, 2));
  const [stepsJson, setStepsJson] = useState(JSON.stringify(formData.steps, null, 2));
  const [outputConfigJson, setOutputConfigJson] = useState(JSON.stringify(formData.output_config, null, 2));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Parse JSON fields
      let triggers, prompts, steps, output_config;
      try {
        triggers = JSON.parse(triggersJson);
        prompts = JSON.parse(promptsJson);
        steps = JSON.parse(stepsJson);
        output_config = JSON.parse(outputConfigJson);
      } catch (parseError) {
        setError('Invalid JSON in one of the fields. Please check syntax.');
        setSaving(false);
        return;
      }

      const payload = {
        ...formData,
        triggers,
        prompts,
        steps,
        output_config,
      };

      const url = isEdit
        ? `/api/admin/workflows/${workflow.id}`
        : '/api/admin/workflows';

      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save workflow');
      }

      onSuccess();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {isEdit ? 'Edit Workflow' : 'Create Workflow'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="✏️"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Type *
              </label>
              <select
                value={formData.workflow_type}
                onChange={(e) => setFormData({ ...formData, workflow_type: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="content_generation">Content Generation</option>
                <option value="navigation">Navigation</option>
                <option value="orchestration">Orchestration</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="content">Content</option>
                <option value="action">Action</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={2}
            />
          </div>

          {/* JSON Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Triggers (JSON)
            </label>
            <textarea
              value={triggersJson}
              onChange={(e) => setTriggersJson(e.target.value)}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Commands that trigger this workflow. Example: {`{"commands": ["write"], "patterns": ["^write\\\\W*$"], "case_insensitive": true}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prompts (JSON)
            </label>
            <textarea
              value={promptsJson}
              onChange={(e) => setPromptsJson(e.target.value)}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              AI prompts used by this workflow. Keys are referenced in steps.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Steps (JSON)
            </label>
            <textarea
              value={stepsJson}
              onChange={(e) => setStepsJson(e.target.value)}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Workflow execution steps. Example: {`[{"step": "load_brand_cartridge"}, {"step": "generate_topics", "ai_prompt_key": "topic_generation"}]`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Output Config (JSON)
            </label>
            <textarea
              value={outputConfigJson}
              onChange={(e) => setOutputConfigJson(e.target.value)}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              rows={3}
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.user_visible}
                onChange={(e) => setFormData({ ...formData, user_visible: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">User Visible</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Active</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : isEdit ? 'Update Workflow' : 'Create Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
