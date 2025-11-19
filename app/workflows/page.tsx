import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function WorkflowCard({ workflow }: { workflow: any }) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-xl font-semibold text-gray-900">{workflow.name}</h3>
        <span className="text-3xl">{workflow.icon || '✏️'}</span>
      </div>

      <p className="text-gray-600 mb-4 text-sm">
        {workflow.description || 'No description available'}
      </p>

      <div className="flex gap-2">
        <Link
          href={`/chat?workflow=${workflow.id}`}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          Use Workflow →
        </Link>

        <button
          onClick={() => alert(`${workflow.name}\n\n${workflow.description}`)}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium text-sm"
        >
          Details
        </button>
      </div>
    </div>
  );
}

export default async function WorkflowsPage() {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Fetch user-visible workflows
  const { data: workflows, error } = await supabase
    .from('console_workflows')
    .select('*')
    .eq('user_visible', true)
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('[WORKFLOWS_PAGE] Error fetching workflows:', error);
  }

  const contentWorkflows = workflows?.filter((w) => w.category === 'content') || [];
  const actionWorkflows = workflows?.filter((w) => w.category === 'action') || [];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Workflows</h1>
        <p className="text-gray-600">
          AI-powered workflows to create content and automate your LinkedIn presence
        </p>
      </div>

      {/* Content Workflows */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-semibold text-gray-900">✏️ Content Workflows</h2>
        </div>
        <p className="text-gray-600 mb-6">AI-powered content generation for your brand</p>

        {contentWorkflows.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contentWorkflows.map((workflow) => (
              <WorkflowCard key={workflow.id} workflow={workflow} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600">No content workflows available yet</p>
          </div>
        )}
      </section>

      {/* Action Workflows */}
      <section>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-semibold text-gray-900">⚡ Action Workflows</h2>
        </div>
        <p className="text-gray-600 mb-6">Automated LinkedIn campaigns and outreach</p>

        {actionWorkflows.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {actionWorkflows.map((workflow) => (
              <WorkflowCard key={workflow.id} workflow={workflow} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600">No action workflows available yet</p>
          </div>
        )}
      </section>
    </div>
  );
}
