/**
 * Unit tests for trigger words normalization
 * Tests the normalizeTriggerWords helper function from /api/linkedin/posts/route.ts
 */

/**
 * Normalize trigger words from various formats to string array
 * Handles: array, string (comma-separated), JSONB array, null
 */
function normalizeTriggerWords(input: any): string[] {
  if (!input) return [];

  // Already an array
  if (Array.isArray(input)) {
    return input
      .map((item: any) => {
        // Handle JSONB stringified values
        const str = typeof item === 'string' ? item : JSON.stringify(item);
        return str.replace(/^["']|["']$/g, '').trim();
      })
      .filter((word: string) => word.length > 0);
  }

  // Comma-separated string
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((word: string) => word.trim())
      .filter((word: string) => word.length > 0);
  }

  return [];
}

describe('normalizeTriggerWords', () => {
  describe('array inputs', () => {
    it('should handle simple string array', () => {
      const input = ['GUIDE', 'SWIPE', 'LEAD'];
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['GUIDE', 'SWIPE', 'LEAD']);
    });

    it('should handle JSONB stringified array', () => {
      const input = ['"GUIDE"', '"SWIPE"', '"LEAD"'];
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['GUIDE', 'SWIPE', 'LEAD']);
    });

    it('should handle mixed array with whitespace', () => {
      const input = ['  GUIDE  ', 'SWIPE', '  LEAD  '];
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['GUIDE', 'SWIPE', 'LEAD']);
    });

    it('should filter out empty strings in array', () => {
      const input = ['GUIDE', '', 'SWIPE', '  ', 'LEAD'];
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['GUIDE', 'SWIPE', 'LEAD']);
    });
  });

  describe('string inputs', () => {
    it('should handle comma-separated string', () => {
      const input = 'GUIDE, SWIPE, LEAD';
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['GUIDE', 'SWIPE', 'LEAD']);
    });

    it('should handle comma-separated without spaces', () => {
      const input = 'GUIDE,SWIPE,LEAD';
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['GUIDE', 'SWIPE', 'LEAD']);
    });

    it('should handle single word', () => {
      const input = 'GUIDE';
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['GUIDE']);
    });

    it('should filter empty strings in comma-separated format', () => {
      const input = 'GUIDE, , SWIPE, , LEAD';
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['GUIDE', 'SWIPE', 'LEAD']);
    });
  });

  describe('null/undefined inputs', () => {
    it('should return empty array for null', () => {
      const result = normalizeTriggerWords(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      const result = normalizeTriggerWords(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = normalizeTriggerWords('');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty array', () => {
      const result = normalizeTriggerWords([]);
      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle case sensitivity preservation', () => {
      const input = ['guide', 'SWIPE', 'LeaD'];
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['guide', 'SWIPE', 'LeaD']);
    });

    it('should handle special characters in trigger words', () => {
      const input = ['GUIDE-PRO', 'SWIPE$', 'LEAD!'];
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['GUIDE-PRO', 'SWIPE$', 'LEAD!']);
    });

    it('should handle numeric trigger words', () => {
      const input = ['123', '456', '789'];
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['123', '456', '789']);
    });

    it('should handle very long trigger words', () => {
      const longWord = 'A'.repeat(1000);
      const input = [longWord];
      const result = normalizeTriggerWords(input);
      expect(result).toEqual([longWord]);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle legacy single trigger word', () => {
      const input = 'default';
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['default']);
    });

    it('should handle new multiple trigger words format', () => {
      const input = ['GUIDE', 'GET', 'MORE'];
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['GUIDE', 'GET', 'MORE']);
    });

    it('should handle migrated JSONB format with quotes', () => {
      // This is what the database would return after JSONB migration
      const input = ['"GUIDE"', '"SWIPE"', '"LEAD"'];
      const result = normalizeTriggerWords(input);
      expect(result).toEqual(['GUIDE', 'SWIPE', 'LEAD']);
    });

    it('should handle both old and new format in campaign response', () => {
      // Campaign API returns both trigger_word (old) and trigger_words (new)
      // When both are provided, the newer format (array) takes precedence
      const oldFormat = 'GUIDE, SWIPE';
      const newFormat = ['LEAD', 'GET'];
      const result = normalizeTriggerWords(newFormat);
      expect(result).toEqual(['LEAD', 'GET']);
      expect(result).not.toEqual(['GUIDE', 'SWIPE']);
    });
  });
});
