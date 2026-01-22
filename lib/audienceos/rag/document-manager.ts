/**
 * Document Manager
 *
 * Organizes documents by scope (client-specific vs global).
 * Manages document collections and access control.
 */

import type {
  DocumentMetadata,
  DocumentScope,
  DocumentCollection,
} from './types';

/**
 * Document filter options
 */
export interface DocumentFilter {
  scope?: DocumentScope;
  clientId?: string;
  tags?: string[];
  status?: DocumentMetadata['status'];
  mimeType?: string;
  uploadedAfter?: Date;
  uploadedBefore?: Date;
  searchQuery?: string;
}

/**
 * Document sort options
 */
export interface DocumentSort {
  field: 'displayName' | 'uploadedAt' | 'sizeBytes' | 'indexedAt';
  direction: 'asc' | 'desc';
}

/**
 * Document statistics
 */
export interface DocumentStats {
  totalDocuments: number;
  globalDocuments: number;
  clientDocuments: number;
  totalSizeBytes: number;
  activeDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  documentsByClient: Map<string, number>;
  documentsByType: Map<string, number>;
}

/**
 * DocumentManager - Organize and manage document collections
 */
export class DocumentManager {
  private documents: Map<string, DocumentMetadata> = new Map();
  private agencyId: string;

  constructor(agencyId: string) {
    this.agencyId = agencyId;
  }

  /**
   * Add a document to the collection
   */
  addDocument(document: DocumentMetadata): void {
    if (document.agencyId !== this.agencyId) {
      throw new Error('Document belongs to a different agency');
    }
    this.documents.set(document.id, document);
  }

  /**
   * Remove a document from the collection
   */
  removeDocument(documentId: string): boolean {
    return this.documents.delete(documentId);
  }

  /**
   * Get a document by ID
   */
  getDocument(documentId: string): DocumentMetadata | undefined {
    return this.documents.get(documentId);
  }

  /**
   * Update a document
   */
  updateDocument(
    documentId: string,
    updates: Partial<DocumentMetadata>
  ): DocumentMetadata | undefined {
    const doc = this.documents.get(documentId);
    if (!doc) return undefined;

    const updated = { ...doc, ...updates };
    this.documents.set(documentId, updated);
    return updated;
  }

