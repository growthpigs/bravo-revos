/**
 * RAG System Types
 *
 * Types for Gemini File Search integration and document management.
 */

/**
 * Document status in the system
 */
export type DocumentStatus =
  | 'pending' // Awaiting upload
  | 'uploading' // Upload in progress
  | 'processing' // Gemini processing
  | 'active' // Ready for search
  | 'failed' // Upload/processing failed
  | 'deleted'; // Marked for deletion

/**
 * Document scope
 */
export type DocumentScope = 'global' | 'client';

/**
 * Document metadata
 */
export interface DocumentMetadata {
  /**
   * Unique document ID
   */
  id: string;
  /**
   * Original filename
   */
  filename: string;
  /**
   * Display name
   */
  displayName: string;
  /**
   * MIME type
   */
  mimeType: string;
  /**
   * File size in bytes
   */
  sizeBytes: number;
  /**
   * Current status
   */
  status: DocumentStatus;
  /**
   * Gemini file name (after upload)
   */
  geminiFileName?: string;
  /**
   * Gemini file URI (for search)
   */
  geminiFileUri?: string;
  /**
   * Agency ID
   */
  agencyId: string;
  /**
   * Client ID (if client-specific)
   */
  clientId?: string;
  /**
   * Document scope
   */
  scope: DocumentScope;
  /**
   * User who uploaded
   */
  uploadedBy: string;
  /**
   * Upload timestamp
   */
  uploadedAt: Date;
  /**
   * Last indexed timestamp
   */
  indexedAt?: Date;
  /**
   * Error message if failed
   */
  errorMessage?: string;
  /**
   * Tags for organization
   */
  tags: string[];
  /**
   * Custom metadata
   */
  customMetadata?: Record<string, string>;
}

/**
 * Upload progress event
 */
export interface UploadProgress {
  documentId: string;
  stage: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

/**
 * Document upload request
 */
export interface DocumentUploadRequest {
  file: File | Blob;
  filename: string;
  displayName: string;
  agencyId: string;
  clientId?: string;
  scope: DocumentScope;
  uploadedBy: string;
  tags?: string[];
}

/**
 * Index result from Gemini
 */
export interface IndexResult {
  fileId: string;
  fileUri: string;
  status: 'indexed' | 'failed';
  errorMessage?: string;
  processingTimeMs: number;
  /**
   * RELIABILITY: True if post-upload verification confirmed doc is findable
   * If false, doc may exist but hydration might fail to find it
   */
  verified?: boolean;
}

/**
 * Citation from Gemini grounding
 */
export interface RAGCitation {
  /**
   * Source document ID
   */
  documentId: string;
  /**
   * Source document name
   */
  documentName: string;
  /**
   * Relevant text chunk
   */
  text: string;
  /**
   * Start offset in document
   */
  startOffset?: number;
  /**
   * End offset in document
   */
  endOffset?: number;
  /**
   * Page number if applicable
   */
  pageNumber?: number;
  /**
   * Confidence score
   */
  confidence: number;
}

/**
 * RAG search result
 */
export interface RAGResult {
  /**
   * Generated response content
   */
  content: string;
  /**
   * Citations extracted from grounding
   */
  citations: RAGCitation[];
  /**
   * Documents used in response
   */
  documentsUsed: string[];
  /**
   * Search time in ms
   */
  searchTimeMs: number;
  /**
   * Was the answer grounded in documents
   */
  isGrounded: boolean;
  /**
   * RELIABILITY: True if this is an error response (not just "no docs found")
   * Allows consumers to distinguish between "no results" and "API failure"
   */
  error?: boolean;
}

/**
 * RAG search request
 */
export interface RAGSearchRequest {
  /**
   * User query
   */
  query: string;
  /**
   * Agency ID for document filtering
   */
  agencyId: string;
  /**
   * Client ID for client-specific docs
   */
  clientId?: string;
  /**
   * Include global docs
   */
  includeGlobal?: boolean;
  /**
   * Maximum documents to search
   */
  maxDocuments?: number;
  /**
   * Minimum confidence threshold
   */
  minConfidence?: number;
}

/**
 * Document collection for an agency
 */
export interface DocumentCollection {
  agencyId: string;
  globalDocuments: DocumentMetadata[];
  clientDocuments: Map<string, DocumentMetadata[]>;
  totalDocuments: number;
  totalSizeBytes: number;
  lastUpdated: Date;
}

/**
 * Supported MIME types for Gemini File Search
 */
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/html',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

/**
 * Check if MIME type is supported
 */
export function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return SUPPORTED_MIME_TYPES.includes(mimeType as SupportedMimeType);
}

/**
 * Maximum file size (50MB for Gemini)
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
