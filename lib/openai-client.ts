/**
 * Shared OpenAI Client Instance
 *
 * Provides a singleton OpenAI client for use across chips, cartridges, and tools.
 * Prevents multiple instances and ensures consistent configuration.
 */

import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

/**
 * Singleton OpenAI client instance
 * Used by chips, cartridges, and AgentKit tools
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;
