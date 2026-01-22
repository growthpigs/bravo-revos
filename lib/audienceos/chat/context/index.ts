/**
 * Chat Context Module
 *
 * Provides app awareness and context injection for the chat system.
 */

export {
  APP_STRUCTURE,
  buildAppContext,
  generateAppContextPrompt,
  getPageByPath,
  getNavigablePages,
  type AppPage,
  type AppContext,
} from './app-structure';

export {
  loadCartridgeContext,
  generateCartridgeContextPrompt,
  hasCartridgeContext,
  invalidateCartridgeCache,
  clearCartridgeCache,
  type BrandCartridge,
  type StyleCartridge,
  type InstructionCartridge,
  type CartridgeContext,
} from './cartridge-loader';

export {
  getOrCreateSession,
  getSessionById,
  getRecentSessions,
  addMessage,
  getSessionMessages,
  getRecentMessages,
  updateSessionContext,
  updateSessionTitle,
  closeSession,
  formatMessagesForContext,
  type ChatSession,
  type ChatMessage,
  type CreateSessionOptions,
  type AddMessageOptions,
} from './chat-history';
