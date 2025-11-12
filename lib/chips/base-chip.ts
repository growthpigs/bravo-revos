/**
 * Base Chip Class
 *
 * Provides common functionality for all chips.
 * Chips are atomic, reusable skills that can work across multiple cartridges.
 */

import { Tool } from '@openai/agents';
import { AgentContext } from '@/lib/cartridges/types';

export abstract class BaseChip {
  abstract id: string;
  abstract name: string;
  abstract description: string;

  /**
   * Returns AgentKit Tool definition for this chip
   *
   * Subclasses must implement this to provide the tool schema
   */
  abstract getTool(): Tool;

  /**
   * Executes the chip's functionality
   *
   * @param input - Tool input (validated against Zod schema)
   * @param context - Agent context with userId, supabase, etc.
   * @returns Tool execution result
   */
  abstract execute(input: any, context: AgentContext): Promise<any>;

  /**
   * Helper: Validate that context has required fields
   */
  protected validateContext(context: AgentContext): void {
    if (!context.userId) {
      throw new Error(`${this.name}: userId required in context`);
    }
    if (!context.supabase) {
      throw new Error(`${this.name}: supabase client required in context`);
    }
  }

  /**
   * Helper: Format error response
   */
  protected formatError(error: any): { success: false; error: string } {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${this.name}] Error:`, message);
    return {
      success: false,
      error: message,
    };
  }

  /**
   * Helper: Format success response
   */
  protected formatSuccess<T>(data: T): { success: true; data: T } {
    return {
      success: true,
      data,
    };
  }
}
