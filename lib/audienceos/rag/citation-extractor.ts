/**
 * Citation Extractor
 *
 * Extracts and formats citations from Gemini grounding metadata.
 * Creates inline citations and reference lists.
 */

import type { RAGCitation, DocumentMetadata } from './types';

/**
 * Formatted citation for display
 */
export interface FormattedCitation {
  /**
   * Citation index (e.g., [1])
   */
  index: number;
  /**
   * Short reference text
   */
  reference: string;
  /**
   * Full citation details
   */
  details: RAGCitation;
  /**
   * Inline marker to insert in text
   */
  inlineMarker: string;
}

/**
 * Citation reference list
 */
export interface CitationList {
  /**
   * Formatted citations
   */
  citations: FormattedCitation[];
  /**
   * Rendered markdown reference section
   */
  markdown: string;
  /**
   * HTML reference section
   */
  html: string;
}

/**
 * Text with inline citations
 */
export interface CitedText {
  /**
   * Original text
   */
  originalText: string;
  /**
   * Text with inline citation markers
   */
  citedText: string;
  /**
   * Citation list
   */
  citations: CitationList;
}

/**
 * Grounding chunk from Gemini response
 */
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  retrievedContext?: {
    uri?: string;
    title?: string;
    text?: string;
  };
}

/**
 * Grounding metadata from Gemini
 */
export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  webSearchQueries?: string[];
  searchEntryPoint?: {
    renderedContent?: string;
  };
  groundingSupports?: Array<{
    segment?: {
      startIndex?: number;
      endIndex?: number;
      text?: string;
    };
    groundingChunkIndices?: number[];
    confidenceScores?: number[];
  }>;
}

/**
 * CitationExtractor - Extract and format citations from Gemini responses
 */
export class CitationExtractor {
  private documents: Map<string, DocumentMetadata>;

  constructor(documents?: Map<string, DocumentMetadata>) {
    this.documents = documents || new Map();
  }

  /**
   * Extract citations from Gemini grounding metadata
   */
  extractCitations(
    groundingMetadata: GroundingMetadata | undefined,
    responseText: string
  ): RAGCitation[] {
    if (!groundingMetadata) {
      return [];
    }

    const citations: RAGCitation[] = [];
    const chunks = groundingMetadata.groundingChunks || [];
    const supports = groundingMetadata.groundingSupports || [];

    // Process grounding chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const citation = this.processChunk(chunk, i, supports);
      if (citation) {
        citations.push(citation);
      }
    }

