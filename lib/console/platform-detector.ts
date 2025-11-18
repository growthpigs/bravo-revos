/**
 * Platform Detection - Detect target platform from user message
 *
 * Analyzes user message and preferences to determine which platform
 * the user wants to create content for (LinkedIn, Facebook, WhatsApp, Email).
 *
 * Detection Priority:
 * 1. Explicit platform mention in message (highest priority)
 * 2. Preference cartridge default platform
 * 3. Fallback to LinkedIn (most common for B2B marketing)
 */

/**
 * Detect platform from user message and preferences
 *
 * @param message - User's message text
 * @param preferenceCartridge - User's preference cartridge (optional)
 * @returns Platform identifier: 'linkedin' | 'facebook' | 'whatsapp' | 'email'
 */
export function detectPlatformFromCommand(
  message: string,
  preferenceCartridge?: { default_platform?: string }
): string {
  const lowerMessage = message.toLowerCase();

  // 1. Explicit platform mentions (highest priority)
  if (lowerMessage.includes('linkedin')) {
    return 'linkedin';
  }

  if (lowerMessage.includes('facebook')) {
    return 'facebook';
  }

  if (lowerMessage.includes('whatsapp') || lowerMessage.includes('whats app')) {
    return 'whatsapp';
  }

  if (lowerMessage.includes('email')) {
    return 'email';
  }

  // 2. Preference cartridge default (if available)
  if (preferenceCartridge?.default_platform) {
    const validPlatforms = ['linkedin', 'facebook', 'whatsapp', 'email'];
    if (validPlatforms.includes(preferenceCartridge.default_platform)) {
      return preferenceCartridge.default_platform;
    }
  }

  // 3. Fallback to LinkedIn (most common for B2B marketing)
  return 'linkedin';
}

/**
 * Get platform display name for user-facing messages
 */
export function getPlatformDisplayName(platform: string): string {
  const displayNames: Record<string, string> = {
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    email: 'Email',
  };

  return displayNames[platform] || 'LinkedIn';
}
