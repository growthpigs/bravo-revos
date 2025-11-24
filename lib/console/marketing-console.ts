/**
 * Marketing Console - The Brain of the AgentKit System
 *
 * Manages cartridges, orchestrates agent execution, and coordinates
 * the entire MarketingConsole ecosystem.
 *
 * Philosophy: Console loads cartridges. AgentKit orchestrates. Chips execute.
 */

import { Cartridge, AgentContext, Message } from '@/lib/cartridges/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { buildTenantKey } from '@/lib/mem0/client';
import { searchMemories, addMemory } from '@/lib/mem0/memory';
import { OPENAI_MODELS } from '@/lib/config/openai-models';

// Store Agent class after first dynamic import to support Vercel Edge/Serverless
let AgentClass: any | null = null;

export interface MarketingConsoleConfig {
  model?: string;
  temperature?: number;
  baseInstructions: string;
  openai: any; // OpenAI instance passed via dependency injection
  supabase: SupabaseClient;
}

export class MarketingConsole {
  private agent: any | null = null; // Agent instance (type from @openai/agents)
  private cartridges: Map<string, Cartridge> = new Map();
  private config: MarketingConsoleConfig;
  private openai: any; // OpenAI instance from constructor
  private supabase: SupabaseClient;
  private model: string;

  constructor(config: MarketingConsoleConfig) {
    if (!config.model) {
      console.error('[MarketingConsole] No model provided in config. Config:', config);
      throw new Error('MarketingConsole requires a valid model.');
    }

    this.config = config;
    this.openai = config.openai;
    this.supabase = config.supabase;
    this.model = config.model;

    console.log('[MarketingConsole] Initialized with model:', this.model);
  }

  /**
   * Lazy-load AgentKit Agent
   */
  private async ensureAgent(): Promise<any> {
    if (!this.agent) {
      if (!AgentClass) {
        try {
          const imported = await import('@openai/agents');
          AgentClass = imported.Agent;
          console.log('[MarketingConsole] AgentKit SDK loaded successfully');
        } catch (e) {
          console.error('[MarketingConsole] Failed to load @openai/agents:', e);
          throw new Error('Could not load AgentKit SDK. Ensure @openai/agents is installed.');
        }
      }

      // Initialize Agent
      this.agent = new AgentClass({
        name: 'MarketingConsole',
        model: this.model,
        instructions: this.config.baseInstructions,
        modelSettings: {
          temperature: this.config.temperature || 0.7,
        },
        tools: [], // Start with no tools
        client: this.openai, // CRITICAL: Pass OpenAI client instance
      });

      // Apply all loaded cartridges
      for (const cartridge of this.cartridges.values()) {
        const injection = cartridge.inject();
        const currentTools = this.agent.tools || [];
        
        const updatedConfig: any = {
          tools: [...currentTools, ...injection.tools],
          instructions: `${this.agent.instructions}\n\n${injection.instructions}`,
        };

        if (injection.model) updatedConfig.model = injection.model;
        if (injection.temperature !== undefined) {
          updatedConfig.modelSettings = {
            ...this.agent.modelSettings,
            temperature: injection.temperature,
          };
        }

        this.agent = this.agent.clone(updatedConfig);
        console.log(`[MarketingConsole] Applied cartridge: ${cartridge.name}`);
      }
    }
    return this.agent;
  }

  loadCartridge(cartridge: Cartridge): void {
    console.log(`[MarketingConsole] Storing cartridge: ${cartridge.name} (${cartridge.type})`);
    this.cartridges.set(cartridge.id, cartridge);
  }

  async execute(
    userId: string,
    sessionId: string,
    messages: Message[]
  ): Promise<{ response: string; interactive?: any }> {
    console.log(`[MarketingConsole] Executing for user ${userId}, session ${sessionId}`);

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid messages parameter: expected non-empty array');
    }

    const agent = await this.ensureAgent();

    // --- 1. Context & Memory Setup ---
    let clientId = 'default-client';
    let agencyId = 'revos-agency';

    try {
      const { data: userData } = await this.supabase
        .from('users')
        .select('client_id')
        .eq('id', userId)
        .single();
      if (userData?.client_id) clientId = userData.client_id;
    } catch (error) {
      console.warn('[MarketingConsole] Failed to get client_id:', error);
    }

    const tenantKey = buildTenantKey(agencyId, clientId, userId);
    let memoryContext = '';

    try {
      const latestMessage = messages[messages.length - 1];
      const memories = await searchMemories(tenantKey, latestMessage.content, 10);
      if (memories && memories.length > 0) {
        memoryContext = '\n\n--- RELEVANT CONTEXT FROM PAST CONVERSATIONS ---\n' +
          memories.map((m: any) => `- ${m.memory || m.data?.memory || ''}`).join('\n') + 
          '\n--- END CONTEXT ---\n';
      }
    } catch (error) {
      console.warn('[MarketingConsole] Failed to retrieve memories:', error);
    }

    const context: AgentContext = {
      userId,
      sessionId,
      conversationHistory: messages,
      supabase: this.supabase,
      openai: this.openai,
      metadata: {},
    };

