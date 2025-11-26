/**
 * Tests for safe-parse.ts utilities
 */

import {
  safeParseInt,
  safeParseFloat,
  parseTimeRangeDays,
  parseTimeRangeMs,
  safeParseQueryParam,
  safeParseBool,
} from '@/lib/utils/safe-parse';

describe('safeParseInt', () => {
  describe('basic parsing', () => {
    it('should parse valid integer', () => {
      expect(safeParseInt('42', 0)).toBe(42);
    });

    it('should parse negative integer', () => {
      expect(safeParseInt('-5', 0)).toBe(-5);
    });

    it('should parse integer with whitespace', () => {
      expect(safeParseInt('  42  ', 0)).toBe(42);
    });

    it('should truncate float to integer', () => {
      expect(safeParseInt('42.9', 0)).toBe(42);
    });
  });

  describe('default values', () => {
    it('should return default for null', () => {
      expect(safeParseInt(null, 99)).toBe(99);
    });

    it('should return default for undefined', () => {
      expect(safeParseInt(undefined, 99)).toBe(99);
    });

    it('should return default for empty string', () => {
      expect(safeParseInt('', 99)).toBe(99);
    });

    it('should return default for whitespace only', () => {
      expect(safeParseInt('   ', 99)).toBe(99);
    });

    it('should return default for non-numeric string', () => {
      expect(safeParseInt('not a number', 99)).toBe(99);
    });

    it('should return default for NaN result', () => {
      expect(safeParseInt('NaN', 99)).toBe(99);
    });
  });

  describe('bounds checking', () => {
    it('should apply min bound', () => {
      expect(safeParseInt('5', 0, { min: 10 })).toBe(10);
    });

    it('should apply max bound', () => {
      expect(safeParseInt('100', 0, { max: 50 })).toBe(50);
    });

    it('should apply both bounds', () => {
      expect(safeParseInt('5', 0, { min: 10, max: 100 })).toBe(10);
      expect(safeParseInt('200', 0, { min: 10, max: 100 })).toBe(100);
      expect(safeParseInt('50', 0, { min: 10, max: 100 })).toBe(50);
    });

    it('should not modify value within bounds', () => {
      expect(safeParseInt('50', 0, { min: 10, max: 100 })).toBe(50);
    });
  });
});

describe('safeParseFloat', () => {
  it('should parse valid float', () => {
    expect(safeParseFloat('3.14', 0)).toBeCloseTo(3.14);
  });

  it('should return default for null', () => {
    expect(safeParseFloat(null, 1.5)).toBe(1.5);
  });

  it('should return default for invalid', () => {
    expect(safeParseFloat('not a float', 1.5)).toBe(1.5);
  });

  it('should apply bounds', () => {
    expect(safeParseFloat('0.5', 0, { min: 1.0 })).toBe(1.0);
    expect(safeParseFloat('10.0', 0, { max: 5.0 })).toBe(5.0);
  });

  it('should handle Infinity', () => {
    expect(safeParseFloat('Infinity', 0)).toBe(0);
  });
});

describe('parseTimeRangeDays', () => {
  it('should parse "7d" to 7', () => {
    expect(parseTimeRangeDays('7d')).toBe(7);
  });

  it('should parse "30d" to 30', () => {
    expect(parseTimeRangeDays('30d')).toBe(30);
  });

  it('should parse "365d" to 365', () => {
    expect(parseTimeRangeDays('365d')).toBe(365);
  });

  it('should be case insensitive', () => {
    expect(parseTimeRangeDays('7D')).toBe(7);
  });

  it('should return default for null', () => {
    expect(parseTimeRangeDays(null, 14)).toBe(14);
  });

  it('should return default for undefined', () => {
    expect(parseTimeRangeDays(undefined, 14)).toBe(14);
  });

  it('should return default for invalid format', () => {
    expect(parseTimeRangeDays('7 days', 14)).toBe(14);
    expect(parseTimeRangeDays('7', 14)).toBe(14);
    expect(parseTimeRangeDays('days', 14)).toBe(14);
  });

  it('should return default for zero days', () => {
    expect(parseTimeRangeDays('0d', 14)).toBe(14);
  });

  it('should return default for negative days', () => {
    expect(parseTimeRangeDays('-7d', 14)).toBe(14);
  });
});

describe('parseTimeRangeMs', () => {
  it('should parse days to milliseconds', () => {
    expect(parseTimeRangeMs('1d')).toBe(24 * 60 * 60 * 1000);
  });

  it('should parse hours to milliseconds', () => {
    expect(parseTimeRangeMs('1h')).toBe(60 * 60 * 1000);
  });

  it('should parse minutes to milliseconds', () => {
    expect(parseTimeRangeMs('1m')).toBe(60 * 1000);
  });

  it('should parse seconds to milliseconds', () => {
    expect(parseTimeRangeMs('1s')).toBe(1000);
  });

  it('should be case insensitive', () => {
    expect(parseTimeRangeMs('1H')).toBe(60 * 60 * 1000);
  });

  it('should return default for invalid', () => {
    const defaultMs = 7 * 24 * 60 * 60 * 1000;
    expect(parseTimeRangeMs('invalid', defaultMs)).toBe(defaultMs);
  });
});

describe('safeParseQueryParam', () => {
  it('should parse valid query param', () => {
    const params = new URLSearchParams('limit=50');
    expect(safeParseQueryParam(params, 'limit', 20)).toBe(50);
  });

  it('should return default for missing param', () => {
    const params = new URLSearchParams('');
    expect(safeParseQueryParam(params, 'limit', 20)).toBe(20);
  });

  it('should apply bounds', () => {
    const params = new URLSearchParams('limit=500');
    expect(safeParseQueryParam(params, 'limit', 20, { max: 100 })).toBe(100);
  });
});

describe('safeParseBool', () => {
  it('should parse "true"', () => {
    expect(safeParseBool('true', false)).toBe(true);
  });

  it('should parse "false"', () => {
    expect(safeParseBool('false', true)).toBe(false);
  });

  it('should parse "1" as true', () => {
    expect(safeParseBool('1', false)).toBe(true);
  });

  it('should parse "0" as false', () => {
    expect(safeParseBool('0', true)).toBe(false);
  });

  it('should parse "yes" as true', () => {
    expect(safeParseBool('yes', false)).toBe(true);
  });

  it('should parse "no" as false', () => {
    expect(safeParseBool('no', true)).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(safeParseBool('TRUE', false)).toBe(true);
    expect(safeParseBool('False', true)).toBe(false);
  });

  it('should return default for null', () => {
    expect(safeParseBool(null, true)).toBe(true);
  });

  it('should return default for invalid', () => {
    expect(safeParseBool('maybe', false)).toBe(false);
  });
});
