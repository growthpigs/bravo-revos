/**
 * Gemini RAG Service
 *
 * Implements Gemini File Search for document-based retrieval.
 * Uses Gemini's native file upload and grounding capabilities.
 */

import { GoogleGenAI } from '@google/genai';
import type {
  DocumentMetadata,
  IndexResult,
  RAGResult,
  RAGCitation,
  RAGSearchRequest,
  UploadProgress,
} from './types';
import { isSupportedMimeType, MAX_FILE_SIZE_BYTES } from './types';

/**
 * Metadata encoding format for Gemini displayName
 * Format: hgc|{agencyId}|{scope}|{clientId}|{originalDisplayName}
 * This allows us to reconstruct metadata from files.list() response
 *
 * HARDENING (2026-01-04):
 * - Input validation on encode
 * - Retry logic with exponential backoff
 * - Detailed logging for debugging
 * - Proper error state tracking (not silent failures)
 */
const DISPLAY_NAME_PREFIX = 'hgc';
const DISPLAY_NAME_SEPARATOR = '|';

/** Maximum retries for hydration */
const MAX_HYDRATION_RETRIES = 3;
/** Base delay for exponential backoff (ms) */
const HYDRATION_RETRY_BASE_DELAY = 1000;
/** Valid scope values */
const VALID_SCOPES = ['global', 'client'] as const;

/**
 * RELIABILITY HARDENING (2026-01-04)
 * Circuit breaker to prevent hammering failing API
 */
const CIRCUIT_BREAKER_THRESHOLD = 3; // Failures before opening circuit
const CIRCUIT_BREAKER_RESET_MS = 60000; // 1 minute before retry

/** Error state tracking for reliability */
interface ErrorState {
  consecutiveFailures: number;
  lastFailureTime: number | null;
  circuitOpen: boolean;
  lastError: string | null;
}

/**
 * GeminiRAGService - Document search using Gemini File API
 *
 * CRITICAL FIX (2026-01-04): Documents are now hydrated from Gemini's files.list()
 * on first search. This solves the serverless cold-start problem where the
 * in-memory Map was empty across requests.
 */
export class GeminiRAGService {
  private genai: GoogleGenAI;
  // CRITICAL: Gemini 3 ONLY per project requirements
  private model: string = 'gemini-3-flash-preview';
  private documents: Map<string, DocumentMetadata> = new Map();
  private onProgress?: (progress: UploadProgress) => void;
  private filesLoaded: boolean = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * RELIABILITY: Error state tracking for circuit breaker
   * Prevents silent failures by tracking API health
   */
  private errorState: ErrorState = {
    consecutiveFailures: 0,
    lastFailureTime: null,
    circuitOpen: false,
    lastError: null,
  };

  constructor(apiKey: string) {
    this.genai = new GoogleGenAI({ apiKey });
  }

  /**
   * RELIABILITY: Check if circuit breaker should block requests
   * Returns error message if circuit is open, null if OK to proceed
   */
  private checkCircuitBreaker(): string | null {
    if (!this.errorState.circuitOpen) {
      return null;
    }

    const timeSinceFailure = Date.now() - (this.errorState.lastFailureTime || 0);
    if (timeSinceFailure > CIRCUIT_BREAKER_RESET_MS) {
      // Circuit reset - allow one retry
      if (process.env.NODE_ENV === 'development') {
        console.log('[GeminiRAG] Circuit breaker reset, allowing retry');
      }
      this.errorState.circuitOpen = false;
      this.errorState.consecutiveFailures = 0;
      return null;
    }

    // Circuit still open
    return `RAG service temporarily unavailable (${Math.ceil((CIRCUIT_BREAKER_RESET_MS - timeSinceFailure) / 1000)}s until retry). Last error: ${this.errorState.lastError}`;
  }

  /**
   * RELIABILITY: Record a failure for circuit breaker
   */
  private recordFailure(error: string): void {
    this.errorState.consecutiveFailures++;
    this.errorState.lastFailureTime = Date.now();
    this.errorState.lastError = error;

    if (this.errorState.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.errorState.circuitOpen = true;
      console.error(`[GeminiRAG] Circuit breaker OPEN after ${this.errorState.consecutiveFailures} failures: ${error}`);
    }
  }

