/**
 * Comment Processing Utilities
 * Bot filtering, trigger word detection, and comment analysis
 */

import { UnipileComment } from './unipile-client';

export interface ProcessedComment {
  comment: UnipileComment;
  isBot: boolean;
  botScore: number; // 0-100, higher = more likely bot
  hasTriggerWord: boolean;
  matchedTriggerWords: string[];
  isGeneric: boolean;
  shouldQueue: boolean; // Final decision: queue for DM?
}

/**
 * Bot detection patterns
 */
const BOT_HEADLINE_PATTERNS = [
  /bot/i,
  /automation/i,
  /automated/i,
  /auto[ -]?post/i,
  /scheduler/i,
];

const GENERIC_COMMENT_PATTERNS = [
  /^(great|nice|awesome|excellent|good|cool|interesting)\s+(post|content|article|share)!?$/i,
  /^thanks?\s+for\s+sharing!?$/i,
  /^love\s+this!?$/i,
  /^agreed?!?$/i,
  /^exactly!?$/i,
  /^\ud83d\udc4d+$/,  // Just thumbs up emojis
  /^\ud83d\udc4f+$/,  // Just clap emojis
  /^[\u2764\ufe0f]+$/, // Just heart emojis
];

/**
 * Detect if a comment author is likely a bot
 */
export function detectBot(comment: UnipileComment): {
  isBot: boolean;
  botScore: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  // Check 1: Headline contains "bot" or automation keywords
  if (comment.author.headline) {
    for (const pattern of BOT_HEADLINE_PATTERNS) {
      if (pattern.test(comment.author.headline)) {
        score += 50;
        reasons.push(`Headline contains bot keyword: "${comment.author.headline}"`);
        break;
      }
    }
  }

  // Check 2: Low connection count (<10)
  if (comment.author.connections_count !== undefined && comment.author.connections_count < 10) {
    score += 30;
    reasons.push(`Low connections: ${comment.author.connections_count}`);
  }

  // Check 3: Very short comment (< 10 chars) with no substance
  if (comment.text.length < 10 && !/\w{5,}/.test(comment.text)) {
    score += 15;
    reasons.push('Very short comment with no substance');
  }

  // Check 4: Comment is just emojis/symbols
  // Remove common emojis, symbols, and whitespace
  const textWithoutSymbols = comment.text
    .replace(/[\u2600-\u27BF]/g, '') // Misc symbols and dingbats
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // Emoji pairs (surrogate pairs)
    .replace(/\s/g, '')
    .trim();
  if (textWithoutSymbols.length === 0 && comment.text.length > 0) {
    score += 25;
    reasons.push('Comment is only emojis');
  }

  return {
    isBot: score >= 50,
    botScore: Math.min(score, 100),
    reasons,
  };
}

/**
 * Detect if a comment is generic/automated
 */
export function isGenericComment(comment: UnipileComment): boolean {
  const text = comment.text.trim();

  for (const pattern of GENERIC_COMMENT_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Detect trigger words in comment text
 * Case-insensitive matching
 */
export function detectTriggerWords(
  commentText: string,
  triggerWords: string[]
): {
  hasTrigger: boolean;
  matchedWords: string[];
} {
  const normalizedText = commentText.toLowerCase();
  const matchedWords: string[] = [];

  for (const trigger of triggerWords) {
    const normalizedTrigger = trigger.toLowerCase();

    // Match whole word only (not substring)
    const regex = new RegExp(`\\b${normalizedTrigger}\\b`, 'i');

    if (regex.test(commentText)) {
      matchedWords.push(trigger);
    }
  }

  return {
    hasTrigger: matchedWords.length > 0,
    matchedWords,
  };
}

/**
 * Process a comment and determine if it should be queued for DM
 */
export function processComment(
  comment: UnipileComment,
  triggerWords: string[]
): ProcessedComment {
  const botDetection = detectBot(comment);
  const isGeneric = isGenericComment(comment);
  const triggerDetection = detectTriggerWords(comment.text, triggerWords);

  // Final decision logic
  const shouldQueue =
    triggerDetection.hasTrigger && // Must have trigger word
    !botDetection.isBot &&          // Must not be a bot
    !isGeneric;                     // Must not be generic

  return {
    comment,
    isBot: botDetection.isBot,
    botScore: botDetection.botScore,
    hasTriggerWord: triggerDetection.hasTrigger,
    matchedTriggerWords: triggerDetection.matchedWords,
    isGeneric,
    shouldQueue,
  };
}

/**
 * Batch process multiple comments
 * Returns only comments that should be queued for DM
 */
export function processComments(
  comments: UnipileComment[],
  triggerWords: string[]
): ProcessedComment[] {
  return comments
    .map(comment => processComment(comment, triggerWords))
    .filter(processed => processed.shouldQueue);
}

/**
 * Filter comments seen before (deduplication)
 * Returns only new comment IDs
 */
export function filterNewComments(
  commentIds: string[],
  previouslySeenIds: Set<string>
): string[] {
  return commentIds.filter(id => !previouslySeenIds.has(id));
}