    // Deduplicate citations
    return this.deduplicateCitations(citations);
  }

  /**
   * Process a single grounding chunk
   */
  private processChunk(
    chunk: GroundingChunk,
    index: number,
    supports: GroundingMetadata['groundingSupports']
  ): RAGCitation | null {
    // Handle document/file citations
    if (chunk.retrievedContext) {
      const ctx = chunk.retrievedContext;

      // Find matching document
      const matchingDoc = this.findMatchingDocument(ctx.uri, ctx.title);

      // Find confidence from supports
      const confidence = this.findConfidenceForChunk(index, supports || []);

      return {
        documentId: matchingDoc?.id || `chunk-${index}`,
        documentName: matchingDoc?.displayName || ctx.title || 'Unknown Document',
        text: ctx.text || '',
        confidence,
      };
    }

    // Handle web citations
    if (chunk.web) {
      return {
        documentId: `web-${index}`,
        documentName: chunk.web.title || chunk.web.uri || 'Web Source',
        text: '',
        confidence: 0.7,
      };
    }

    return null;
  }

  /**
   * Find matching document by URI or title
   */
  private findMatchingDocument(
    uri?: string,
    title?: string
  ): DocumentMetadata | undefined {
    for (const doc of this.documents.values()) {
      if (uri && doc.geminiFileUri === uri) {
        return doc;
      }
      if (title && doc.displayName === title) {
        return doc;
      }
    }
    return undefined;
  }

  /**
   * Find confidence score for a chunk from supports
   */
  private findConfidenceForChunk(
    chunkIndex: number,
    supports: NonNullable<GroundingMetadata['groundingSupports']>
  ): number {
    for (const support of supports) {
      const indices = support.groundingChunkIndices || [];
      const scores = support.confidenceScores || [];

      const idx = indices.indexOf(chunkIndex);
      if (idx !== -1 && scores[idx] !== undefined) {
        return scores[idx];
      }
    }
    return 0.8; // Default confidence
  }

  /**
   * Deduplicate citations by document
   */
  private deduplicateCitations(citations: RAGCitation[]): RAGCitation[] {
    const seen = new Map<string, RAGCitation>();

    for (const citation of citations) {
      const key = citation.documentId;
      const existing = seen.get(key);

      if (!existing || citation.confidence > existing.confidence) {
        seen.set(key, citation);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Format citations for display
   */
  formatCitations(citations: RAGCitation[]): CitationList {
    const formatted: FormattedCitation[] = citations.map((citation, i) => ({
      index: i + 1,
      reference: this.createShortReference(citation),
      details: citation,
      inlineMarker: `[${i + 1}]`,
    }));

    return {
      citations: formatted,
      markdown: this.renderMarkdown(formatted),
      html: this.renderHtml(formatted),
    };
  }

  /**
   * Create short reference text
   */
  private createShortReference(citation: RAGCitation): string {
    const name = citation.documentName;
    const maxLength = 50;

    if (name.length <= maxLength) {
      return name;
    }

    return name.substring(0, maxLength - 3) + '...';
  }

  /**
   * Render markdown reference section
   */
  private renderMarkdown(citations: FormattedCitation[]): string {
    if (citations.length === 0) {
      return '';
    }

    const lines = ['', '---', '**Sources:**'];

    for (const citation of citations) {
      const confidence = Math.round(citation.details.confidence * 100);
      lines.push(
        `${citation.inlineMarker} ${citation.details.documentName} (${confidence}% confidence)`
      );

      if (citation.details.text) {
        const excerpt =
          citation.details.text.length > 100
            ? citation.details.text.substring(0, 100) + '...'
            : citation.details.text;
        lines.push(`   > ${excerpt}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Render HTML reference section
   */
  private renderHtml(citations: FormattedCitation[]): string {
    if (citations.length === 0) {
      return '';
    }

    const items = citations
      .map((c) => {
        const confidence = Math.round(c.details.confidence * 100);
        let html = `<li><strong>${c.inlineMarker}</strong> ${this.escapeHtml(c.details.documentName)} <span class="confidence">(${confidence}%)</span>`;

        if (c.details.text) {
          const excerpt =
            c.details.text.length > 100
              ? c.details.text.substring(0, 100) + '...'
              : c.details.text;
          html += `<blockquote>${this.escapeHtml(excerpt)}</blockquote>`;
        }

        html += '</li>';
        return html;
      })
      .join('\n');

    return `<div class="citations"><h4>Sources</h4><ol>${items}</ol></div>`;
  }

  /**
   * Insert inline citations into text
   */
  insertInlineCitations(
    text: string,
    groundingMetadata: GroundingMetadata | undefined
  ): CitedText {
    const citations = this.extractCitations(groundingMetadata, text);
    const citationList = this.formatCitations(citations);

    // If we have grounding supports with segment info, use them
    const supports = groundingMetadata?.groundingSupports || [];
    let citedText = text;

    if (supports.length > 0) {
      citedText = this.insertFromSupports(text, supports, citationList.citations);
    }

    return {
      originalText: text,
      citedText,
      citations: citationList,
    };
  }

  /**
   * Insert citations based on grounding supports
   */
  private insertFromSupports(
    text: string,
    supports: NonNullable<GroundingMetadata['groundingSupports']>,
    formattedCitations: FormattedCitation[]
  ): string {
    // Sort supports by end index (descending) to insert from end
    const sortedSupports = [...supports]
      .filter((s) => s.segment?.endIndex !== undefined)
      .sort((a, b) => (b.segment?.endIndex || 0) - (a.segment?.endIndex || 0));

    let result = text;

    for (const support of sortedSupports) {
      const endIndex = support.segment?.endIndex;
      const chunkIndices = support.groundingChunkIndices || [];

      if (endIndex !== undefined && chunkIndices.length > 0) {
        // Get citation markers for this segment
        const markers = chunkIndices
          .map((idx) => formattedCitations[idx]?.inlineMarker)
          .filter(Boolean)
          .join('');

        if (markers) {
          result =
            result.substring(0, endIndex) + markers + result.substring(endIndex);
        }
      }
    }

    return result;
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Update document reference
   */
  setDocuments(documents: Map<string, DocumentMetadata>): void {
    this.documents = documents;
  }
}

// Singleton instance
let citationExtractorInstance: CitationExtractor | null = null;

/**
 * Get or create CitationExtractor instance
 */
export function getCitationExtractor(
  documents?: Map<string, DocumentMetadata>
): CitationExtractor {
  if (!citationExtractorInstance) {
    citationExtractorInstance = new CitationExtractor(documents);
  } else if (documents) {
    citationExtractorInstance.setDocuments(documents);
  }
  return citationExtractorInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetCitationExtractor(): void {
  citationExtractorInstance = null;
}
