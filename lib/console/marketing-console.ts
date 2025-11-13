/**
 * Marketing Console - The Brain of the AgentKit System
 *
 * Manages cartridges, orchestrates agent execution, and coordinates
 * the entire MarketingConsole ecosystem.
 *
 * Philosophy: Console loads cartridges. AgentKit orchestrates. Chips execute.
 */

import { Agent, run } from '@openai/agents';
import { Cartridge, AgentContext, Message } from '@/lib/cartridges/types';
import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';

export interface MarketingConsoleConfig {
  model?: string;
  temperature?: number;
  baseInstructions: string;
  openai: OpenAI;
  supabase: SupabaseClient;
}

export class MarketingConsole {
  private agent: Agent;
  private cartridges: Map<string, Cartridge> = new Map();
  private config: MarketingConsoleConfig;
  private openai: OpenAI;
  private supabase: SupabaseClient;

  constructor(config: MarketingConsoleConfig) {
    this.config = config;
    this.openai = config.openai;
    this.supabase = config.supabase;

    // Initialize AgentKit agent with base config
    this.agent = new Agent({
      name: 'MarketingConsole',
      model: config.model || 'gpt-4o-mini',
      instructions: config.baseInstructions,
      modelSettings: {
        temperature: config.temperature || 0.7,
      },
      tools: [], // Start with no tools
    });

    console.log('[MarketingConsole] Initialized with base configuration');
  }

  /**
   * Load a cartridge into the console
   *
   * Cartridges inject tools and instructions into the agent.
   */
  loadCartridge(cartridge: Cartridge): void {
    console.log(`[MarketingConsole] Loading cartridge: ${cartridge.name} (${cartridge.type})`);

    // Store cartridge
    this.cartridges.set(cartridge.id, cartridge);

    // Inject cartridge capabilities
    const injection = cartridge.inject();

    // Create updated agent config using clone()
    const currentTools = this.agent.tools || [];
    const updatedConfig: any = {
      tools: [...currentTools, ...injection.tools],
      instructions: `${this.agent.instructions}\n\n${injection.instructions}`,
    };

    // Override model if cartridge specifies
    if (injection.model) {
      updatedConfig.model = injection.model;
    }

    // Override temperature if cartridge specifies
    if (injection.temperature !== undefined) {
      updatedConfig.modelSettings = {
        ...this.agent.modelSettings,
        temperature: injection.temperature,
      };
    }

    // Clone agent with updated configuration
    this.agent = this.agent.clone(updatedConfig);

    console.log(`[MarketingConsole] Cartridge loaded. Total tools: ${this.agent.tools.length}`);
  }

  /**
   * Execute user message through the agent
   *
   * @param userId - Authenticated user ID
   * @param sessionId - Session identifier
   * @param messages - Conversation history
   * @returns Agent's response
   */
  async execute(
    userId: string,
    sessionId: string,
    messages: Message[]
  ): Promise<{
    response: string;
    interactive?: any;
  }> {
    console.log(`[MarketingConsole] Executing for user ${userId}, session ${sessionId}`);
    console.log(`[MarketingConsole] Message count: ${messages.length}`);

    // Create agent context for chip execution
    const context: AgentContext = {
      userId,
      sessionId,
      conversationHistory: messages,
      supabase: this.supabase,
      openai: this.openai,
      metadata: {},
    };

    try {
      // Run agent using AgentKit's run() function
      const result = await run(
        this.agent,
        this.convertMessagesToAgentFormat(messages),
        {
          context, // Pass context to tools
          stream: false,
        }
      );

      console.log('[MarketingConsole] Agent execution complete');

      // Extract response text
      const responseText = this.extractResponseText(result);

      // Check if response contains interactive elements
      const interactive = this.detectInteractiveElements(responseText);

      return {
        response: responseText,
        interactive,
      };
    } catch (error) {
      console.error('[MarketingConsole] Execution error:', error);
      throw error;
    }
  }

  /**
   * Convert Message[] to AgentKit format
   *
   * AgentKit expects specific message format.
   */
  private convertMessagesToAgentFormat(messages: Message[]): any[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      tool_calls: msg.tool_calls,
      tool_call_id: msg.tool_call_id,
      name: msg.name,
    }));
  }

  /**
   * Extract response text from agent result
   *
   * AgentKit returns complex result object - extract the text.
   */
  private extractResponseText(result: any): string {
    // AgentKit returns messages array
    if (Array.isArray(result.messages)) {
      const lastMessage = result.messages[result.messages.length - 1];
      if (lastMessage?.content) {
        return lastMessage.content;
      }
    }

    // Fallback
    if (typeof result === 'string') {
      return result;
    }

    return JSON.stringify(result);
  }

  /**
   * Detect interactive elements in response
   *
   * Preserves compatibility with FloatingChatBar's interactive workflows.
   */
  private detectInteractiveElements(response: string): any | undefined {
    // Check for campaign selector pattern
    if (response.includes('SELECT_CAMPAIGN:')) {
      const match = response.match(/SELECT_CAMPAIGN:\s*(\[[\s\S]*?\])/);
      if (match) {
        try {
          const campaigns = JSON.parse(match[1]);
          return {
            type: 'campaign_selector',
            campaigns,
          };
        } catch (e) {
          console.error('[MarketingConsole] Failed to parse campaign selector:', e);
        }
      }
    }

    // Check for decision buttons pattern
    if (response.includes('DECISION:')) {
      const match = response.match(/DECISION:\s*(\[[\s\S]*?\])/);
      if (match) {
        try {
          const options = JSON.parse(match[1]);
          return {
            type: 'decision',
            options,
          };
        } catch (e) {
          console.error('[MarketingConsole] Failed to parse decision buttons:', e);
        }
      }
    }

    return undefined;
  }

  /**
   * Get list of loaded cartridges
   */
  getLoadedCartridges(): string[] {
    return Array.from(this.cartridges.values()).map(
      (c) => `${c.name} (${c.type})`
    );
  }

  /**
   * Get cartridge by ID
   */
  getCartridge(id: string): Cartridge | undefined {
    return this.cartridges.get(id);
  }

  /**
   * Unload a cartridge
   *
   * Note: This requires rebuilding the agent. Not implemented yet.
   */
  unloadCartridge(cartridgeId: string): void {
    console.log(`[MarketingConsole] Unloading cartridge ${cartridgeId} not yet implemented`);
    // TODO: Implement cartridge unloading by rebuilding agent
  }
}
