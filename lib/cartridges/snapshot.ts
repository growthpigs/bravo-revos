/**
 * Cartridge Snapshot - Immutable Container for All Cartridge Data
 *
 * Purpose: Pass all loaded cartridge data through workflow execution chain
 * without repeated database queries or undefined variable bugs.
 *
 * Pattern: Create snapshot once at session start, pass immutable object
 * throughout execution. No lazy loading, no state lookup - pure data passing.
 *
 * Based on OpenAI AgentKit research findings:
 * - Predictable (snapshot created once, never changes)
 * - Type-safe (TypeScript knows exact shape)
 * - Fast access (no async lookups during workflow)
 * - Easy to test (just create mock snapshot)
 */

import type { BrandCartridge, SwipeCartridge, PlatformTemplate } from './loaders';

/**
 * Immutable snapshot of all cartridge data loaded at session start
 *
 * Contains:
 * - brand: User's brand identity (industry, voice, core messaging)
 * - swipes: External copywriting examples (Gary Halbert, Jon Benson style)
 * - platformTemplate: Platform-specific guidelines (LinkedIn, Facebook, etc.)
 */
export interface CartridgeSnapshot {
  readonly brand: BrandCartridge | null;
  readonly swipes: SwipeCartridge[];
  readonly platformTemplate: PlatformTemplate | null;
}

/**
 * Create immutable cartridge snapshot from loaded data
 *
 * @param brand - User's active brand cartridge (or null if not found)
 * @param swipes - Array of swipe file cartridges for current platform
 * @param platformTemplate - Platform template (LinkedIn, Facebook, etc.)
 * @returns Frozen (immutable) snapshot object
 *
 * @example
 * ```typescript
 * const snapshot = createCartridgeSnapshot(
 *   brandData,
 *   swipeCartridges,
 *   linkedinTemplate
 * );
 *
 * // Snapshot is immutable - can't be modified
 * snapshot.brand = null; // TypeError: Cannot assign to read only property
 * ```
 */
export function createCartridgeSnapshot(
  brand: BrandCartridge | null,
  swipes: SwipeCartridge[],
  platformTemplate: PlatformTemplate | null
): CartridgeSnapshot {
  return Object.freeze({
    brand,
    swipes,
    platformTemplate
  });
}
