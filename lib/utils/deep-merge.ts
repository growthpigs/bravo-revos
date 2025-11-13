/**
 * Deep Merge Utility
 *
 * Immutable deep merge operations for nested console cartridge updates.
 * Used by admin UI to handle nested state management without mutation.
 */

import cloneDeep from 'lodash/cloneDeep';
import merge from 'lodash/merge';
import isEqual from 'lodash/isEqual';
import set from 'lodash/set';

/**
 * Deep merge two objects immutably
 *
 * @example
 * const target = { a: { b: 1, c: 2 } };
 * const source = { a: { b: 3 } };
 * deepMerge(target, source); // { a: { b: 3, c: 2 } }
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
  // Clone target to avoid mutation
  const cloned = cloneDeep(target);
  // Merge source into cloned target
  return merge(cloned, source);
}

/**
 * Order-independent deep equality check
 *
 * @example
 * deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }); // true
 * deepEqual({ a: { b: 1 } }, { a: { b: 2 } }); // false
 */
export function deepEqual<T>(a: T, b: T): boolean {
  return isEqual(a, b);
}

/**
 * Set nested field value using dot notation (immutable)
 *
 * @example
 * const obj = { ui: { buttons: { style: 'blue' } } };
 * setNestedValue(obj, 'ui.buttons.style', 'red');
 * // Returns: { ui: { buttons: { style: 'red' } } }
 * // Original obj is unchanged
 */
export function setNestedValue<T>(obj: T, path: string, value: any): T {
  const cloned = cloneDeep(obj);
  set(cloned, path, value);
  return cloned;
}
