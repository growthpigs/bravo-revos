/**
 * Document Indexing Pipeline
 *
 * Manages the full document indexing workflow with progress tracking,
 * batching, and error handling.
 */

import type {
  DocumentMetadata,
  DocumentUploadRequest,
  UploadProgress,
  IndexResult,
  DocumentScope,
} from './types';
import { GeminiRAGService, getGeminiRAG } from './gemini-rag';

/**
 * Batch indexing job
 */
export interface IndexingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  documents: DocumentUploadRequest[];
  results: Map<string, IndexResult>;
  startedAt?: Date;
  completedAt?: Date;
  totalProgress: number;
  errors: Array<{ documentId: string; error: string }>;
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  /**
   * Maximum concurrent uploads
   */
  maxConcurrent: number;
  /**
   * Retry failed uploads
   */
  retryFailed: boolean;
  /**
   * Max retry attempts
   */
  maxRetries: number;
  /**
   * Delay between retries (ms)
   */
  retryDelayMs: number;
}

const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  maxConcurrent: 3,
  retryFailed: true,
  maxRetries: 2,
  retryDelayMs: 5000,
};

/**
 * Progress listener callback
 */
export type ProgressListener = (
  jobId: string,
  documentId: string,
  progress: UploadProgress
) => void;

/**
 * IndexingPipeline - Manages document indexing workflow
 */
export class IndexingPipeline {
  private ragService: GeminiRAGService;
  private jobs: Map<string, IndexingJob> = new Map();
  private config: PipelineConfig;
  private progressListeners: Set<ProgressListener> = new Set();

  constructor(ragService: GeminiRAGService, config?: Partial<PipelineConfig>) {
    this.ragService = ragService;
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };

    // Set up progress callback on RAG service
    this.ragService.setProgressCallback((progress) => {
      this.handleProgress(progress);
    });
  }

  /**
   * Add a progress listener
   */
  addProgressListener(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  /**
   * Create and start a new indexing job
   */
  async createJob(documents: DocumentUploadRequest[]): Promise<IndexingJob> {
    const jobId = this.generateJobId();

    const job: IndexingJob = {
      id: jobId,
      status: 'pending',
      documents,
      results: new Map(),
      totalProgress: 0,
      errors: [],
    };

    this.jobs.set(jobId, job);
    return job;
  }

  /**
   * Start an indexing job
   */
  async runJob(jobId: string): Promise<IndexingJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'running';
    job.startedAt = new Date();

    try {
      // Process documents in batches
      const documents = [...job.documents];
      const batches = this.createBatches(documents, this.config.maxConcurrent);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        await this.processBatch(job, batch);

        // Update total progress
        const completedCount = job.results.size;
        job.totalProgress = (completedCount / job.documents.length) * 100;
      }

      // Retry failed documents if configured
      if (this.config.retryFailed && job.errors.length > 0) {
        await this.retryFailed(job);
      }

      job.status = job.errors.length === 0 ? 'completed' : 'failed';
      job.completedAt = new Date();
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      throw error;
    }

    return job;
  }

  /**
   * Create batches from documents
   */
  private createBatches(
    documents: DocumentUploadRequest[],
    batchSize: number
  ): DocumentUploadRequest[][] {
    const batches: DocumentUploadRequest[][] = [];
    for (let i = 0; i < documents.length; i += batchSize) {
      batches.push(documents.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of documents concurrently
   */
  private async processBatch(
    job: IndexingJob,
    batch: DocumentUploadRequest[]
  ): Promise<void> {
    const promises = batch.map((doc) => this.indexDocument(job, doc));
    await Promise.all(promises);
  }

  /**
   * Index a single document
   */
  private async indexDocument(
    job: IndexingJob,
    request: DocumentUploadRequest
  ): Promise<void> {
    const documentId = this.generateDocumentId();

    const metadata: Omit<DocumentMetadata, 'status' | 'geminiFileName' | 'geminiFileUri' | 'indexedAt' | 'errorMessage'> = {
      id: documentId,
      filename: request.filename,
      displayName: request.displayName,
      mimeType: this.getMimeType(request.filename),
      sizeBytes: request.file.size,
      agencyId: request.agencyId,
      clientId: request.clientId,
      scope: request.scope,
      uploadedBy: request.uploadedBy,
      uploadedAt: new Date(),
      tags: request.tags || [],
    };

    try {
      const result = await this.ragService.indexDocument(request.file, metadata);
      job.results.set(documentId, result);

      if (result.status === 'failed') {
        job.errors.push({
          documentId,
          error: result.errorMessage || 'Unknown error',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      job.results.set(documentId, {
        fileId: documentId,
        fileUri: '',
        status: 'failed',
        errorMessage: message,
        processingTimeMs: 0,
      });
      job.errors.push({ documentId, error: message });
    }
  }

  /**
   * Retry failed documents
   */
  private async retryFailed(job: IndexingJob): Promise<void> {
    const failedDocIds = job.errors.map((e) => e.documentId);
    const failedDocs = job.documents.filter((d) =>
      failedDocIds.includes(this.getDocIdForRequest(d, job))
    );

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      if (failedDocs.length === 0) break;

      // Wait before retry
      await new Promise((r) => setTimeout(r, this.config.retryDelayMs));

      // Clear errors for retry
      job.errors = job.errors.filter(
        (e) => !failedDocIds.includes(e.documentId)
      );

      // Retry in smaller batches
      const retryBatches = this.createBatches(failedDocs, 1);
      for (const batch of retryBatches) {
        await this.processBatch(job, batch);
      }
    }
  }

  /**
   * Get document ID for a request (helper for retry matching)
   */
  private getDocIdForRequest(
    request: DocumentUploadRequest,
    job: IndexingJob
  ): string {
    // Find the result that matches this request
    for (const [docId, result] of job.results) {
      const doc = this.ragService.getDocument(docId);
      if (doc && doc.filename === request.filename) {
        return docId;
      }
    }
    return '';
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): IndexingJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): IndexingJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Cancel a running job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'failed';
      job.completedAt = new Date();
      job.errors.push({ documentId: '', error: 'Job cancelled by user' });
      return true;
    }
    return false;
  }

  /**
   * Handle progress updates from RAG service
   */
  private handleProgress(progress: UploadProgress): void {
    // Find the job containing this document
    for (const [jobId, job] of this.jobs) {
      if (job.status === 'running') {
        // Notify all listeners
        for (const listener of this.progressListeners) {
          listener(jobId, progress.documentId, progress);
        }
      }
    }
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      csv: 'text/csv',
      html: 'text/html',
      json: 'application/json',
      md: 'text/markdown',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

// Singleton instance
let pipelineInstance: IndexingPipeline | null = null;

/**
 * Get or create IndexingPipeline instance
 */
export function getIndexingPipeline(
  apiKey?: string,
  config?: Partial<PipelineConfig>
): IndexingPipeline {
  if (!pipelineInstance) {
    const ragService = getGeminiRAG(apiKey);
    pipelineInstance = new IndexingPipeline(ragService, config);
  }
  return pipelineInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetIndexingPipeline(): void {
  pipelineInstance = null;
}
