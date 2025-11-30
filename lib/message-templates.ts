/**
 * Message Templates for Lead Capture Flow
 *
 * CRITICAL PRINCIPLES:
 * - PUBLIC (comments): MUST vary randomly to look human
 * - PRIVATE (DMs): Can be consistent (nobody sees repetition)
 * - Style: lowercase casual, friendly, sometimes no capital letters
 *
 * @module lib/message-templates
 */

// ============================================
// COMMENT REPLIES - PUBLIC (MUST VARY)
// ============================================

/**
 * Comment replies for NON-CONNECTED users
 * These ask them to connect with email in the connection note
 * All lowercase casual to look human
 */
export const COMMENT_REPLIES_NOT_CONNECTED = [
  "thanks! send me a connect with your email in the note - i auto-accept so you'll get it right away",
  "hey! shoot me a connection request with your email and i'll send it straight over",
  "got it! connect with me and drop your email in the note - instant delivery",
  "nice! send a connect request with your email, i accept everyone",
  "thanks for the interest! pop your email in a connection request and it's yours",
  "hey {firstName}! connect with your email in the note and i'll fire it over asap",
  "on it! just need to connect first - add your email in the request and you'll have it in seconds",
  "sweet! send me a connect (email in the note) and i'll get that to you immediately",
  "awesome! hit me with a connect request + your email and i'll send it right over",
  "thanks {firstName}! connect with me and include your email - i auto-accept and you'll have it instantly",
] as const;

/**
 * Comment replies for CONNECTED users (when we DM them)
 * Just confirming we sent a DM - keep short and varied
 */
export const COMMENT_REPLIES_CONNECTED = [
  "just sent it to your DMs!",
  "check your messages!",
  "sent! it's in your inbox",
  "done - check your DMs {firstName}!",
  "you got it! sliding into your DMs now",
  "heading to your inbox now {firstName}",
  "check your DMs - just sent it over",
  "done! look for my message",
] as const;

/**
 * Comment replies for users who included EMAIL in their comment
 * (Rare case - most won't do this publicly)
 */
export const COMMENT_REPLIES_EMAIL_CAPTURED = [
  "perfect! sending it now - check your inbox",
  "got it! heading your way {firstName}",
  "done! check your email",
  "on its way to your inbox!",
  "sent! should be there in a sec",
] as const;

// ============================================
// DM TEMPLATES - PRIVATE (can be consistent)
// ============================================

/**
 * DM when connected user comments - ask for their email
 */
export const DM_CONNECTED_ASK_EMAIL =
  `hey {firstName}! thanks for the interest in the {leadMagnetName}. what's the best email to send it to?`;

/**
 * DM when someone connects WITH email in their connection note
 */
export const DM_CONNECTION_WITH_EMAIL =
  `hey {firstName}! here's your {leadMagnetName}: {link}

also sent to {email} - check spam if you don't see it!`;

/**
 * DM when someone connects WITHOUT email in their connection note
 */
export const DM_CONNECTION_NO_EMAIL =
  `thanks for connecting {firstName}! what's the best email to send the {leadMagnetName}?`;

/**
 * DM after they reply with their email
 */
export const DM_SENT_GUIDE =
  `perfect! just sent {leadMagnetName} to {email}. here's the direct link too: {link}

lmk what you think!`;

/**
 * DM when they reply but we can't extract an email
 */
export const DM_COULDNT_PARSE_EMAIL =
  `hey! couldn't quite catch the email - mind sending it again? just the email address is perfect`;

// ============================================
// CONNECTION REQUEST MESSAGE
// ============================================

/**
 * Message sent with the connection request
 * Keep friendly and brief - LinkedIn limits this
 */
export const CONNECTION_REQUEST_MESSAGE =
  `hey {firstName}! saw your comment - let's connect so i can send the {leadMagnetName} over!`;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a random comment reply for non-connected users
 * Replaces {firstName} placeholder if provided
 */
export function getRandomNotConnectedReply(firstName?: string): string {
  const templates = COMMENT_REPLIES_NOT_CONNECTED;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return firstName ? template.replace('{firstName}', firstName) : template.replace('{firstName}! ', '');
}

/**
 * Get a random comment reply for connected users (after sending DM)
 * Replaces {firstName} placeholder if provided
 */
export function getRandomConnectedReply(firstName?: string): string {
  const templates = COMMENT_REPLIES_CONNECTED;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return firstName ? template.replace('{firstName}', firstName) : template.replace('{firstName}', '');
}

/**
 * Get a random comment reply for email captured from comment
 * Replaces {firstName} placeholder if provided
 */
export function getRandomEmailCapturedReply(firstName?: string): string {
  const templates = COMMENT_REPLIES_EMAIL_CAPTURED;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return firstName ? template.replace('{firstName}', firstName) : template.replace('{firstName}', '');
}

/**
 * Build DM message for connected user asking for email
 */
export function buildDMConnectedAskEmail(params: {
  firstName: string;
  leadMagnetName?: string;
}): string {
  const name = params.leadMagnetName || 'guide';
  return DM_CONNECTED_ASK_EMAIL
    .replace('{firstName}', params.firstName)
    .replace('{leadMagnetName}', name);
}

/**
 * Build DM for connection WITH email in note
 */
export function buildDMConnectionWithEmail(params: {
  firstName: string;
  leadMagnetName?: string;
  email: string;
  link: string;
}): string {
  const name = params.leadMagnetName || 'guide';
  return DM_CONNECTION_WITH_EMAIL
    .replace('{firstName}', params.firstName)
    .replace('{leadMagnetName}', name)
    .replace('{email}', params.email)
    .replace('{link}', params.link);
}

/**
 * Build DM for connection WITHOUT email in note
 */
export function buildDMConnectionNoEmail(params: {
  firstName: string;
  leadMagnetName?: string;
}): string {
  const name = params.leadMagnetName || 'guide';
  return DM_CONNECTION_NO_EMAIL
    .replace('{firstName}', params.firstName)
    .replace('{leadMagnetName}', name);
}

/**
 * Build DM after receiving email reply
 */
export function buildDMSentGuide(params: {
  leadMagnetName?: string;
  email: string;
  link: string;
}): string {
  const name = params.leadMagnetName || 'guide';
  return DM_SENT_GUIDE
    .replace('{leadMagnetName}', name)
    .replace('{email}', params.email)
    .replace('{link}', params.link);
}

/**
 * Build connection request message
 */
export function buildConnectionRequestMessage(params: {
  firstName: string;
  leadMagnetName?: string;
}): string {
  const name = params.leadMagnetName || 'guide';
  return CONNECTION_REQUEST_MESSAGE
    .replace('{firstName}', params.firstName)
    .replace('{leadMagnetName}', name);
}

// ============================================
// TYPE EXPORTS
// ============================================

export type CommentReplyType = 'not_connected' | 'connected' | 'email_captured';
export type DMType = 'ask_email' | 'with_email' | 'no_email' | 'sent_guide' | 'parse_error';
