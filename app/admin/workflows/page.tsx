'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowForm } from './WorkflowForm';

interface Workflow {
  id: string;
  name: string;
  workflow_type: string;
  category: string;
  description: string;
  triggers: any;
  prompts: any;
  steps: any[];
  output_config: any;
  icon: string;
  user_visible: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminWorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Workflow | null>(null);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/workflows');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleToggleActive = async (workflow: Workflow) => {
    try {
      const response = await fetch(`/api/admin/workflows/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !workflow.is_active }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle workflow');
      }

      fetchWorkflows();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (workflow: Workflow, hard: boolean = false) => {
    try {
      const url = hard
        ? `/api/admin/workflows/${workflow.id}?hard=true`
        : `/api/admin/workflows/${workflow.id}`;

      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }

      setDeleteConfirm(null);
      fetchWorkflows();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingWorkflow(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingWorkflow(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingWorkflow(null);
    fetchWorkflows();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  const contentWorkflows = workflows.filter((w) => w.category === 'content');
  const actionWorkflows = workflows.filter((w) => w.category === 'action');
  const otherWorkflows = workflows.filter(
    (w) => w.category !== 'content' && w.category !== 'action'
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin: Workflows</h1>
          <p className="text-gray-600">
            Manage AI-powered workflows for content generation and automation
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
        >
          + Create Workflow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{workflows.length}</div>
          <div className="text-sm text-gray-600">Total Workflows</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {workflows.filter((w) => w.is_active).length}
          </div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-400">
            {workflows.filter((w) => !w.is_active).length}
          </div>
          <div className="text-sm text-gray-600">Inactive</div>
        </div>
      </div>

      {/* Content Workflows */}
      <WorkflowSection
        title="Content Workflows"
        icon="✏️"
        description="AI-powered content generation"
        workflows={contentWorkflows}
        onEdit={handleEdit}
        onToggle={handleToggleActive}
        onDelete={setDeleteConfirm}
      />

      {/* Action Workflows */}
      <WorkflowSection
        title="Action Workflows"
        icon="⚡"
        description="Automated campaigns and outreach"
        workflows={actionWorkflows}
        onEdit={handleEdit}
        onToggle={handleToggleActive}
        onDelete={setDeleteConfirm}
      />

      {/* Other Workflows */}
      {otherWorkflows.length > 0 && (
        <WorkflowSection
          title="Other Workflows"
          icon="🔧"
          description="Orchestration and system workflows"
          workflows={otherWorkflows}
          onEdit={handleEdit}
          onToggle={handleToggleActive}
          onDelete={setDeleteConfirm}
        />
      )}

      {/* Workflow Form Modal */}
      {showForm && (
        <WorkflowForm
          workflow={editingWorkflow || undefined}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Delete Workflow?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{deleteConfirm.name}"?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm, false)}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Deactivate
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm, true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Workflow Section Component
function WorkflowSection({
  title,
  icon,
  description,
  workflows,
  onEdit,
  onToggle,
  onDelete,
}: {
  title: string;
  icon: string;
  description: string;
  workflows: Workflow[];
  onEdit: (w: Workflow) => void;
  onToggle: (w: Workflow) => void;
  onDelete: (w: Workflow) => void;
}) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-semibold text-gray-900">
          {icon} {title}
        </h2>
        <span className="text-sm text-gray-500">({workflows.length})</span>
      </div>
      <p className="text-gray-600 mb-6">{description}</p>

      {workflows.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onEdit={() => onEdit(workflow)}
              onToggle={() => onToggle(workflow)}
              onDelete={() => onDelete(workflow)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">No {title.toLowerCase()} yet</p>
        </div>
      )}
    </section>
  );
}

// Workflow Card Component
function WorkflowCard({
  workflow,
  onEdit,
  onToggle,
  onDelete,
}: {
  workflow: Workflow;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`border rounded-lg p-4 bg-white ${
        !workflow.is_active ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{workflow.icon || '✏️'}</span>
          <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
        </div>
        <button
          onClick={onToggle}
          className={`px-2 py-1 text-xs rounded ${
            workflow.is_active
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {workflow.is_active ? 'Active' : 'Inactive'}
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {workflow.description || 'No description'}
      </p>

      <div className="text-xs text-gray-500 mb-3">
        <span className="font-mono bg-gray-100 px-1 rounded">
          {workflow.workflow_type}
        </span>
        {workflow.triggers?.commands?.length > 0 && (
          <span className="ml-2">
            Triggers: {workflow.triggers.commands.join(', ')}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
