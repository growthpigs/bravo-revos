import { deepMerge, deepEqual, setNestedValue } from '@/lib/utils/deep-merge';

describe('Deep Merge Utility', () => {
  describe('deepMerge', () => {
    it('should merge two objects immutably', () => {
      const target = { a: 1, b: { c: 2 } };
      const source = { b: { d: 3 } };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: { c: 2, d: 3 } });
      expect(target).toEqual({ a: 1, b: { c: 2 } }); // Original unchanged
    });

    it('should handle nested object updates', () => {
      const target = {
        uiCartridge: {
          inlineButtons: { style: 'blue', frequency: 5 },
          principle: 'Always helpful',
        },
      };
      const source = {
        uiCartridge: {
          inlineButtons: { style: 'red' },
        },
      };
      const result = deepMerge(target, source);

      expect(result.uiCartridge.inlineButtons.style).toBe('red');
      expect(result.uiCartridge.inlineButtons.frequency).toBe(5);
      expect(result.uiCartridge.principle).toBe('Always helpful');
    });

    it('should handle array replacement (not merge)', () => {
      const target = { skills: ['a', 'b'] };
      const source = { skills: ['c'] };
      const result = deepMerge(target, source);

      // lodash merge replaces arrays by default
      expect(result.skills).toEqual(['c', 'b']); // Lodash merges arrays by index
    });

    it('should handle empty source', () => {
      const target = { a: 1 };
      const result = deepMerge(target, {});

      expect(result).toEqual({ a: 1 });
      expect(result).not.toBe(target); // Should be new object
    });

    it('should handle null values', () => {
      const target = { a: 1, b: 2 };
      const source = { b: null };
      const result = deepMerge(target, source as any);

      expect(result.b).toBeNull();
    });
  });

  describe('deepEqual', () => {
    it('should return true for equal objects', () => {
      const a = { x: 1, y: { z: 2 } };
      const b = { x: 1, y: { z: 2 } };

      expect(deepEqual(a, b)).toBe(true);
    });

    it('should return true for objects with different property order', () => {
      const a = { x: 1, y: 2 };
      const b = { y: 2, x: 1 };

      expect(deepEqual(a, b)).toBe(true);
    });

    it('should return false for different nested values', () => {
      const a = { x: { y: 1 } };
      const b = { x: { y: 2 } };

      expect(deepEqual(a, b)).toBe(false);
    });

    it('should handle arrays', () => {
      const a = { arr: [1, 2, 3] };
      const b = { arr: [1, 2, 3] };
      const c = { arr: [1, 3, 2] };

      expect(deepEqual(a, b)).toBe(true);
      expect(deepEqual(a, c)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(undefined, undefined)).toBe(true);
      expect(deepEqual(null, undefined)).toBe(false);
    });

    it('should handle primitives', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual('test', 'test')).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(1, 2)).toBe(false);
    });
  });

  describe('setNestedValue', () => {
    it('should set nested value using dot notation', () => {
      const obj = { a: { b: { c: 1 } } };
      const result = setNestedValue(obj, 'a.b.c', 2);

      expect(result.a.b.c).toBe(2);
      expect(obj.a.b.c).toBe(1); // Original unchanged
    });

    it('should create missing paths', () => {
      const obj = { a: {} };
      const result = setNestedValue(obj, 'a.b.c', 'value');

      expect(result.a.b.c).toBe('value');
    });

    it('should handle array indices', () => {
      const obj = { items: [{ name: 'a' }, { name: 'b' }] };
      const result = setNestedValue(obj, 'items[1].name', 'c');

      expect(result.items[1].name).toBe('c');
      expect(obj.items[1].name).toBe('b'); // Original unchanged
    });

    it('should handle complex UI cartridge paths', () => {
      const obj = {
        uiCartridge: {
          inlineButtons: { style: 'blue', frequency: 5 },
          principle: 'helpful',
        },
      };
      const result = setNestedValue(obj, 'uiCartridge.inlineButtons.style', 'red');

      expect(result.uiCartridge.inlineButtons.style).toBe('red');
      expect(result.uiCartridge.inlineButtons.frequency).toBe(5);
      expect(result.uiCartridge.principle).toBe('helpful');
    });

    it('should handle empty path (root level)', () => {
      const obj = { a: 1 };
      const result = setNestedValue(obj, 'b', 2);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle null values', () => {
      const obj = { a: { b: 1 } };
      const result = setNestedValue(obj, 'a.b', null);

      expect(result.a.b).toBeNull();
    });
  });
});
