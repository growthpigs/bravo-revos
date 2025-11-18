import { OpenAI } from 'openai';

// Lazy-load OpenAI client to prevent build-time execution
let openaiInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for embeddings');
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

/**
 * Configuration for document chunking
 * Using conservative token estimate: ~4 chars per token
 */
const CHUNK_CONFIG = {
  MAX_TOKENS: 512,  // Conservative chunk size for embeddings
  OVERLAP_TOKENS: 50,  // Overlap between chunks for context
};

export const getMaxCharsPerChunk = () => {
  return CHUNK_CONFIG.MAX_TOKENS * 4;
};

/**
 * Generate embedding for a text string
 * Uses OpenAI's text-embedding-ada-002 model (1536 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
      encoding_format: 'float',
    });

    if (response.data.length === 0) {
      throw new Error('No embedding returned from OpenAI');
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error('[EMBEDDINGS] Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Split text into chunks with overlap
 * Returns array of {text, index} objects
 */
export function chunkText(text: string, maxTokens: number = CHUNK_CONFIG.MAX_TOKENS): Array<{text: string; index: number}> {
  const maxChars = maxTokens * 4;  // Rough estimate
  const overlapChars = CHUNK_CONFIG.OVERLAP_TOKENS * 4;

  if (text.length <= maxChars) {
    return [{text, index: 0}];
  }

  const chunks: Array<{text: string; index: number}> = [];
  let offset = 0;
  let chunkIndex = 0;

  while (offset < text.length) {
    let chunkEnd = Math.min(offset + maxChars, text.length);

    // Try to break at sentence boundary if possible
    if (chunkEnd < text.length) {
      const lastPeriod = text.lastIndexOf('.', chunkEnd);
      const lastNewline = text.lastIndexOf('\n', chunkEnd);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > offset && breakPoint > chunkEnd - maxChars / 2) {
        chunkEnd = breakPoint + 1;
      }
    }

    const chunk = text.substring(offset, chunkEnd).trim();
    if (chunk.length > 0) {
      chunks.push({text: chunk, index: chunkIndex});
      chunkIndex++;
    }

    // Move offset with overlap
    offset = chunkEnd - overlapChars;
  }

  return chunks;
}

/**
 * Generate embeddings for entire document
 * Handles chunking and returns array of {text, embedding, index}
 */
export async function embedDocument(
  documentText: string
): Promise<Array<{text: string; embedding: number[]; index: number}>> {
  const chunks = chunkText(documentText);

  const embeddings = await Promise.all(
    chunks.map(async (chunk) => {
      const embedding = await generateEmbedding(chunk.text);
      return {
        text: chunk.text,
        embedding,
        index: chunk.index,
      };
    })
  );

  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}