    // --- 2. Agent Execution ---
    try {
      let agentWithMemory = agent;
      if (memoryContext) {
        agentWithMemory = agent.clone({
          instructions: `${agent.instructions}${memoryContext}`,
        });
      }

      // Dynamic import of run function
      const { run } = await import('@openai/agents');

      // Convert messages to AgentKit format (Strictly)
      const agentMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content, // AgentKit v0.3.3 handles strings or arrays
        tool_calls: msg.tool_calls,
        tool_call_id: msg.tool_call_id,
        name: msg.name,
      }));

      console.log('[MarketingConsole] Running AgentKit...');
      
      const result = await run(agentWithMemory, agentMessages, {
        context,
        stream: false,
      });

      console.log('[MarketingConsole] Agent execution complete.');

      // --- 3. Robust Response Extraction ---
      // We handle the various shapes AgentKit might return
      const responseText = this.robustExtractResponse(result);

      // --- 4. Save Memory ---
      try {
        const lastMessage = messages[messages.length - 1];
        await addMemory(
          tenantKey,
          {
            messages: [
              { role: 'user', content: lastMessage.content },
              { role: 'assistant', content: responseText },
            ],
          },
          { session_id: sessionId, timestamp: new Date().toISOString() }
        );
      } catch (memError) {
        console.warn('[MarketingConsole] Failed to save memory:', memError);
      }

      return {
        response: responseText,
        interactive: this.detectInteractiveElements(responseText),
      };

    } catch (error: any) {
      console.error('[MarketingConsole] Execution Failed:', error);
      // Re-throw to let the UI handle the error (or Sentry capture it)
      throw error;
    }
  }

  /**
   * Robustly extracts response text from AgentKit result.
   * Handles known inconsistencies between SDK versions and Model outputs.
   */
  private robustExtractResponse(result: any): string {
    try {
      // 1. Standard SDK Path (v0.3.3+)
      if (result.text) return this.stripMarkdown(result.text);
      
      // 2. Helper for output items (content array vs string)
      const extractContent = (content: any): string | null => {
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
          const textPart = content.find(c => c.type === 'text' || c.type === 'output_text');
          if (textPart?.text) return textPart.text;
        }
        return null;
      };

      // 3. Check 'output' array (Standard AgentOutputItem[])
      if (Array.isArray(result.output)) {
        // Iterate backwards to find last assistant message
        for (let i = result.output.length - 1; i >= 0; i--) {
          const item = result.output[i];
          if (item.role === 'assistant' && item.content) {
            const text = extractContent(item.content);
            if (text) return this.stripMarkdown(text);
          }
        }
      }

      // 4. Check 'newItems' (RunItem[])
      if (Array.isArray(result.newItems)) {
        for (let i = result.newItems.length - 1; i >= 0; i--) {
          const item = result.newItems[i];
          if (item.type === 'message' && item.content) {
             const text = extractContent(item.content);
             if (text) return this.stripMarkdown(text);
          }
        }
      }

      // 5. Check 'modelResponses' (Raw LLM responses)
      if (Array.isArray(result.modelResponses)) {
        const last = result.modelResponses[result.modelResponses.length - 1];
        if (last?.text) return this.stripMarkdown(last.text);
        if (last?.content) {
             const text = extractContent(last.content);
             if (text) return this.stripMarkdown(text);
        }
      }

      // 6. Fallback to JSON dump if everything fails (Better than crashing)
      console.warn('[MarketingConsole] Could not extract text from result structure:', Object.keys(result));
      return "I processed your request, but could not retrieve the final text response. Please check the logs.";

    } catch (e) {
      console.error('[MarketingConsole] Error extracting response:', e);
      return "Error processing agent response.";
    }
  }

  private stripMarkdown(text: string): string {
    return text.replace(/^```(?:json|javascript|typescript)?\n?([\s\S]*?)\n?```$/, '$1').trim();
  }

  private detectInteractiveElements(response: string): any | undefined {
    if (response.includes('SELECT_CAMPAIGN:')) {
      const match = response.match(/SELECT_CAMPAIGN:\s*(\[[\s\S]*?\])/);
      if (match) {
        try { return { type: 'campaign_selector', campaigns: JSON.parse(match[1]) }; } catch (e) {}
      }
    }
    if (response.includes('DECISION:')) {
      const match = response.match(/DECISION:\s*(\[[\s\S]*?\])/);
      if (match) {
        try { return { type: 'decision', options: JSON.parse(match[1]) }; } catch (e) {}
      }
    }
    return undefined;
  }

  getLoadedCartridges(): string[] {
    return Array.from(this.cartridges.values()).map(c => `${c.name} (${c.type})`);
  }

  getCartridge(id: string): Cartridge | undefined {
    return this.cartridges.get(id);
  }

  unloadCartridge(cartridgeId: string): void {
    if (this.cartridges.delete(cartridgeId) && AgentClass) {
      // Rebuild agent to remove tool/instruction
      this.agent = new AgentClass({
        name: 'MarketingConsole',
        model: this.config.model || OPENAI_MODELS.FAST,
        instructions: this.config.baseInstructions,
        modelSettings: { temperature: this.config.temperature || 0.7 },
        tools: [],
        client: this.config.openai,
      });
      // Reload remaining
      for (const cart of this.cartridges.values()) {
        const injection = cart.inject();
        const updated: any = {
            tools: [...(this.agent.tools || []), ...injection.tools],
            instructions: `${this.agent.instructions}\n\n${injection.instructions}`
        };
        this.agent = this.agent.clone(updated);
      }
    }
  }
}
