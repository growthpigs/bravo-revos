/**
 * Marketing Console - The Brain of the AgentKit System
 *
 * Manages cartridges, orchestrates agent execution, and coordinates
 * the entire MarketingConsole ecosystem.
 *
 * Philosophy: Console loads cartridges. AgentKit orchestrates. Chips execute.
 */

// Dynamic imports to prevent build-time tiktoken execution
import { Cartridge, AgentContext, Message } from '@/lib/cartridges/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { buildTenantKey } from '@/lib/mem0/client';
import { searchMemories, addMemory } from '@/lib/mem0/memory';

// Store Agent class after first dynamic import
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

  constructor(config: MarketingConsoleConfig) {
    this.config = config;
    this.openai = config.openai;
    this.supabase = config.supabase;

    console.log('[MarketingConsole] Initialized (AgentKit lazy-loaded to prevent build-time execution)');
  }

  /**
   * Lazy-load AgentKit Agent (prevents build-time encoder.json loading)
   */
  private async ensureAgent(): Promise<any> {
    if (!this.agent) {
      // Store Agent class for reuse
      if (!AgentClass) {
        const imported = await import('@openai/agents');
        AgentClass = imported.Agent;
      }
      this.agent = new AgentClass({
        name: 'MarketingConsole',
        model: this.config.model || 'gpt-4o-mini',
        instructions: this.config.baseInstructions,
        modelSettings: {
          temperature: this.config.temperature || 0.7,
        },
        tools: [], // Start with no tools
      });

      // Apply all loaded cartridges to the agent
      for (const cartridge of this.cartridges.values()) {
        const injection = cartridge.inject();

        const currentTools = this.agent.tools || [];
        const updatedConfig: any = {
          tools: [...currentTools, ...injection.tools],
          instructions: `${this.agent.instructions}\n\n${injection.instructions}`,
        };

        if (injection.model) {
          updatedConfig.model = injection.model;
        }

        if (injection.temperature !== undefined) {
          updatedConfig.modelSettings = {
            ...this.agent.modelSettings,
            temperature: injection.temperature,
          };
        }

        this.agent = this.agent.clone(updatedConfig);
        console.log(`[MarketingConsole] Applied cartridge: ${cartridge.name}`);
      }

      console.log('[MarketingConsole] AgentKit agent initialized with cartridges');
    }
    return this.agent;
  }

  /**
   * Load a cartridge into the console
   *
   * Cartridges are stored and applied lazily when agent is initialized.
   */
  loadCartridge(cartridge: Cartridge): void {
    console.log(`[MarketingConsole] Storing cartridge: ${cartridge.name} (${cartridge.type})`);
    this.cartridges.set(cartridge.id, cartridge);
    console.log(`[MarketingConsole] Cartridge stored (will be applied on first execute())`);
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

    // Ensure agent is initialized (lazy-loaded to prevent build-time execution)
    const agent = await this.ensureAgent();

    // STEP 1: Get user's client_id for tenant scoping
    let clientId = 'default-client';
    let agencyId = 'revos-agency';

    try {
      const { data: userData } = await this.supabase
        .from('users')
        .select('client_id')
        .eq('id', userId)
        .single();

      if (userData?.client_id) {
        clientId = userData.client_id;
      }
    } catch (error) {
      console.warn('[MarketingConsole] Failed to get client_id, using default:', error);
    }

    // STEP 2: Build tenant key for memory isolation
    const tenantKey = buildTenantKey(agencyId, clientId, userId);
    console.log(`[MarketingConsole] Tenant key: ${tenantKey}`);

    // STEP 3: Retrieve relevant memories from Mem0
    let memoryContext = '';
    try {
      const latestMessage = messages[messages.length - 1];
      const memories = await searchMemories(tenantKey, latestMessage.content, 10);

      if (memories && memories.length > 0) {
        console.log(`[MarketingConsole] Retrieved ${memories.length} memories from Mem0`);

        // Format memories for injection
        memoryContext = '\n\n--- RELEVANT CONTEXT FROM PAST CONVERSATIONS ---\n' +
          memories
            .map((m: any) => {
              const memoryText = m.memory || m.data?.memory || '';
              return `- ${memoryText}`;
            })
            .join('\n') +
          '\n--- END CONTEXT ---\n';
      }
    } catch (error) {
      console.warn('[MarketingConsole] Failed to retrieve memories:', error);
      // Continue without memories (graceful degradation)
    }

    // STEP 4: Create agent context for chip execution
    const context: AgentContext = {
      userId,
      sessionId,
      conversationHistory: messages,
      supabase: this.supabase,
      openai: this.openai,
      metadata: {},
    };

    try {
      // STEP 5: Clone agent with memory-enhanced instructions
      let agentWithMemory = agent;
      if (memoryContext) {
        agentWithMemory = agent.clone({
          instructions: `${agent.instructions}${memoryContext}`,
        });
      }

      // STEP 6: Run agent using AgentKit's run() function (dynamic import)
      const { run } = await import('@openai/agents');
      const result = await run(
        agentWithMemory,
        this.convertMessagesToAgentFormat(messages),
        {
          context, // Pass context to tools
          stream: false,
        }
      );

      console.log('[MarketingConsole] Agent execution complete');

      // Extract response text
      const responseText = this.extractResponseText(result);

      // STEP 7: Save new memories to Mem0
      try {
        await addMemory(
          tenantKey,
          {
            messages: [
              { role: 'user', content: messages[messages.length - 1].content },
              { role: 'assistant', content: responseText },
            ],
          },
          {
            session_id: sessionId,
            timestamp: new Date().toISOString(),
          }
        );
        console.log('[MarketingConsole] Saved conversation to Mem0');
      } catch (error) {
        console.warn('[MarketingConsole] Failed to save memories:', error);
        // Don't fail request on memory save failure
      }

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
   * Safe JSON stringify that avoids circular references
   */
  private safeStringify(obj: any): string {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      // Filter out circular reference properties
      if (key === 'supabase' || key === 'openai' || key === 'client' || key === 'auth') {
        return '[Filtered]';
      }
      // Detect circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    });
  }

  /**
   * Strip markdown code blocks from text
   *
   * AgentKit often wraps responses in ```json\n...\n```
   */
  private stripMarkdownCodeBlocks(text: string): string {
    // Remove markdown code blocks: ```json\n...\n``` or ```\n...\n```
    const codeBlockPattern = /^```(?:json|javascript|typescript)?\n?([\s\S]*?)\n?```$/;
    const match = text.trim().match(codeBlockPattern);
    if (match) {
      console.log('[MarketingConsole] 🧹 Stripped markdown code block wrapper');
      return match[1].trim();
    }
    return text;
  }

  /**
   * Extract response text from agent result
   *
   * AgentKit returns complex result object - extract the text.
   */
  private extractResponseText(result: any): string {
    // 🔍 DIAGNOSTIC: Log the ENTIRE result object
    console.log('[DIAGNOSTIC] ==========================================');
    console.log('[DIAGNOSTIC] Full result object keys:', Object.keys(result));
    console.log('[DIAGNOSTIC] Full result structure:', this.safeStringify(result).substring(0, 5000));
    console.log('[DIAGNOSTIC] ==========================================');

    // 🔍 TEMPORARY DEBUG: Return the full result as JSON so we can see it in frontend
    if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') {
      console.log('[DEBUG] Returning full result for inspection');
      return JSON.stringify(result, null, 2).substring(0, 1000);
    }

    // Log what we're checking for
    console.log('[DIAGNOSTIC] Checking result.final_output:', !!result.final_output);
    console.log('[DIAGNOSTIC] Checking result.state:', !!result.state);
    console.log('[DIAGNOSTIC] Checking result.state?.modelResponses:', !!result.state?.modelResponses);

    // If modelResponses exists, log its structure
    if (result.state?.modelResponses?.[0]) {
        const firstResponse = result.state.modelResponses[0];
        console.log('[DIAGNOSTIC] First modelResponse keys:', Object.keys(firstResponse));
        console.log('[DIAGNOSTIC] First modelResponse:', this.safeStringify(firstResponse).substring(0, 2000));

        if (firstResponse.output?.[0]) {
            const firstOutput = firstResponse.output[0];
            console.log('[DIAGNOSTIC] First output keys:', Object.keys(firstOutput));
            console.log('[DIAGNOSTIC] First output:', this.safeStringify(firstOutput).substring(0, 2000));

            if (firstOutput.content) {
                console.log('[DIAGNOSTIC] Content array length:', firstOutput.content.length);
                firstOutput.content.forEach((item: any, idx: number) => {
                    console.log(`[DIAGNOSTIC] Content[${idx}] type:`, item.type);
                    console.log(`[DIAGNOSTIC] Content[${idx}] keys:`, Object.keys(item));
                    console.log(`[DIAGNOSTIC] Content[${idx}] full:`, this.safeStringify(item).substring(0, 1000));
                });
            }
        }
    }

    // Log the structure for debugging
    console.log('[MarketingConsole] ==== EXTRACTING RESPONSE ====');
    console.log('[MarketingConsole] Result keys:', Object.keys(result || {}));
    console.log('[MarketingConsole] Has final_output:', !!result?.final_output);
    console.log('[MarketingConsole] final_output type:', typeof result?.final_output);

    // NEW AgentKit SDK: Check for final_output first (PRIMARY PATH)
    if (result?.final_output !== undefined && result?.final_output !== null) {
      console.log('[MarketingConsole] Using final_output path');

      // Case 1: final_output is a string (most common)
      if (typeof result.final_output === 'string') {
        console.log('[MarketingConsole] ✅ final_output is string');
        return this.stripMarkdownCodeBlocks(result.final_output);
      }

      // Case 2: final_output is a Pydantic model or object with content property
      if (typeof result.final_output === 'object') {
        if (result.final_output.content) {
          console.log('[MarketingConsole] ✅ final_output.content found');
          return this.stripMarkdownCodeBlocks(result.final_output.content);
        }
        if (result.final_output.text) {
          console.log('[MarketingConsole] ✅ final_output.text found');
          return this.stripMarkdownCodeBlocks(result.final_output.text);
        }
        // Stringify the whole object as fallback
        console.log('[MarketingConsole] ✅ Stringifying final_output object');
        return JSON.stringify(result.final_output, null, 2);
      }

      // Case 3: Other types - convert to string
      console.log('[MarketingConsole] ✅ Converting final_output to string');
      return this.stripMarkdownCodeBlocks(String(result.final_output));
    }

    // FALLBACK: OLD SDK structure (result.state.modelResponses)
    console.log('[MarketingConsole] Trying fallback paths...');

    if (result?.state?.modelResponses && Array.isArray(result.state.modelResponses)) {
      const lastResponse = result.state.modelResponses[result.state.modelResponses.length - 1];

      if (lastResponse?.output && Array.isArray(lastResponse.output) && lastResponse.output[0]) {
        const outputItem = lastResponse.output[0];
        if (outputItem.content && Array.isArray(outputItem.content)) {
          for (const contentItem of outputItem.content) {
            // Handle both 'text' and 'output_text' types from AgentKit
            if ((contentItem.type === 'text' || contentItem.type === 'output_text') && contentItem.text) {
              console.log('[MarketingConsole] ✅ Found at output[0].content[].text');
              return this.stripMarkdownCodeBlocks(contentItem.text);
            }
          }
        }
      }

      if (lastResponse?.content) {
        console.log('[MarketingConsole] ✅ Found at content');
        return this.stripMarkdownCodeBlocks(lastResponse.content);
      }

      if (lastResponse?.message?.content) {
        if (Array.isArray(lastResponse.message.content)) {
          for (const part of lastResponse.message.content) {
            if (part.type === 'text' && part.text) {
              console.log('[MarketingConsole] ✅ Found at message.content[].text');
              return this.stripMarkdownCodeBlocks(part.text);
            }
          }
        }
        if (typeof lastResponse.message.content === 'string') {
          console.log('[MarketingConsole] ✅ Found at message.content (string)');
          return this.stripMarkdownCodeBlocks(lastResponse.message.content);
        }
      }
    }

    // messages array
    if (Array.isArray(result.messages)) {
      const lastMessage = result.messages[result.messages.length - 1];
      if (lastMessage?.content) {
        console.log('[MarketingConsole] ✅ Found at messages[].content');
        return this.stripMarkdownCodeBlocks(lastMessage.content);
      }
    }

    // Direct string
    if (typeof result === 'string') {
      console.log('[MarketingConsole] ✅ Result is direct string');
      return this.stripMarkdownCodeBlocks(result);
    }

    console.error('[MarketingConsole] ❌ EXTRACTION FAILED - No valid path found');
    console.error('[MarketingConsole] Result structure:', this.safeStringify(result).substring(0, 2000));
    return 'Error: Could not extract response text from AgentKit result';
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
   * Removes a cartridge and rebuilds the agent with remaining cartridges.
   */
  unloadCartridge(cartridgeId: string): void {
    console.log(`[MarketingConsole] Unloading cartridge: ${cartridgeId}`);

    const cartridge = this.cartridges.get(cartridgeId);
    if (!cartridge) {
      console.warn(`[MarketingConsole] Cartridge ${cartridgeId} not found`);
      return;
    }

    // Remove from map
    this.cartridges.delete(cartridgeId);

    // Rebuild agent from scratch with base configuration
    // Use stored Agent class (loaded via dynamic import in ensureAgent)
    if (!AgentClass) {
      throw new Error('[MarketingConsole] Agent not loaded - call execute() first');
    }
    this.agent = new AgentClass({
      name: 'MarketingConsole',
      model: this.config.model || 'gpt-4o-mini',
      instructions: this.config.baseInstructions,
      modelSettings: {
        temperature: this.config.temperature || 0.7,
      },
      tools: [],
    });

    // Reload all remaining cartridges
    for (const [_, cart] of this.cartridges) {
      const injection = cart.inject();
      const currentTools = this.agent.tools || [];
      const updatedConfig: any = {
        tools: [...currentTools, ...injection.tools],
        instructions: `${this.agent.instructions}\n\n${injection.instructions}`,
      };

      if (injection.model) {
        updatedConfig.model = injection.model;
      }

      if (injection.temperature !== undefined) {
        updatedConfig.modelSettings = {
          ...this.agent.modelSettings,
          temperature: injection.temperature,
        };
      }

      this.agent = this.agent.clone(updatedConfig);
    }

    console.log(
      `[MarketingConsole] Cartridge unloaded. Remaining tools: ${this.agent.tools.length}`
    );
  }
}
