/**
 * Shared utility for parsing trigger words from various formats
 *
 * This centralizes the logic for reading trigger_words from campaigns,
 * handling both the new JSONB[] format and legacy TEXT comma-separated format.
 */

interface CampaignTriggerWordFields {
  trigger_words?: string[] | null;
  trigger_word?: string | null;
}

/**
 * Parse trigger words from a campaign record
 *
 * Handles multiple formats:
 * - New JSONB[] format: ["GUIDE", "SWIPE", "LEAD"]
 * - Legacy stringified JSONB: ['"GUIDE"', '"SWIPE"'] (strips extra quotes)
 * - Legacy TEXT format: "GUIDE, SWIPE, LEAD" (comma-separated)
 * - null/undefined: returns empty array
 *
 * @param campaign - Object containing trigger_words and/or trigger_word fields
 * @returns Array of uppercase trigger words, deduplicated
 */
export function parseTriggerWords(campaign: CampaignTriggerWordFields): string[] {
  // Try new JSONB array format first
  if (campaign.trigger_words && Array.isArray(campaign.trigger_words)) {
    return campaign.trigger_words
      .map((item) => {
        // Handle both proper JSONB and legacy stringified format
        const str = typeof item === 'string' ? item : JSON.stringify(item);
        // Strip any surrounding quotes (handles '"GUIDE"' → 'GUIDE')
        return str.replace(/^["']|["']$/g, '').trim().toUpperCase();
      })
      .filter((word) => word.length > 0);
  }

  // Fall back to legacy TEXT comma-separated format
  if (campaign.trigger_word && typeof campaign.trigger_word === 'string') {
    return campaign.trigger_word
      .split(',')
      .map((w) => w.trim().toUpperCase())
      .filter((word) => word.length > 0);
  }

  return [];
}

/**
 * Normalize trigger words from various input formats
 * Used when receiving trigger words from API requests
 *
 * @param input - Array, comma-separated string, or null
 * @returns Array of uppercase trigger words, deduplicated
 */
export function normalizeTriggerWords(input: unknown): string[] {
  if (!input) return [];

  // Already an array
  if (Array.isArray(input)) {
    const words = input
      .map((item) => {
        const str = typeof item === 'string' ? item : JSON.stringify(item);
        return str.replace(/^["']|["']$/g, '').trim().toUpperCase();
      })
      .filter((word) => word.length > 0);

    // Deduplicate
    return [...new Set(words)];
  }

  // Comma-separated string
  if (typeof input === 'string') {
    const words = input
      .split(',')
      .map((word) => word.trim().toUpperCase())
      .filter((word) => word.length > 0);

    // Deduplicate
    return [...new Set(words)];
  }

  return [];
}
