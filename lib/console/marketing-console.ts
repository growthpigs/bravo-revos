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
import { OPENAI_MODELS } from '@/lib/config/openai-models';

// Store Agent class after first dynamic import
let AgentClass: any | null = null;

// ⚠️ CRITICAL: AgentKit version that is known to work
// If this version changes, the extraction paths may break
const EXPECTED_AGENTKIT_VERSION = '0.3.0';
let agentKitVersionChecked = false;

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
  private model: string; // Extracted for easier access and validation

  constructor(config: MarketingConsoleConfig) {
    // Validate model is provided and not undefined
    if (!config.model) {
      console.error('[MarketingConsole] No model provided in config. Config:', config);
      throw new Error('MarketingConsole requires a valid model. Received: undefined. Check OPENAI_MODELS import.');
    }

    this.config = config;
    this.openai = config.openai;
    this.supabase = config.supabase;
    this.model = config.model;

    console.log('[MarketingConsole] Initialized with model:', this.model, '(AgentKit lazy-loaded to prevent build-time execution)');
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

        // Version check - warn if AgentKit version changed
        if (!agentKitVersionChecked) {
          agentKitVersionChecked = true;
          try {
            // Read package.json using fs to avoid module export restrictions
            const fs = await import('fs');
            const path = await import('path');
            const pkgPath = path.join(process.cwd(), 'node_modules', '@openai', 'agents', 'package.json');
            const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            const currentVersion = pkgJson.version;
            if (currentVersion !== EXPECTED_AGENTKIT_VERSION) {
              console.warn(`⚠️ [MarketingConsole] AgentKit version changed: expected ${EXPECTED_AGENTKIT_VERSION}, got ${currentVersion}`);
              console.warn(`⚠️ [MarketingConsole] Response extraction paths may break - test immediately!`);
            } else {
              console.log(`[MarketingConsole] ✅ AgentKit version verified: ${currentVersion}`);
            }
          } catch (e) {
            console.warn('[MarketingConsole] Could not verify AgentKit version:', e);
          }
        }
      }
      this.agent = new AgentClass({
        name: 'MarketingConsole',
        model: this.model, // Validated in constructor, no fallback needed
        instructions: this.config.baseInstructions,
        modelSettings: {
          temperature: this.config.temperature || 0.7,
        },
        tools: [], // Start with no tools
        client: this.openai, // CRITICAL: Must pass OpenAI client instance to AgentKit
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

    // Defensive check: ensure messages is an array
    if (!Array.isArray(messages)) {
      console.error('[MarketingConsole] execute() received non-array messages:', typeof messages);
      throw new Error('Invalid messages parameter: expected array');
    }

    // Defensive check: ensure messages has at least one item
    if (messages.length === 0) {
      console.error('[MarketingConsole] execute() received empty messages array');
      throw new Error('Invalid messages parameter: array is empty');
    }

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

      let result;
      try {
        console.log('[MarketingConsole] AgentKit setup:', {
          hasClient: !!agentWithMemory.client,
          clientType: agentWithMemory.client?.constructor?.name,
          model: agentWithMemory.model,
        });
        result = await run(
          agentWithMemory,
          this.convertMessagesToAgentFormat(messages),
          {
            context, // Pass context to tools
            stream: false,
          }
        );
        console.log('[MarketingConsole] Agent execution complete');
      } catch (agentError: any) {
        // Enhanced error logging for AgentKit/OpenAI API failures
        console.error('[MarketingConsole] AgentKit run() failed:', {
          errorMessage: agentError.message,
          errorName: agentError.name,
          errorType: agentError.constructor.name,
          model: this.model,
          apiError: agentError.error || agentError.response?.data || null,
          statusCode: agentError.status || agentError.response?.status || null,
        });

        // Provide helpful error message based on error type
        if (agentError.message?.includes('content.map')) {
          throw new Error(`OpenAI API response format error (possibly model incompatibility). Model: ${this.model}. Original error: ${agentError.message}`);
        } else if (agentError.status === 404 || agentError.message?.includes('model')) {
          throw new Error(`Invalid or unsupported model: ${this.model}. API error: ${agentError.message}`);
        } else {
          throw new Error(`AgentKit execution failed: ${agentError.message}`);
        }
      }

      // Extract response text
      const responseText = this.extractResponseText(result);

      // STEP 7: Save new memories to Mem0
      try {
        // Defensive check: ensure messages array still has items before accessing
        const lastMessage = Array.isArray(messages) && messages.length > 0
          ? messages[messages.length - 1]
          : null;

        if (lastMessage) {
          await addMemory(
            tenantKey,
            {
              messages: [
                { role: 'user', content: lastMessage.content },
                { role: 'assistant', content: responseText },
              ],
            },
            {
              session_id: sessionId,
              timestamp: new Date().toISOString(),
            }
          );
          console.log('[MarketingConsole] Saved conversation to Mem0');
        } else {
          console.warn('[MarketingConsole] Could not save memories: no messages to save');
        }
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
    // Defensive check: ensure messages is an array
    if (!Array.isArray(messages)) {
      console.error('[MarketingConsole] convertMessagesToAgentFormat received non-array:', typeof messages);
      return [];
    }

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
    // 🔍 CRITICAL DIAGNOSTICS - CTO's analysis
    console.log('🔍 [EXTRACTION_START] Full result type:', typeof result);
    console.log('🔍 [EXTRACTION_START] Result keys:', Object.keys(result || {}));
    console.log('🔍 [EXTRACTION_START] Is array?:', Array.isArray(result));

    // Check for various fields that might contain topics
    if (result?.choices) {
      console.log('🔍 [HAS_CHOICES] choices:', JSON.stringify(result.choices).substring(0, 500));
    }
    if (result?.topics) {
      console.log('🔍 [HAS_TOPICS] topics:', JSON.stringify(result.topics).substring(0, 500));
    }
    if (result?.options) {
      console.log('🔍 [HAS_OPTIONS] options:', JSON.stringify(result.options).substring(0, 500));
    }
    if (result?.output) {
      console.log('🔍 [HAS_OUTPUT] output type:', typeof result.output);
      console.log('🔍 [HAS_OUTPUT] is array?:', Array.isArray(result.output));
      if (typeof result.output === 'string') {
        console.log('🔍 [HAS_OUTPUT] string value:', result.output.substring(0, 500));
      } else {
        console.log('🔍 [HAS_OUTPUT] value:', JSON.stringify(result.output).substring(0, 500));
      }
    }

    // Check modelResponses structure
    if (result?.modelResponses) {
      console.log('🔍 [MODEL_RESPONSES] Length:', result.modelResponses.length);
      console.log('🔍 [MODEL_RESPONSES] First item keys:', Object.keys(result.modelResponses[0] || {}));
      const lastResp = result.modelResponses[result.modelResponses.length - 1];
      console.log('🔍 [MODEL_RESPONSES] Last item keys:', Object.keys(lastResp || {}));
      if (lastResp?.text) {
        console.log('🔍 [MODEL_RESPONSES] Last text:', lastResp.text.substring(0, 500));
      }
      if (lastResp?.content) {
        console.log('🔍 [MODEL_RESPONSES] Last content:', JSON.stringify(lastResp.content).substring(0, 500));
      }
      if (lastResp?.message) {
        console.log('🔍 [MODEL_RESPONSES] Last message:', JSON.stringify(lastResp.message).substring(0, 500));
      }
    }

    // Check new_items which might have the response in newer AgentKit versions
    if (result?.new_items) {
      console.log('🔍 [HAS_NEW_ITEMS] count:', result.new_items.length);
      result.new_items.forEach((item: any, i: number) => {
        console.log(`🔍 [NEW_ITEM_${i}] type:`, item.type || typeof item);
        console.log(`🔍 [NEW_ITEM_${i}] keys:`, Object.keys(item || {}));
        if (item.content) {
          console.log(`🔍 [NEW_ITEM_${i}] content:`, JSON.stringify(item.content).substring(0, 300));
        }
      });
    }

    // 🔍 DIAGNOSTIC: Log the ENTIRE result object (for debugging)
    console.log('[DIAGNOSTIC] Full result object keys:', Object.keys(result));
    console.log('[DIAGNOSTIC] Full result structure (first 5000 chars):', this.safeStringify(result).substring(0, 5000));

    // Log the structure for debugging
    console.log('[MarketingConsole] ==== EXTRACTING RESPONSE ====');
    console.log('[MarketingConsole] Result keys:', Object.keys(result || {}));
    console.log('[MarketingConsole] Has finalOutput:', !!result?.finalOutput);
    console.log('[MarketingConsole] Has output:', !!result?.output);
    console.log('[MarketingConsole] Has newItems:', !!result?.newItems);

    // PRIORITY 1: Check result.output (Array of AgentOutputItem - the actual response)
    // This is the primary path for @openai/agents SDK
    if (result?.output && Array.isArray(result.output) && result.output.length > 0) {
      console.log('[MarketingConsole] Checking result.output array, length:', result.output.length);

      // Find the last message item (role: 'assistant')
      for (let i = result.output.length - 1; i >= 0; i--) {
        const item = result.output[i];
        console.log(`[MarketingConsole] output[${i}] role:`, item.role, 'type:', item.type);

        if (item.role === 'assistant' && item.content) {
          // Content can be string or array of content parts
          if (typeof item.content === 'string') {
            console.log('[MarketingConsole] ✅ Found at output[].content (string)');
            return this.stripMarkdownCodeBlocks(item.content);
          }
          if (Array.isArray(item.content)) {
            for (const part of item.content) {
              if (part.type === 'text' && part.text) {
                console.log('[MarketingConsole] ✅ Found at output[].content[].text');
                return this.stripMarkdownCodeBlocks(part.text);
              }
              if (part.type === 'output_text' && part.text) {
                console.log('[MarketingConsole] ✅ Found at output[].content[] (output_text)');
                return this.stripMarkdownCodeBlocks(part.text);
              }
            }
          }
        }
      }
    }

    // PRIORITY 2: Check result.finalOutput (camelCase - correct SDK property name)
    if (result?.finalOutput !== undefined && result?.finalOutput !== null) {
      console.log('[MarketingConsole] Using finalOutput path');

      if (typeof result.finalOutput === 'string') {
        console.log('[MarketingConsole] ✅ finalOutput is string');
        return this.stripMarkdownCodeBlocks(result.finalOutput);
      }

      if (typeof result.finalOutput === 'object') {
        if (result.finalOutput.content) {
          console.log('[MarketingConsole] ✅ finalOutput.content found');
          return this.stripMarkdownCodeBlocks(result.finalOutput.content);
        }
        if (result.finalOutput.text) {
          console.log('[MarketingConsole] ✅ finalOutput.text found');
          return this.stripMarkdownCodeBlocks(result.finalOutput.text);
        }
        console.log('[MarketingConsole] ✅ Stringifying finalOutput object');
        return JSON.stringify(result.finalOutput, null, 2);
      }

      console.log('[MarketingConsole] ✅ Converting finalOutput to string');
      return this.stripMarkdownCodeBlocks(String(result.finalOutput));
    }

    // PRIORITY 3: Check result.newItems (RunItem[] - includes messages)
    if (result?.newItems && Array.isArray(result.newItems) && result.newItems.length > 0) {
      console.log('[MarketingConsole] Checking result.newItems array, length:', result.newItems.length);

      for (let i = result.newItems.length - 1; i >= 0; i--) {
        const item = result.newItems[i];
        console.log(`[MarketingConsole] newItems[${i}] type:`, item.type);

        if (item.type === 'message' && item.content) {
          if (typeof item.content === 'string') {
            console.log('[MarketingConsole] ✅ Found at newItems[].content (string)');
            return this.stripMarkdownCodeBlocks(item.content);
          }
          if (Array.isArray(item.content)) {
            for (const part of item.content) {
              if ((part.type === 'text' || part.type === 'output_text') && part.text) {
                console.log('[MarketingConsole] ✅ Found at newItems[].content[].text');
                return this.stripMarkdownCodeBlocks(part.text);
              }
            }
          }
        }
      }
    }

    // LEGACY: Check for snake_case final_output (older SDK versions)
    if (result?.final_output !== undefined && result?.final_output !== null) {
      console.log('[MarketingConsole] Using legacy final_output path');
      if (typeof result.final_output === 'string') {
        return this.stripMarkdownCodeBlocks(result.final_output);
      }
      if (typeof result.final_output === 'object' && result.final_output.content) {
        return this.stripMarkdownCodeBlocks(result.final_output.content);
      }
    }

    // AGENTKIT SDK: result.modelResponses (TOP LEVEL, not in state!)
    console.log('[MarketingConsole] Trying AgentKit modelResponses path...');

    if (result?.modelResponses && Array.isArray(result.modelResponses)) {
      const lastResponse = result.modelResponses[result.modelResponses.length - 1];

      // Direct text property on modelResponse (AgentKit @openai/agents)
      if (lastResponse?.text && typeof lastResponse.text === 'string') {
        console.log('[MarketingConsole] ✅ Found at modelResponses[].text (AgentKit SDK)');
        return this.stripMarkdownCodeBlocks(lastResponse.text);
      }
    }

    // FALLBACK: OLD SDK structure (result.state.modelResponses)
    console.log('[MarketingConsole] Trying fallback state.modelResponses path...');

    if (result?.state?.modelResponses && Array.isArray(result.state.modelResponses)) {
      const lastResponse = result.state.modelResponses[result.state.modelResponses.length - 1];

      // Direct text property on modelResponse
      if (lastResponse?.text && typeof lastResponse.text === 'string') {
        console.log('[MarketingConsole] ✅ Found at state.modelResponses[].text');
        return this.stripMarkdownCodeBlocks(lastResponse.text);
      }

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
      model: this.config.model || OPENAI_MODELS.FAST,
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
