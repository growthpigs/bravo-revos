import { SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BrandCartridge {
  id: string;
  user_id: string;
  name: string;
  company_name?: string;
  company_description?: string;
  industry?: string;
  target_audience?: string;
  core_values?: string[];
  brand_voice?: string;
  brand_personality?: string[];
  core_messaging?: string; // 10k+ words of marketing messaging
  is_active: boolean;
}

export interface SwipeCartridge {
  id: string;
  user_id: string;
  name: string;
  category: string; // 'linkedin_hooks', 'email_subjects', etc.
  examples: Array<{
    author: string;
    text: string;
    notes?: string;
    performance?: string;
    source_url?: string;
  }>;
  is_active: boolean;
}

export interface PlatformTemplate {
  platform: string;
  max_length: number;
  tone: string[];
  structure: Record<string, string>;
  formatting: Record<string, string>;
  best_practices: string[];
  example_structure: string;
}

// ============================================================================
// CARTRIDGE LOADERS
// ============================================================================

/**
 * Load user's active brand cartridge
 */
export async function loadBrandCartridge(
  userId: string,
  supabase: SupabaseClient
): Promise<BrandCartridge | undefined> {
  try {
    const { data, error } = await supabase
      .from('brand_cartridges')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log(`[LOADER] No brand cartridge found for user: ${userId}`);
      return undefined;
    }

    console.log(`[LOADER] ✅ Brand cartridge loaded for user: ${userId}`);
    return data as BrandCartridge;
  } catch (error) {
    console.error('[LOADER] Error loading brand cartridge:', error);
    return undefined;
  }
}

/**
 * Load user's swipe cartridges for a specific category
 */
export async function loadSwipeCartridges(
  userId: string,
  category: string,
  supabase: SupabaseClient
): Promise<SwipeCartridge[]> {
  try {
    const { data, error } = await supabase
      .from('swipe_cartridges')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('is_active', true);

    if (error || !data || data.length === 0) {
      console.log(`[LOADER] No swipe cartridges found for user: ${userId}, category: ${category}`);
      return [];
    }

    console.log(`[LOADER] ✅ ${data.length} swipe cartridge(s) loaded for category: ${category}`);
    return data as SwipeCartridge[];
  } catch (error) {
    console.error('[LOADER] Error loading swipe cartridges:', error);
    return [];
  }
}

/**
 * Load platform-specific template from JSON file
 */
export async function loadPlatformTemplate(
  platform: string
): Promise<PlatformTemplate | undefined> {
  try {
    const templatePath = path.join(
      process.cwd(),
      'lib',
      'templates',
      `${platform}.json`
    );

    const content = await fs.readFile(templatePath, 'utf-8');
    const template = JSON.parse(content) as PlatformTemplate;

    console.log(`[LOADER] ✅ Platform template loaded: ${platform}`);
    return template;
  } catch (error) {
    console.warn(`[LOADER] Platform template not found for: ${platform}`, error);
    return undefined;
  }
}

/**
 * Load all user cartridges in parallel for maximum performance
 */
export async function loadAllUserCartridges(
  userId: string,
  platform: string,
  supabase: SupabaseClient
): Promise<{
  brand?: BrandCartridge;
  swipes: SwipeCartridge[];
  platformTemplate?: PlatformTemplate;
}> {
  // Determine swipe category from platform
  const swipeCategory = getSwipeCategoryForPlatform(platform);

  // Load all cartridges in parallel
  const [brand, swipes, platformTemplate] = await Promise.all([
    loadBrandCartridge(userId, supabase),
    loadSwipeCartridges(userId, swipeCategory, supabase),
    loadPlatformTemplate(platform)
  ]);

  return { brand, swipes, platformTemplate };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map platform to swipe category
 */
function getSwipeCategoryForPlatform(platform: string): string {
  const categoryMap: Record<string, string> = {
    linkedin: 'linkedin_hooks',
    facebook: 'facebook_posts',
    whatsapp: 'whatsapp_messages',
    email: 'email_subjects'
  };

  return categoryMap[platform] || 'linkedin_hooks';
}
