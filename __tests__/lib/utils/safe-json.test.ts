/**
 * Tests for safe-json.ts utilities
 */

import {
  safeJsonParse,
  safeJsonParseWithDefault,
  safeJsonParseArray,
  safeJsonParseObject,
  cleanAiJsonResponse,
} from '@/lib/utils/safe-json';
import { z } from 'zod';

describe('safeJsonParse', () => {
  describe('basic parsing', () => {
    it('should parse valid JSON object', () => {
      const result = safeJsonParse<{ name: string }>('{"name": "test"}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test' });
    });

    it('should parse valid JSON array', () => {
      const result = safeJsonParse<number[]>('[1, 2, 3]');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('should parse nested objects', () => {
      const result = safeJsonParse<{ user: { name: string } }>(
        '{"user": {"name": "test"}}'
      );
      expect(result.success).toBe(true);
      expect(result.data?.user.name).toBe('test');
    });
  });

  describe('error handling', () => {
    it('should return error for null input', () => {
      const result = safeJsonParse(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input is null or undefined');
    });

    it('should return error for undefined input', () => {
      const result = safeJsonParse(undefined);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input is null or undefined');
    });

    it('should return error for empty string', () => {
      const result = safeJsonParse('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input is empty string');
    });

    it('should return error for invalid JSON', () => {
      const result = safeJsonParse('not valid json');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected token');
      expect(result.raw).toBe('not valid json');
    });

    it('should return error for malformed JSON', () => {
      const result = safeJsonParse('{"name": "test"');
      expect(result.success).toBe(false);
    });
  });

  describe('schema validation', () => {
    const UserSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('should validate against Zod schema', () => {
      const result = safeJsonParse('{"name": "test", "age": 25}', UserSchema);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', age: 25 });
    });

    it('should fail validation for wrong schema', () => {
      const result = safeJsonParse('{"name": "test"}', UserSchema);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Schema validation failed');
    });

    it('should fail validation for wrong types', () => {
      const result = safeJsonParse('{"name": 123, "age": "not a number"}', UserSchema);
      expect(result.success).toBe(false);
    });
  });
});

describe('cleanAiJsonResponse', () => {
  it('should remove markdown code blocks with json tag', () => {
    const input = '```json\n{"test": true}\n```';
    expect(cleanAiJsonResponse(input)).toBe('{"test": true}');
  });

  it('should remove markdown code blocks without tag', () => {
    const input = '```\n{"test": true}\n```';
    expect(cleanAiJsonResponse(input)).toBe('{"test": true}');
  });

  it('should handle text before JSON object', () => {
    const input = 'Here is the result: {"name": "test"}';
    expect(cleanAiJsonResponse(input)).toBe('{"name": "test"}');
  });

  it('should handle text before JSON array', () => {
    const input = 'The array is: [1, 2, 3]';
    expect(cleanAiJsonResponse(input)).toBe('[1, 2, 3]');
  });

  it('should handle text after JSON', () => {
    const input = '{"name": "test"} Hope this helps!';
    expect(cleanAiJsonResponse(input)).toBe('{"name": "test"}');
  });

  it('should handle empty input', () => {
    expect(cleanAiJsonResponse('')).toBe('');
  });

  it('should handle already clean JSON', () => {
    expect(cleanAiJsonResponse('{"test": true}')).toBe('{"test": true}');
  });
});

describe('safeJsonParseWithDefault', () => {
  it('should return parsed value for valid JSON', () => {
    const result = safeJsonParseWithDefault('{"count": 5}', { count: 0 });
    expect(result).toEqual({ count: 5 });
  });

  it('should return default for null', () => {
    const result = safeJsonParseWithDefault(null, { count: 0 });
    expect(result).toEqual({ count: 0 });
  });

  it('should return default for undefined', () => {
    const result = safeJsonParseWithDefault(undefined, { count: 0 });
    expect(result).toEqual({ count: 0 });
  });

  it('should return default for invalid JSON', () => {
    const result = safeJsonParseWithDefault('invalid', { count: 0 });
    expect(result).toEqual({ count: 0 });
  });
});

describe('safeJsonParseArray', () => {
  it('should parse valid array', () => {
    const result = safeJsonParseArray<number>('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should return empty array for null', () => {
    const result = safeJsonParseArray(null);
    expect(result).toEqual([]);
  });

  it('should return empty array for object', () => {
    const result = safeJsonParseArray('{"not": "array"}');
    expect(result).toEqual([]);
  });

  it('should return empty array for invalid JSON', () => {
    const result = safeJsonParseArray('invalid');
    expect(result).toEqual([]);
  });
});

describe('safeJsonParseObject', () => {
  it('should parse valid object', () => {
    const result = safeJsonParseObject<{ name: string }>('{"name": "test"}');
    expect(result).toEqual({ name: 'test' });
  });

  it('should return empty object for null', () => {
    const result = safeJsonParseObject(null);
    expect(result).toEqual({});
  });

  it('should return empty object for array', () => {
    const result = safeJsonParseObject('[1, 2, 3]');
    expect(result).toEqual({});
  });

  it('should return empty object for invalid JSON', () => {
    const result = safeJsonParseObject('invalid');
    expect(result).toEqual({});
  });
});
