/**
 * CartridgeLoader - The Brain of the Cartridge System
 *
 * Manages cartridge lifecycle (load, activate, deactivate) and coordinates
 * cartridge hooks across the agent lifecycle.
 *
 * Philosophy: Cartridges inject capabilities, loader orchestrates them.
 */

import {
  BaseCartridge,
  CartridgeTool,
  AgentContext,
  SlashCommand,
} from './types';

export class CartridgeLoader {
  private cartridges: Map<string, BaseCartridge> = new Map();
  private activeCartridges: Set<string> = new Set();

  /**
   * Load a cartridge into the registry
   *
   * Validates cartridge and calls onLoad lifecycle hook.
   * Does NOT activate - call activate() separately.
   */
  async load(cartridge: BaseCartridge): Promise<void> {
    // Validate if cartridge provides validation
    if (cartridge.validate && !cartridge.validate()) {
      throw new Error(`Cartridge ${cartridge.name} (${cartridge.id}) validation failed`);
    }

    // Store cartridge
    this.cartridges.set(cartridge.id, cartridge);

    // Call lifecycle hook
    if (cartridge.onLoad) {
      await cartridge.onLoad();
    }

    console.log(`[CartridgeLoader] Loaded cartridge: ${cartridge.name} (${cartridge.id})`);
  }

  /**
   * Activate a cartridge
   *
   * Makes cartridge participate in agent lifecycle.
   */
  async activate(cartridgeId: string): Promise<void> {
    const cartridge = this.cartridges.get(cartridgeId);
    if (!cartridge) {
      throw new Error(`Cartridge ${cartridgeId} not found. Load it first with load().`);
    }

    this.activeCartridges.add(cartridgeId);
    console.log(`[CartridgeLoader] Activated cartridge: ${cartridge.name}`);
  }

  /**
   * Deactivate a cartridge
   *
   * Removes cartridge from agent lifecycle and calls onUnload hook.
   */
  async deactivate(cartridgeId: string): Promise<void> {
    const cartridge = this.cartridges.get(cartridgeId);
    if (cartridge?.onUnload) {
      await cartridge.onUnload();
    }

    this.activeCartridges.delete(cartridgeId);
    console.log(`[CartridgeLoader] Deactivated cartridge: ${cartridge?.name || cartridgeId}`);
  }

  /**
   * Get all tools from active cartridges
   *
   * Merges tools from all active cartridges.
   * Filters by isEnabled if provided.
   */
  getTools(context: AgentContext): CartridgeTool[] {
    const tools: CartridgeTool[] = [];

    for (const cartridgeId of this.activeCartridges) {
      const cartridge = this.cartridges.get(cartridgeId);
      if (cartridge?.tools) {
        // Filter by isEnabled
        const enabledTools = cartridge.tools.filter(tool =>
          !tool.isEnabled || tool.isEnabled(context)
        );
        tools.push(...enabledTools);
      }
    }

    console.log(`[CartridgeLoader] Collected ${tools.length} tools from ${this.activeCartridges.size} active cartridges`);
    return tools;
  }

  /**
   * Get merged instructions from all active cartridges
   *
   * Augments base instructions with cartridge-specific instructions.
   */
  getInstructions(baseInstructions: string): string {
    let instructions = baseInstructions;

    for (const cartridgeId of this.activeCartridges) {
      const cartridge = this.cartridges.get(cartridgeId);
      if (cartridge?.instructions) {
        instructions += '\n\n' + cartridge.instructions;
      }
    }

    return instructions;
  }

  /**
   * Pre-process input through all cartridges
   *
   * Runs input through each cartridge's preProcess hook sequentially.
   * If any cartridge returns skipAgent: true, stops and returns immediately.
   */
  async preProcess(
    input: string,
    context: AgentContext
  ): Promise<{
    input: string;
    skipAgent?: boolean;
    immediateResponse?: string;
  }> {
    let currentInput = input;

    for (const cartridgeId of this.activeCartridges) {
      const cartridge = this.cartridges.get(cartridgeId);
      if (cartridge?.preProcess) {
        console.log(`[CartridgeLoader] Pre-processing through ${cartridge.name}...`);
        const result = await cartridge.preProcess(currentInput, context);
        currentInput = result.input;

        // If cartridge says skip agent, return immediately
        if (result.skipAgent) {
          console.log(`[CartridgeLoader] ${cartridge.name} intercepted - skipping agent`);
          return result;
        }
      }
    }

    return { input: currentInput };
  }

  /**
   * Post-process output through all cartridges
   *
   * Runs output through each cartridge's postProcess hook sequentially.
   */
  async postProcess(output: string, context: AgentContext): Promise<string> {
    let currentOutput = output;

    for (const cartridgeId of this.activeCartridges) {
      const cartridge = this.cartridges.get(cartridgeId);
      if (cartridge?.postProcess) {
        console.log(`[CartridgeLoader] Post-processing through ${cartridge.name}...`);
        const result = await cartridge.postProcess(currentOutput, context);
        currentOutput = result.output;
      }
    }

    return currentOutput;
  }

  /**
   * Inject context through all cartridges
   *
   * Runs context through each cartridge's contextInjector sequentially.
   * Allows cartridges to add dependencies, credentials, or state.
   */
  async injectContext(context: AgentContext): Promise<AgentContext> {
    let currentContext = context;

    for (const cartridgeId of this.activeCartridges) {
      const cartridge = this.cartridges.get(cartridgeId);
      if (cartridge?.contextInjector) {
        console.log(`[CartridgeLoader] Injecting context from ${cartridge.name}...`);
        currentContext = await cartridge.contextInjector(currentContext);
      }
    }

    return currentContext;
  }

  /**
   * Get all slash commands from active cartridges
   *
   * Used by UI for autocomplete.
   */
  getSlashCommands(): SlashCommand[] {
    const commands: SlashCommand[] = [];

    for (const cartridgeId of this.activeCartridges) {
      const cartridge = this.cartridges.get(cartridgeId);
      if (cartridge?.slashCommands) {
        commands.push(...cartridge.slashCommands);
      }
    }

    return commands;
  }

  /**
   * Get list of active cartridge names (for debugging)
   */
  getActiveCartridges(): string[] {
    return Array.from(this.activeCartridges).map(id => {
      const cartridge = this.cartridges.get(id);
      return cartridge ? `${cartridge.name} (${id})` : id;
    });
  }

  /**
   * Get cartridge by ID
   */
  getCartridge(id: string): BaseCartridge | undefined {
    return this.cartridges.get(id);
  }

  /**
   * Check if cartridge is active
   */
  isActive(id: string): boolean {
    return this.activeCartridges.has(id);
  }
}

/**
 * Global singleton instance
 *
 * In production, you might want dependency injection instead.
 * For now, simple singleton for ease of use.
 */
let globalLoader: CartridgeLoader | null = null;

export function getGlobalCartridgeLoader(): CartridgeLoader {
  if (!globalLoader) {
    globalLoader = new CartridgeLoader();
  }
  return globalLoader;
}

export function resetGlobalCartridgeLoader(): void {
  globalLoader = null;
}