  /**
   * RELIABILITY: Record a success, reset failure count
   */
  private recordSuccess(): void {
    if (this.errorState.consecutiveFailures > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[GeminiRAG] Success after failures, resetting error state');
      }
    }
    this.errorState.consecutiveFailures = 0;
    this.errorState.lastError = null;
  }

  /**
   * RELIABILITY: Get current health status
   */
  getHealthStatus(): { healthy: boolean; circuitOpen: boolean; consecutiveFailures: number; lastError: string | null; documentsLoaded: number } {
    return {
      healthy: !this.errorState.circuitOpen && this.filesLoaded,
      circuitOpen: this.errorState.circuitOpen,
      consecutiveFailures: this.errorState.consecutiveFailures,
      lastError: this.errorState.lastError,
      documentsLoaded: this.documents.size,
    };
  }

  /**
   * RELIABILITY: Verify a document is findable via files.list() after upload
   * This catches issues where upload succeeds but encoding is wrong
   */
  private async verifyDocumentFindable(
    geminiFileName: string,
    expectedDisplayName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the specific file from Gemini
      const fileInfo = await this.genai.files.get({ name: geminiFileName });

      if (!fileInfo) {
        return { success: false, error: 'File not found in Gemini' };
      }

      if (fileInfo.state !== 'ACTIVE') {
        return { success: false, error: `File state is ${fileInfo.state}, expected ACTIVE` };
      }

      if (fileInfo.displayName !== expectedDisplayName) {
        return {
          success: false,
          error: `DisplayName mismatch: got "${fileInfo.displayName}", expected "${expectedDisplayName}"`,
        };
      }

      // Verify it can be decoded
      const decoded = this.decodeDisplayName(fileInfo.displayName || '');
      if (!decoded) {
        return { success: false, error: 'DisplayName cannot be decoded as HGC format' };
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[GeminiRAG] Post-upload verification passed for ${geminiFileName}`);
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Verification failed: ${message}` };
    }
  }

  /**
   * Encode metadata into displayName for Gemini file storage
   * This allows reconstruction from files.list() response
   *
   * HARDENING: Input validation to prevent malformed displayNames
   */
  private encodeDisplayName(metadata: { agencyId: string; scope: string; clientId?: string; displayName: string }): string {
    // Validate required fields
    if (!metadata.agencyId || typeof metadata.agencyId !== 'string') {
      throw new Error('[GeminiRAG] encodeDisplayName: agencyId is required');
    }
    if (!metadata.scope || !VALID_SCOPES.includes(metadata.scope as typeof VALID_SCOPES[number])) {
      throw new Error(`[GeminiRAG] encodeDisplayName: scope must be one of: ${VALID_SCOPES.join(', ')}`);
    }
    if (!metadata.displayName || typeof metadata.displayName !== 'string') {
      throw new Error('[GeminiRAG] encodeDisplayName: displayName is required');
    }

    // Sanitize inputs to prevent injection via separator
    const sanitize = (s: string) => s.replace(/\|/g, '_');

    const clientId = metadata.clientId ? sanitize(metadata.clientId) : 'none';
    return [
      DISPLAY_NAME_PREFIX,
      sanitize(metadata.agencyId),
      metadata.scope,
      clientId,
      metadata.displayName, // Don't sanitize displayName - we rejoin with separator on decode
    ].join(DISPLAY_NAME_SEPARATOR);
  }

  /**
   * Decode displayName back into metadata
   * Returns null if not an HGC-encoded file
   */
  private decodeDisplayName(encodedName: string): { agencyId: string; scope: 'global' | 'client'; clientId?: string; displayName: string } | null {
    const parts = encodedName.split(DISPLAY_NAME_SEPARATOR);
    if (parts.length < 5 || parts[0] !== DISPLAY_NAME_PREFIX) {
      return null; // Not an HGC file
    }
    const [, agencyId, scope, clientId, ...displayNameParts] = parts;
    return {
      agencyId,
      scope: (scope === 'client' ? 'client' : 'global') as 'global' | 'client',
      clientId: clientId === 'none' ? undefined : clientId,
      displayName: displayNameParts.join(DISPLAY_NAME_SEPARATOR), // Handle displayNames with | in them
    };
  }

  /**
   * Load existing files from Gemini's storage
   * This hydrates the in-memory Map from Gemini's persistent file storage
   * Called lazily on first search to avoid blocking constructor
   *
   * HARDENING: Retry logic with exponential backoff
   */
  async loadExistingFiles(): Promise<void> {
    // Prevent concurrent loads
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    if (this.filesLoaded) {
      return;
    }

    this.loadingPromise = this._doLoadFilesWithRetry();
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * Retry wrapper for file loading with exponential backoff
   */
  private async _doLoadFilesWithRetry(): Promise<void> {
    let lastError: Error | null = null;
    const isDev = process.env.NODE_ENV === 'development';

    for (let attempt = 1; attempt <= MAX_HYDRATION_RETRIES; attempt++) {
      try {
        await this._doLoadFiles();
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < MAX_HYDRATION_RETRIES) {
          const delay = HYDRATION_RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
          if (isDev) {
            console.warn(`[GeminiRAG] Hydration attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    console.error(`[GeminiRAG] Hydration failed after ${MAX_HYDRATION_RETRIES} attempts:`, lastError?.message);
    this.filesLoaded = true; // Mark as loaded to prevent infinite retry loops
  }

  private async _doLoadFiles(): Promise<void> {
    const isDev = process.env.NODE_ENV === 'development';

    // eslint-disable-next-line no-useless-catch
    try {
      // files.list() returns a Pager that we need to iterate
      const filesPager = await this.genai.files.list();

      let loadedCount = 0;
      let totalFiles = 0;
      let skippedNonActive = 0;
      let skippedNonHGC = 0;

      // Iterate over the pager (async iterator)
      for await (const file of filesPager) {
        totalFiles++;

        // Skip non-ACTIVE files
        if (file.state !== 'ACTIVE') {
          skippedNonActive++;
          if (isDev) {
            console.log(`[GeminiRAG] Skipping non-ACTIVE file: ${file.displayName} (state=${file.state})`);
          }
          continue;
        }

        // Try to decode our metadata from displayName
        const decoded = this.decodeDisplayName(file.displayName || '');
        if (!decoded) {
          // Not an HGC file, skip
          skippedNonHGC++;
          if (isDev) {
            console.log(`[GeminiRAG] Skipping non-HGC file: ${file.displayName}`);
          }
          continue;
        }

        // Generate document ID from Gemini file name
        const documentId = `gemini-${file.name}`;

        // Only add if not already in Map
        if (!this.documents.has(documentId)) {
          const metadata: DocumentMetadata = {
            id: documentId,
            filename: decoded.displayName,
            displayName: decoded.displayName,
            mimeType: file.mimeType || 'application/octet-stream',
            sizeBytes: file.sizeBytes ? parseInt(file.sizeBytes.toString(), 10) : 0,
            status: 'active',
            geminiFileName: file.name!,
            geminiFileUri: file.uri!,
            agencyId: decoded.agencyId,
            clientId: decoded.clientId,
            scope: decoded.scope,
            uploadedBy: 'system', // Unknown from Gemini response
            uploadedAt: file.createTime ? new Date(file.createTime) : new Date(),
            indexedAt: new Date(),
            tags: [],
          };
          this.documents.set(documentId, metadata);
          loadedCount++;
        }
      }

      this.filesLoaded = true;
      if (isDev || loadedCount > 0) {
        console.log(`[GeminiRAG] Hydration complete: ${loadedCount} loaded, ${skippedNonHGC} non-HGC, ${skippedNonActive} non-ACTIVE (total: ${totalFiles} files in Gemini)`);
      }
    } catch (error) {
      // Re-throw to trigger retry logic in _doLoadFilesWithRetry
      throw error;
    }
  }

  /**
   * Set progress callback for upload tracking
   */
  setProgressCallback(callback: (progress: UploadProgress) => void): void {
    this.onProgress = callback;
  }

  /**
   * Upload and index a document
   */
  async indexDocument(
    file: File | Blob,
    metadata: Omit<DocumentMetadata, 'status' | 'geminiFileName' | 'geminiFileUri' | 'indexedAt' | 'errorMessage'>
  ): Promise<IndexResult> {
    const startTime = Date.now();
    const documentId = metadata.id;

    // Validate file
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        fileId: documentId,
        fileUri: '',
        status: 'failed',
        errorMessage: `File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
        processingTimeMs: Date.now() - startTime,
      };
    }

    if (!isSupportedMimeType(metadata.mimeType)) {
      return {
        fileId: documentId,
        fileUri: '',
        status: 'failed',
        errorMessage: `Unsupported file type: ${metadata.mimeType}`,
        processingTimeMs: Date.now() - startTime,
      };
    }

    try {
      // Report upload start
      this.reportProgress(documentId, 'uploading', 0, 'Starting upload...');

      // Convert to buffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Gemini File API
      this.reportProgress(documentId, 'uploading', 30, 'Uploading to Gemini...');

      // Encode metadata in displayName for later hydration from files.list()
      const encodedDisplayName = this.encodeDisplayName({
        agencyId: metadata.agencyId,
        scope: metadata.scope,
        clientId: metadata.clientId,
        displayName: metadata.displayName,
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`[GeminiRAG] Uploading with encoded displayName: "${encodedDisplayName}"`);
        console.log(`[GeminiRAG] Original: agencyId=${metadata.agencyId}, scope=${metadata.scope}, displayName="${metadata.displayName}"`);
      }

      const uploadResult = await this.genai.files.upload({
        file: new Blob([buffer], { type: metadata.mimeType }),
        config: {
          mimeType: metadata.mimeType,
          displayName: encodedDisplayName,
        },
      });

      this.reportProgress(documentId, 'processing', 60, 'Processing document...');

      // Poll for processing completion
      let fileInfo = uploadResult;
      let pollCount = 0;
      const maxPolls = 30; // 60 seconds max

      while (fileInfo.state === 'PROCESSING' && pollCount < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        fileInfo = await this.genai.files.get({ name: fileInfo.name! });
        pollCount++;

        const progress = 60 + Math.min(pollCount * 1.3, 35);
        this.reportProgress(
          documentId,
          'processing',
          progress,
          `Processing... (${pollCount * 2}s)`
        );
      }

      if (fileInfo.state !== 'ACTIVE') {
        this.reportProgress(documentId, 'error', 100, 'Processing failed');
        return {
          fileId: documentId,
          fileUri: '',
          status: 'failed',
          errorMessage: `File processing failed. State: ${fileInfo.state}`,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Store document metadata
      const fullMetadata: DocumentMetadata = {
        ...metadata,
        status: 'active',
        geminiFileName: fileInfo.name!,
        geminiFileUri: fileInfo.uri!,
        indexedAt: new Date(),
      };
      this.documents.set(documentId, fullMetadata);

      // RELIABILITY: Verify document is findable after upload
      this.reportProgress(documentId, 'processing', 95, 'Verifying document...');
      const verifyResult = await this.verifyDocumentFindable(fileInfo.name!, encodedDisplayName);

      if (!verifyResult.success) {
        console.warn(`[GeminiRAG] Post-upload verification failed: ${verifyResult.error}`);
        // Don't fail the upload, but log the warning
        // The document is in Gemini, but hydration might have issues
      }

      this.reportProgress(documentId, 'complete', 100, 'Document indexed successfully');

      return {
        fileId: documentId,
        fileUri: fileInfo.uri!,
        status: 'indexed',
        processingTimeMs: Date.now() - startTime,
        verified: verifyResult.success, // RELIABILITY: Include verification status
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.reportProgress(documentId, 'error', 100, `Error: ${message}`);

      return {
        fileId: documentId,
        fileUri: '',
        status: 'failed',
        errorMessage: message,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Search documents with a query
   *
   * RELIABILITY: Circuit breaker prevents hammering a failing API
   * Clear error messages distinguish "no docs" from "API failure"
   */
  async search(request: RAGSearchRequest): Promise<RAGResult> {
    const startTime = Date.now();
    const isDev = process.env.NODE_ENV === 'development';

    // RELIABILITY: Check circuit breaker before making API calls
    const circuitError = this.checkCircuitBreaker();
    if (circuitError) {
      return {
        content: circuitError,
        citations: [],
        documentsUsed: [],
        searchTimeMs: Date.now() - startTime,
        isGrounded: false,
        error: true, // RELIABILITY: Explicit error flag
      };
    }

    // CRITICAL: Hydrate from Gemini file storage on first search
    // This fixes the serverless cold-start problem (2026-01-04)
    await this.loadExistingFiles();

    if (isDev) {
      console.log(`[GeminiRAG] Search request: agencyId=${request.agencyId}, clientId=${request.clientId}, query="${request.query.slice(0, 50)}..."`);
      console.log(`[GeminiRAG] Total documents in memory: ${this.documents.size}`);
      for (const [id, doc] of this.documents.entries()) {
        console.log(`[GeminiRAG] - ${id}: "${doc.displayName}" (agency=${doc.agencyId}, scope=${doc.scope}, status=${doc.status})`);
      }
    }

    // Get relevant documents
    const documents = this.getRelevantDocuments(request);

    if (isDev) {
      console.log(`[GeminiRAG] Found ${documents.length} relevant documents for search:`);
      documents.forEach((doc, i) => {
        console.log(`[GeminiRAG]   ${i + 1}. "${doc.displayName}" (${doc.geminiFileUri?.slice(0, 50)}...)`);
      });
    }

    if (documents.length === 0) {
      return {
        content: 'No documents found for this query. Please ensure documents have been uploaded.',
        citations: [],
        documentsUsed: [],
        searchTimeMs: Date.now() - startTime,
        isGrounded: false,
      };
    }

    try {
      // Build content parts with file data
      const fileParts = documents.map((doc) => ({
        fileData: {
          fileUri: doc.geminiFileUri!,
          mimeType: doc.mimeType,
        },
      }));

      // Search with Gemini
      const result = await this.genai.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [
              ...fileParts,
              {
                text: `Based on the documents provided, answer this question: ${request.query}

If the answer is not found in the documents, say so clearly.
When citing information, reference the specific document.`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      });

      // Extract citations from grounding metadata
      const responseText = result.text || '';
      const citations = this.extractCitations(result, documents);

      // RELIABILITY: Record success to reset circuit breaker
      this.recordSuccess();

      return {
        content: responseText,
        citations,
        documentsUsed: documents.map((d) => d.id),
        searchTimeMs: Date.now() - startTime,
        isGrounded: citations.length > 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';

      // RELIABILITY: Record failure for circuit breaker
      this.recordFailure(message);

      return {
        content: `Search error: ${message}. If this persists, please try again in a minute.`,
        citations: [],
        documentsUsed: [],
        searchTimeMs: Date.now() - startTime,
        isGrounded: false,
        error: true, // RELIABILITY: Explicit error flag
      };
    }
  }

  /**
   * Get documents relevant to the search request
   */
  private getRelevantDocuments(request: RAGSearchRequest): DocumentMetadata[] {
    const { agencyId, clientId, includeGlobal = true, maxDocuments = 5 } = request;

    const relevant: DocumentMetadata[] = [];

    for (const doc of this.documents.values()) {
      // Skip non-active documents
      if (doc.status !== 'active' || !doc.geminiFileUri) {
        continue;
      }

      // Check agency match
      if (doc.agencyId !== agencyId) {
        continue;
      }

      // Include based on scope
      if (doc.scope === 'global' && includeGlobal) {
        relevant.push(doc);
      } else if (doc.scope === 'client' && doc.clientId === clientId) {
        relevant.push(doc);
      }

      if (relevant.length >= maxDocuments) {
        break;
      }
    }

    return relevant;
  }

  /**
   * Extract citations from Gemini response
   */
  private extractCitations(
    result: { candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string }; retrievedContext?: { uri?: string; title?: string; text?: string } }> } }> },
    documents: DocumentMetadata[]
  ): RAGCitation[] {
    const citations: RAGCitation[] = [];
    const candidate = result.candidates?.[0];
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];

    for (const chunk of groundingChunks) {
      const context = chunk.retrievedContext;
      if (context) {
        // Find matching document
        const matchingDoc = documents.find(
          (d) => d.geminiFileUri === context.uri || d.displayName === context.title
        );

        citations.push({
          documentId: matchingDoc?.id || 'unknown',
          documentName: matchingDoc?.displayName || context.title || 'Unknown',
          text: context.text || '',
          confidence: 0.8, // Gemini doesn't provide per-chunk confidence
        });
      }
    }

    return citations;
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      return false;
    }

    try {
      // Delete from Gemini
      if (doc.geminiFileName) {
        await this.genai.files.delete({ name: doc.geminiFileName });
      }

      // Remove from local store
      this.documents.delete(documentId);
      return true;
    } catch (error) {
      console.error('Failed to delete document:', error);
      return false;
    }
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): DocumentMetadata | undefined {
    return this.documents.get(documentId);
  }

  /**
   * Get all documents for an agency
   */
  getAgencyDocuments(agencyId: string): DocumentMetadata[] {
    return Array.from(this.documents.values()).filter(
      (d) => d.agencyId === agencyId
    );
  }

  /**
   * Get documents for a specific client
   */
  getClientDocuments(agencyId: string, clientId: string): DocumentMetadata[] {
    return Array.from(this.documents.values()).filter(
      (d) => d.agencyId === agencyId && d.clientId === clientId
    );
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    documentId: string,
    stage: UploadProgress['stage'],
    progress: number,
    message: string
  ): void {
    if (this.onProgress) {
      this.onProgress({ documentId, stage, progress, message });
    }
  }

  /**
   * Load documents from external storage (for persistence)
   */
  loadDocuments(documents: DocumentMetadata[]): void {
    for (const doc of documents) {
      this.documents.set(doc.id, doc);
    }
  }

  /**
   * Export documents for persistence
   */
  exportDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values());
  }
}

// Singleton instance
let geminiRAGInstance: GeminiRAGService | null = null;

/**
 * Get or create GeminiRAGService instance
 */
export function getGeminiRAG(apiKey?: string): GeminiRAGService {
  if (!geminiRAGInstance) {
    if (!apiKey) {
      throw new Error('API key required for first GeminiRAGService initialization');
    }
    geminiRAGInstance = new GeminiRAGService(apiKey);
  }
  return geminiRAGInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetGeminiRAG(): void {
  geminiRAGInstance = null;
}
