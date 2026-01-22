/**
 * Shared Chat Types - Re-exported from @pai/hgc
 *
 * This file provides a migration path for AudienceOS to use shared types
 * from the HGC library instead of maintaining duplicate definitions.
 *
 * Usage:
 * - New code should import from this file or directly from '@pai/hgc/chat'
 * - Existing code can gradually migrate from './types' to './shared-types'
 *
 * @example
 * // Instead of:
 * import type { Citation, ChatMessage } from './types';
 *
 * // Use:
 * import type { Citation, ChatMessage } from './shared-types';
 * // Or directly:
 * import type { Citation, ChatMessage } from '@pai/hgc/chat';
 */

// Re-export all shared types from HGC
export type {
  MessageRole,
  RouteType,
  QueryRoute,
  RouterContext,
  ChatMessage,
  Citation,
  MessageMetadata,
  ChatSession,
  SessionContext,
  StreamChunk,
  ChatRequest,
  ChatResponse,
  StreamOptions,
  ErrorActionRequired,
} from '@pai/hgc/chat';

// Re-export error classes
export {
  ChatError,
  GatewayError,
  TokenExpiredError,
  RateLimitError,
  GatewayUnavailableError,
  SessionPersistenceError,
} from '@pai/hgc/chat';

// Re-export services (for new features that want to use HGC directly)
export { ChatService, getChatService } from '@pai/hgc/chat';
export { SmartRouter, getSmartRouter } from '@pai/hgc/chat';
