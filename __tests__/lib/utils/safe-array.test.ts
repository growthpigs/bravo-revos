/**
 * Tests for safe-array.ts utilities
 */

import {
  safeFirst,
  safeLast,
  safeArrayAccess,
  safeFirstOrDefault,
  safeSplitAt,
  safeAt,
  hasElements,
  safeLength,
} from '@/lib/utils/safe-array';

describe('safeFirst', () => {
  it('should return first element of array', () => {
    expect(safeFirst([1, 2, 3])).toBe(1);
  });

  it('should return first object from array', () => {
    const arr = [{ id: 1 }, { id: 2 }];
    expect(safeFirst(arr)).toEqual({ id: 1 });
  });

  it('should return undefined for empty array', () => {
    expect(safeFirst([])).toBeUndefined();
  });

  it('should return undefined for null', () => {
    expect(safeFirst(null)).toBeUndefined();
  });

  it('should return undefined for undefined', () => {
    expect(safeFirst(undefined)).toBeUndefined();
  });
});

describe('safeLast', () => {
  it('should return last element of array', () => {
    expect(safeLast([1, 2, 3])).toBe(3);
  });

  it('should return undefined for empty array', () => {
    expect(safeLast([])).toBeUndefined();
  });

  it('should return undefined for null', () => {
    expect(safeLast(null)).toBeUndefined();
  });
});

describe('safeArrayAccess', () => {
  it('should return element at valid index', () => {
    const result = safeArrayAccess([10, 20, 30], 1);
    expect(result.success).toBe(true);
    expect(result.data).toBe(20);
  });

  it('should return error for null array', () => {
    const result = safeArrayAccess(null, 0);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Array is null or undefined');
  });

  it('should return error for undefined array', () => {
    const result = safeArrayAccess(undefined, 0);
    expect(result.success).toBe(false);
  });

  it('should return error for negative index', () => {
    const result = safeArrayAccess([1, 2, 3], -1);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Negative index');
  });

  it('should return error for out of bounds index', () => {
    const result = safeArrayAccess([1, 2, 3], 5);
    expect(result.success).toBe(false);
    expect(result.error).toContain('out of bounds');
  });

  it('should handle index at array length boundary', () => {
    const result = safeArrayAccess([1, 2, 3], 3);
    expect(result.success).toBe(false);
    expect(result.error).toContain('out of bounds');
  });

  it('should handle index 0 on empty array', () => {
    const result = safeArrayAccess([], 0);
    expect(result.success).toBe(false);
  });
});

describe('safeFirstOrDefault', () => {
  it('should return first element when exists', () => {
    expect(safeFirstOrDefault([1, 2, 3], 0)).toBe(1);
  });

  it('should return default for empty array', () => {
    expect(safeFirstOrDefault([], 99)).toBe(99);
  });

  it('should return default for null', () => {
    expect(safeFirstOrDefault(null, 99)).toBe(99);
  });

  it('should return default for undefined', () => {
    expect(safeFirstOrDefault(undefined, { id: 'default' })).toEqual({ id: 'default' });
  });
});

describe('safeSplitAt', () => {
  it('should split and return correct part', () => {
    expect(safeSplitAt('hello@world.com', '@', 0)).toBe('hello');
    expect(safeSplitAt('hello@world.com', '@', 1)).toBe('world.com');
  });

  it('should return first part of name', () => {
    expect(safeSplitAt('John Doe', ' ', 0)).toBe('John');
  });

  it('should return empty string for null', () => {
    expect(safeSplitAt(null, '@', 0)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(safeSplitAt(undefined, '@', 0)).toBe('');
  });

  it('should return empty string for out of bounds index', () => {
    expect(safeSplitAt('hello', '@', 1)).toBe('');
  });

  it('should return empty string for negative index', () => {
    expect(safeSplitAt('hello@world', '@', -1)).toBe('');
  });

  it('should handle string without separator', () => {
    expect(safeSplitAt('hello', '@', 0)).toBe('hello');
  });
});

describe('safeAt', () => {
  it('should return element at index', () => {
    expect(safeAt([10, 20, 30], 1, 0)).toBe(20);
  });

  it('should return default for invalid index', () => {
    expect(safeAt([10, 20, 30], 5, 99)).toBe(99);
  });

  it('should return default for null array', () => {
    expect(safeAt(null, 0, 99)).toBe(99);
  });
});

describe('hasElements', () => {
  it('should return true for non-empty array', () => {
    expect(hasElements([1])).toBe(true);
  });

  it('should return false for empty array', () => {
    expect(hasElements([])).toBe(false);
  });

  it('should return false for null', () => {
    expect(hasElements(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(hasElements(undefined)).toBe(false);
  });
});

describe('safeLength', () => {
  it('should return correct length', () => {
    expect(safeLength([1, 2, 3])).toBe(3);
  });

  it('should return 0 for empty array', () => {
    expect(safeLength([])).toBe(0);
  });

  it('should return 0 for null', () => {
    expect(safeLength(null)).toBe(0);
  });

  it('should return 0 for undefined', () => {
    expect(safeLength(undefined)).toBe(0);
  });
});
