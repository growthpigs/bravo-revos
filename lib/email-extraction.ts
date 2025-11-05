/**
 * Email Extraction from DM Replies
 * Extracts email addresses from natural language responses using regex + GPT-4
 */

import { OpenAI } from 'openai';

export interface ExtractionResult {
  email: string | null;
  confidence: 'high' | 'medium' | 'low';
  score: number; // 0-100
  method: 'regex' | 'gpt4';
  rawText: string;
  alternativeEmails: string[];
  requiresManualReview: boolean;
}

// Regex pattern for email extraction
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Extract emails using regex pattern matching
 */
function extractEmailsByRegex(text: string): {
  emails: string[];
  count: number;
} {
  const matches = text.match(EMAIL_REGEX) || [];
  // Remove duplicates and sort by length (longer = more likely to be real)
  const uniqueEmails = Array.from(new Set(matches)).sort((a, b) => b.length - a.length);

  return {
    emails: uniqueEmails,
    count: uniqueEmails.length,
  };
}

/**
 * Calculate confidence score based on extraction method and result quality
 */
function calculateConfidenceScore(
  method: 'regex' | 'gpt4',
  emailCount: number,
  textLength: number,
  emailPosition: number // 0-1, where 0 is start, 1 is end
): number {
  let score = 50; // Base score

  if (method === 'regex') {
    // Regex extractions get 0-100 based on context
    if (emailCount === 1) {
      score = 90; // Exactly one email = high confidence
    } else if (emailCount > 1) {
      score = 70; // Multiple emails = medium confidence (ambiguity)
    } else {
      score = 0; // No email found
    }

    // Boost if email is near the end (natural DM reply pattern)
    if (emailPosition > 0.7) {
      score += 5;
    }
  } else if (method === 'gpt4') {
    // GPT-4 extractions are inherently medium confidence
    score = 75;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Convert confidence score to confidence level
 */
function scoreToConfidenceLevel(
  score: number
): 'high' | 'medium' | 'low' {
  if (score >= 90) return 'high';
  if (score >= 70) return 'medium';
  return 'low';
}

/**
 * Use GPT-4 to extract email from complex text
 */
async function extractEmailWithGPT4(text: string): Promise<{
  email: string | null;
  reasoning: string;
}> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.chat.completions.create({
    model: 'gpt-4',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You are an expert at extracting email addresses from natural language text.
Your job is to:
1. Find the email address in the provided text
2. Return ONLY a valid email address if found, or "NOT_FOUND" if no email exists
3. Be strict: only return something that looks like a real email (user@domain.com)

IMPORTANT: Return your response in this exact format:
EMAIL: [email or NOT_FOUND]
REASONING: [brief explanation]`,
      },
      {
        role: 'user',
        content: `Extract the email address from this message:\n\n"${text}"`,
      },
    ],
  });

  const content = response.choices[0].message.content || '';
  const emailMatch = content.match(/EMAIL:\s*(\S+)/);
  const email = emailMatch?.[1];

  return {
    email: email && email !== 'NOT_FOUND' ? email : null,
    reasoning: content,
  };
}

/**
 * Main extraction function - tries regex first, then GPT-4 if needed
 */
export async function extractEmail(text: string): Promise<ExtractionResult> {
  const rawText = text.trim();

  // Step 1: Try regex extraction
  const regexResult = extractEmailsByRegex(rawText);

  if (regexResult.count === 1) {
    // Perfect case: exactly one email found
    const email = regexResult.emails[0];
    const emailPosition = rawText.toLowerCase().indexOf(email.toLowerCase()) / rawText.length;
    const score = calculateConfidenceScore('regex', 1, rawText.length, emailPosition);

    return {
      email,
      confidence: scoreToConfidenceLevel(score),
      score,
      method: 'regex',
      rawText,
      alternativeEmails: [],
      requiresManualReview: score < 70,
    };
  }

  if (regexResult.count > 1) {
    // Ambiguous case: multiple emails found
    const primaryEmail = regexResult.emails[0];
    const emailPosition = rawText.toLowerCase().indexOf(primaryEmail.toLowerCase()) / rawText.length;
    const score = calculateConfidenceScore('regex', regexResult.count, rawText.length, emailPosition);

    return {
      email: primaryEmail,
      confidence: scoreToConfidenceLevel(score),
      score,
      method: 'regex',
      rawText,
      alternativeEmails: regexResult.emails.slice(1),
      requiresManualReview: true, // Multiple emails always need review
    };
  }

  // Step 2: No regex match - try GPT-4
  console.log('[EMAIL_EXTRACTION] No regex match found, attempting GPT-4 extraction...');

  try {
    const gpt4Result = await extractEmailWithGPT4(rawText);

    if (gpt4Result.email) {
      return {
        email: gpt4Result.email,
        confidence: 'medium',
        score: 75,
        method: 'gpt4',
        rawText,
        alternativeEmails: [],
        requiresManualReview: true, // GPT-4 extractions always need verification
      };
    }
  } catch (error) {
    console.error('[EMAIL_EXTRACTION] GPT-4 extraction failed:', error);
  }

  // No email found with either method
  return {
    email: null,
    confidence: 'low',
    score: 0,
    method: 'regex',
    rawText,
    alternativeEmails: [],
    requiresManualReview: true, // Manual review required
  };
}

/**
 * Validate that an extracted email is actually valid
 */
export function isValidEmail(email: string): boolean {
  return STRICT_EMAIL_REGEX.test(email);
}

/**
 * Batch extract emails from multiple DM replies
 */
export async function batchExtractEmails(
  replies: Array<{ id: string; text: string }>
): Promise<Array<{ replyId: string; result: ExtractionResult }>> {
  return Promise.all(
    replies.map(async (reply) => ({
      replyId: reply.id,
      result: await extractEmail(reply.text),
    }))
  );
}
