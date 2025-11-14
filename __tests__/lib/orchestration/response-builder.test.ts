import { describe, it, expect } from '@jest/globals';
import { OrchestrationResponseBuilder } from '@/lib/orchestration/response-builder';

describe('OrchestrationResponseBuilder', () => {
  it('builds response with navigation instruction', () => {
    const builder = new OrchestrationResponseBuilder();

    const response = builder
      .withMessage("Let's create your campaign. What's it about?")
      .withNavigation('/dashboard/campaigns/new', 'Opening campaign builder...')
      .build();

    expect(response).toEqual({
      response: "Let's create your campaign. What's it about?",
      orchestration: {
        navigate: '/dashboard/campaigns/new',
        message: 'Opening campaign builder...'
      }
    });
  });

  it('builds response with form fill instructions', () => {
    const builder = new OrchestrationResponseBuilder();

    const response = builder
      .withMessage('Setting up your campaign')
      .withFormFills([
        { id: 'campaign_name', value: 'AI Tools for CTOs', animated: true },
        { id: 'target_audience', value: 'CTOs', animated: false }
      ])
      .build();

    expect(response.orchestration?.fillFields).toBeDefined();
    expect((response.orchestration?.fillFields as any[]).length).toBe(2);
    expect((response.orchestration?.fillFields as any[])[0]).toEqual({
      id: 'campaign_name',
      value: 'AI Tools for CTOs',
      animated: true
    });
  });

  it('builds response with inline buttons', () => {
    const builder = new OrchestrationResponseBuilder();

    const response = builder
      .withMessage('Choose how to proceed')
      .withButton('CREATE LEAD MAGNET', { action: 'create_lead_magnet' })
      .withButton('SKIP', { navigateTo: '/dashboard' })
      .build();

    expect(response.buttons).toBeDefined();
    expect((response.buttons as any[]).length).toBe(2);
    expect((response.buttons as any[])[0]).toEqual({
      label: 'CREATE LEAD MAGNET',
      action: 'create_lead_magnet'
    });
  });

  it('builds response with session ID and memory context', () => {
    const builder = new OrchestrationResponseBuilder();

    const response = builder
      .withMessage('Saving campaign preferences')
      .withSessionId('session-123')
      .withMemoryContext(true)
      .build();

    expect(response.sessionId).toBe('session-123');
    expect(response.shouldRememberContext).toBe(true);
  });

  it('builds response with wait instruction', () => {
    const builder = new OrchestrationResponseBuilder();

    const response = builder
      .withMessage('Processing...')
      .withWait(2000)
      .build();

    expect(response.orchestration?.wait).toBe(2000);
  });

  it('builds response with all features combined', () => {
    const builder = new OrchestrationResponseBuilder();

    const response = builder
      .withMessage('Setting up your campaign')
      .withNavigation('/dashboard/campaigns/new', 'Opening campaign builder...')
      .withFormFills([
        { id: 'campaign_name', value: 'AI Tools', animated: true }
      ])
      .withButton('CONTINUE', { navigateTo: '/dashboard/offers' })
      .withWait(1000)
      .withSessionId('sess-456')
      .withMemoryContext(true)
      .build();

    expect(response.response).toBe('Setting up your campaign');
    expect(response.orchestration?.navigate).toBe('/dashboard/campaigns/new');
    expect(response.orchestration?.fillFields).toBeDefined();
    expect((response.orchestration?.fillFields as any[]).length).toBe(1);
    expect(response.buttons).toBeDefined();
    expect((response.buttons as any[]).length).toBe(1);
    expect(response.orchestration?.wait).toBe(1000);
    expect(response.sessionId).toBe('sess-456');
    expect(response.shouldRememberContext).toBe(true);
  });
});
