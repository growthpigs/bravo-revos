/**
 * RAG System
 *
 * Document-based retrieval using Gemini File Search.
 */

export { GeminiRAGService, getGeminiRAG, resetGeminiRAG } from './gemini-rag';
export {
  IndexingPipeline,
  getIndexingPipeline,
  resetIndexingPipeline,
} from './indexing-pipeline';
export {
  CitationExtractor,
  getCitationExtractor,
  resetCitationExtractor,
} from './citation-extractor';
export {
  DocumentManager,
  getDocumentManager,
  resetDocumentManager,
} from './document-manager';

export type {
  DocumentStatus,
  DocumentScope,
  DocumentMetadata,
  UploadProgress,
  DocumentUploadRequest,
  IndexResult,
  RAGCitation,
  RAGResult,
  RAGSearchRequest,
  DocumentCollection,
  SupportedMimeType,
} from './types';
export {
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  isSupportedMimeType,
} from './types';

export type {
  IndexingJob,
  PipelineConfig,
  ProgressListener,
} from './indexing-pipeline';

export type {
  FormattedCitation,
  CitationList,
  CitedText,
  GroundingChunk,
  GroundingMetadata,
} from './citation-extractor';

export type {
  DocumentFilter,
  DocumentSort,
  DocumentStats,
} from './document-manager';
