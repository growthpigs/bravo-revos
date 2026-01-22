/**
 * Chat System Types
 *
 * Ported from Holy Grail Chat (HGC) with 9.5/10 confidence.
 * Part of: 3-System Consolidation
 */

/**
 * Message role
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Route type for smart routing (5 categories)
 */
export type RouteType = 'rag' | 'web' | 'memory' | 'casual' | 'dashboard';

/**
 * Query route with confidence scoring
 */
export interface RouterDecision {
  route: RouteType;
  confidence: number;
  reasoning?: string;
  estimatedLatencyMs?: number;
}

/**
 * Alias for RouterDecision (legacy naming)
 */
export type QueryRoute = RouterDecision;

/**
 * Router context for classification
 */
export interface RouterContext {
  sessionContext?: SessionContext;
  recentMessages?: ChatMessage[];
  currentPage?: string;
  userPreferences?: {
    preferredSources?: RouteType[];
    disabledSources?: RouteType[];
  };
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  route?: RouteType;
  citations?: Citation[];
  suggestions?: string[];
  metadata?: MessageMetadata;
}

/**
 * Citation from RAG or web search
 */
export interface Citation {
  index: number;
  title: string;
  url?: string;
  snippet?: string;
  source: 'rag' | 'web';
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  latencyMs?: number;
  model?: string;
  confidence?: number;
  isRAG?: boolean;
  functionCalls?: FunctionCall[];
}

/**
 * Function call record
 */
export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  success: boolean;
}

/**
 * Chat session
 */
export interface ChatSession {
  id: string;
  agencyId: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  context?: SessionContext;
}

/**
 * Session context for continuity
 */
export interface SessionContext {
  clientId?: string;
  clientName?: string;
  currentPage?: string;
  recentAlerts?: string[];
}

/**
 * Chat service configuration
 */
export interface ChatServiceConfig {
  agencyId: string;
  userId: string;
  geminiApiKey: string;
  mem0ApiKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

/**
 * Chat request
 */
export interface ChatRequest {
  message: string;
  sessionId?: string;
  agencyId: string;
  userId: string;
  context?: SessionContext;
  history?: ChatMessage[];
}

/**
 * Chat response
 */
export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

/**
 * Stream chunk for SSE
 */
export interface StreamChunk {
  type: 'content' | 'citation' | 'route' | 'suggestions' | 'done' | 'error' | 'function_call' | 'function_result';
  content?: string;
  citation?: Citation;
  route?: RouteType;
  routeConfidence?: number;
  suggestions?: string[];
  error?: string;
  functionName?: string;
  functionArgs?: Record<string, unknown>;
  functionSuccess?: boolean;
  functionSummary?: string;
}

/**
 * Stream options for handling responses
 */
export interface StreamOptions {
  onChunk: (chunk: StreamChunk) => void;
  onComplete: (message: ChatMessage) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

/**
 * Chat error with actionable guidance
 */
export class ChatError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

/**
 * Session persistence error
 */
export class SessionPersistenceError extends ChatError {
  constructor(message: string, retryable: boolean = true) {
    super(message, 'SESSION_PERSISTENCE_ERROR', retryable);
    this.name = 'SessionPersistenceError';
  }
}
