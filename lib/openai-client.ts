/**
 * Shared OpenAI Client Instance
 *
 * Provides a singleton OpenAI client for use across chips, cartridges, and tools.
 * Prevents multiple instances and ensures consistent configuration.
 *
 * IMPORTANT: Uses lazy initialization to prevent build-time execution
 */

import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

/**
 * Get OpenAI client instance (lazy-loaded)
 * Initializes on first call to prevent build-time execution
 */
function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

/**
 * Singleton OpenAI client instance
 * Used by chips, cartridges, and AgentKit tools
 *
 * @deprecated Use getOpenAIClient() instead for lazy initialization
 */
export const openai = new Proxy({} as OpenAI, {
  get(target, prop) {
    return getOpenAIClient()[prop as keyof OpenAI];
  }
});

export { getOpenAIClient };
export default openai;
