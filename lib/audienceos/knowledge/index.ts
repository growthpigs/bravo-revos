/**
 * Knowledge Management System
 *
 * Provides access to application knowledge base, capabilities,
 * and metric explanations for the AI assistant.
 */

/**
 * Get application knowledge base
 * Provides context about the application's features and capabilities
 */
export async function getAppKnowledge() {
  return {
    app_name: 'AudienceOS Command Center',
    description: 'Multi-tenant SaaS for marketing agency client lifecycle management',
    core_features: [
      'Client pipeline management with Kanban board',
      'Unified communications hub (Email, Slack, Timeline)',
      'AI-powered intelligence layer with knowledge base',
      'Dashboard with KPIs and performance metrics',
      'Support ticket management',
      'Workflow automations',
      'Agency and user settings management',
    ],
    current_context: 'No specific context loaded',
  };
}

/**
 * Get capability handler
 * Returns the specific capability handler for a given request
 */
export async function getCapabilityHandler(capability: string) {
  const handlers: Record<string, string> = {
    chat_assistant: 'General chat and Q&A',
    draft_replies: 'Email and message drafting',
    alert_analysis: 'Alert and notification analysis',
    document_rag: 'Document search and analysis',
  };

  return {
    capability,
    handler: handlers[capability] || 'Unknown handler',
    available: capability in handlers,
  };
}

/**
 * Get metric explainer
 * Provides explanations for various metrics and KPIs
 */
export async function getMetricExplainer(metric: string) {
  const explanations: Record<string, string> = {
    conversion_rate: 'Percentage of clients converted from opportunities',
    client_retention: 'Percentage of clients retained month-over-month',
    average_deal_size: 'Average revenue per client contract',
    pipeline_health: 'Overall pipeline value and progression rate',
    response_time: 'Average time to respond to client communications',
  };

  return {
    metric,
    explanation: explanations[metric] || 'No explanation available for this metric',
    available: metric in explanations,
  };
}