  /**
   * Get all global documents
   */
  getGlobalDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values()).filter(
      (d) => d.scope === 'global'
    );
  }

  /**
   * Get documents for a specific client
   */
  getClientDocuments(clientId: string): DocumentMetadata[] {
    return Array.from(this.documents.values()).filter(
      (d) => d.scope === 'client' && d.clientId === clientId
    );
  }

  /**
   * Get all documents accessible by a client (global + client-specific)
   */
  getAccessibleDocuments(clientId: string): DocumentMetadata[] {
    return Array.from(this.documents.values()).filter(
      (d) => d.scope === 'global' || (d.scope === 'client' && d.clientId === clientId)
    );
  }

  /**
   * Filter documents
   */
  filterDocuments(filter: DocumentFilter): DocumentMetadata[] {
    let result = Array.from(this.documents.values());

    if (filter.scope) {
      result = result.filter((d) => d.scope === filter.scope);
    }

    if (filter.clientId) {
      result = result.filter((d) => d.clientId === filter.clientId);
    }

    if (filter.tags && filter.tags.length > 0) {
      result = result.filter((d) =>
        filter.tags!.some((tag) => d.tags.includes(tag))
      );
    }

    if (filter.status) {
      result = result.filter((d) => d.status === filter.status);
    }

    if (filter.mimeType) {
      result = result.filter((d) => d.mimeType === filter.mimeType);
    }

    if (filter.uploadedAfter) {
      result = result.filter(
        (d) => d.uploadedAt >= filter.uploadedAfter!
      );
    }

    if (filter.uploadedBefore) {
      result = result.filter(
        (d) => d.uploadedAt <= filter.uploadedBefore!
      );
    }

    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.displayName.toLowerCase().includes(query) ||
          d.filename.toLowerCase().includes(query) ||
          d.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    return result;
  }

  /**
   * Sort documents
   */
  sortDocuments(
    documents: DocumentMetadata[],
    sort: DocumentSort
  ): DocumentMetadata[] {
    return [...documents].sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'displayName':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'uploadedAt':
          comparison = a.uploadedAt.getTime() - b.uploadedAt.getTime();
          break;
        case 'sizeBytes':
          comparison = a.sizeBytes - b.sizeBytes;
          break;
        case 'indexedAt': {
          const aTime = a.indexedAt?.getTime() || 0;
          const bTime = b.indexedAt?.getTime() || 0;
          comparison = aTime - bTime;
          break;
        }
      }

      return sort.direction === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Get document statistics
   */
  getStats(): DocumentStats {
    const docs = Array.from(this.documents.values());
    const documentsByClient = new Map<string, number>();
    const documentsByType = new Map<string, number>();

    let totalSizeBytes = 0;
    let globalCount = 0;
    let clientCount = 0;
    let activeCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const doc of docs) {
      totalSizeBytes += doc.sizeBytes;

      if (doc.scope === 'global') {
        globalCount++;
      } else {
        clientCount++;
        if (doc.clientId) {
          const current = documentsByClient.get(doc.clientId) || 0;
          documentsByClient.set(doc.clientId, current + 1);
        }
      }

      switch (doc.status) {
        case 'active':
          activeCount++;
          break;
        case 'pending':
        case 'uploading':
        case 'processing':
          pendingCount++;
          break;
        case 'failed':
          failedCount++;
          break;
      }

      const typeCount = documentsByType.get(doc.mimeType) || 0;
      documentsByType.set(doc.mimeType, typeCount + 1);
    }

    return {
      totalDocuments: docs.length,
      globalDocuments: globalCount,
      clientDocuments: clientCount,
      totalSizeBytes,
      activeDocuments: activeCount,
      pendingDocuments: pendingCount,
      failedDocuments: failedCount,
      documentsByClient,
      documentsByType,
    };
  }

  /**
   * Get document collection summary
   */
  getCollection(): DocumentCollection {
    const globalDocuments = this.getGlobalDocuments();
    const clientDocuments = new Map<string, DocumentMetadata[]>();

    // Group by client
    for (const doc of this.documents.values()) {
      if (doc.scope === 'client' && doc.clientId) {
        const existing = clientDocuments.get(doc.clientId) || [];
        existing.push(doc);
        clientDocuments.set(doc.clientId, existing);
      }
    }

    const stats = this.getStats();

    return {
      agencyId: this.agencyId,
      globalDocuments,
      clientDocuments,
      totalDocuments: stats.totalDocuments,
      totalSizeBytes: stats.totalSizeBytes,
      lastUpdated: new Date(),
    };
  }

  /**
   * Move document to different scope
   */
  moveDocument(
    documentId: string,
    newScope: DocumentScope,
    newClientId?: string
  ): DocumentMetadata | undefined {
    const doc = this.documents.get(documentId);
    if (!doc) return undefined;

    if (newScope === 'client' && !newClientId) {
      throw new Error('Client ID required for client scope');
    }

    const updated: DocumentMetadata = {
      ...doc,
      scope: newScope,
      clientId: newScope === 'client' ? newClientId : undefined,
    };

    this.documents.set(documentId, updated);
    return updated;
  }

  /**
   * Add tags to a document
   */
  addTags(documentId: string, tags: string[]): DocumentMetadata | undefined {
    const doc = this.documents.get(documentId);
    if (!doc) return undefined;

    const uniqueTags = [...new Set([...doc.tags, ...tags])];
    const updated = { ...doc, tags: uniqueTags };
    this.documents.set(documentId, updated);
    return updated;
  }

  /**
   * Remove tags from a document
   */
  removeTags(documentId: string, tags: string[]): DocumentMetadata | undefined {
    const doc = this.documents.get(documentId);
    if (!doc) return undefined;

    const remainingTags = doc.tags.filter((t) => !tags.includes(t));
    const updated = { ...doc, tags: remainingTags };
    this.documents.set(documentId, updated);
    return updated;
  }

  /**
   * Get all unique tags in the collection
   */
  getAllTags(): string[] {
    const tags = new Set<string>();
    for (const doc of this.documents.values()) {
      doc.tags.forEach((t) => tags.add(t));
    }
    return Array.from(tags).sort();
  }

  /**
   * Get all client IDs with documents
   */
  getClientsWithDocuments(): string[] {
    const clients = new Set<string>();
    for (const doc of this.documents.values()) {
      if (doc.clientId) {
        clients.add(doc.clientId);
      }
    }
    return Array.from(clients).sort();
  }

  /**
   * Load documents from external storage
   */
  loadDocuments(documents: DocumentMetadata[]): void {
    for (const doc of documents) {
      if (doc.agencyId === this.agencyId) {
        this.documents.set(doc.id, doc);
      }
    }
  }

  /**
   * Export all documents for persistence
   */
  exportDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values());
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents.clear();
  }
}

// Agency manager instances
const managerInstances = new Map<string, DocumentManager>();

/**
 * Get or create DocumentManager for an agency
 */
export function getDocumentManager(agencyId: string): DocumentManager {
  let instance = managerInstances.get(agencyId);
  if (!instance) {
    instance = new DocumentManager(agencyId);
    managerInstances.set(agencyId, instance);
  }
  return instance;
}

/**
 * Reset document manager (for testing)
 */
export function resetDocumentManager(agencyId?: string): void {
  if (agencyId) {
    managerInstances.delete(agencyId);
  } else {
    managerInstances.clear();
  }
}
