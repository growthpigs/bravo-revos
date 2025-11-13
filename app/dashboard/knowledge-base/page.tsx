'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Grid3x3, List, Plus, Loader, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DocumentCard } from '@/components/dashboard/DocumentCard';
import { DocumentTableView } from '@/components/dashboard/DocumentTableView';
import { DocumentDetailModal } from '@/components/dashboard/DocumentDetailModal';
import { CreateDocumentModal } from '@/components/dashboard/CreateDocumentModal';
import { useSearchParams } from 'next/navigation';

interface Document {
  id: string;
  title: string;
  description?: string;
  content: string;
  file_type: string;
  created_at: string;
  created_by?: string;
  metadata?: Record<string, any>;
}

interface Campaign {
  id: string;
  name: string;
}

export default function KnowledgeBasePage() {
  const searchParams = useSearchParams();
  const campaignIdFilter = searchParams.get('campaign_id');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState(campaignIdFilter || '');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'text' | 'semantic'>('text');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const limit = 20;

  // Fetch campaigns on mount
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns?limit=100');
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns || data.data || []);
        }
      } catch (error) {
        console.error('[KB] Error fetching campaigns:', error);
      }
    };

    fetchCampaigns();
  }, []);

  // Fetch documents
  const fetchDocuments = useCallback(
    async (search?: string, useSemanticSearch = false) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
          ...(search && { search }),
          ...(fileTypeFilter && { file_type: fileTypeFilter }),
          ...(campaignFilter && { campaign_id: campaignFilter }),
        });

        const endpoint = useSemanticSearch
          ? `/api/knowledge-base/search?${params}`
          : `/api/knowledge-base?${params}`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
          setTotal(data.count || 0);
        }
      } catch (error) {
        console.error('[KB] Error fetching documents:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [offset, fileTypeFilter, campaignFilter]
  );

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle search
  const handleSearch = useCallback(
    async (value: string) => {
      setSearchTerm(value);
      setOffset(0);
      setIsSearching(true);
      try {
        await fetchDocuments(value, searchType === 'semantic');
      } finally {
        setIsSearching(false);
      }
    },
    [fetchDocuments, searchType]
  );

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    setOffset(0);
    if (filterType === 'fileType') {
      setFileTypeFilter(value);
    } else if (filterType === 'campaign') {
      setCampaignFilter(value);
    }
  };

  const handleSort = (value: string) => {
    setSortBy(value as 'date' | 'title');
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      return a.title.localeCompare(b.title);
    }
  });

  const selectedCampaignName =
    campaigns.find((c) => c.id === campaignFilter)?.name || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {total} document{total !== 1 ? 's' : ''} in your knowledge base
                {selectedCampaignName && ` • Filtered by: ${selectedCampaignName}`}
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Document
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          {/* Search */}
          <div className="mb-4 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
              {isSearching && (
                <Loader className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
              )}
            </div>

            {/* Search Type Toggle */}
            <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                onClick={() => setSearchType('text')}
                className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                  searchType === 'text'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Basic keyword search"
              >
                Text
              </button>
              <button
                onClick={() => setSearchType('semantic')}
                className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                  searchType === 'semantic'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="AI-powered semantic search"
              >
                AI Search
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* File Type Filter */}
            <select
              value={fileTypeFilter}
              onChange={(e) => handleFilterChange('fileType', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="markdown">Markdown</option>
              <option value="pdf">PDF</option>
              <option value="url">URL</option>
              <option value="docx">Document</option>
            </select>

            {/* Campaign Filter */}
            <select
              value={campaignFilter}
              onChange={(e) => handleFilterChange('campaign', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Newest First</option>
              <option value="title">A-Z Title</option>
            </select>

            {/* View Toggle */}
            <div className="ml-auto flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : sortedDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No documents found
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Create a new document to get started'}
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Document
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={(doc) => setSelectedDocument(doc)}
              />
            ))}
          </div>
        ) : (
          <DocumentTableView
            documents={sortedDocuments}
            onView={(doc) => setSelectedDocument(doc)}
          />
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedDocument && (
        <DocumentDetailModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onDocumentUpdated={() => {
            fetchDocuments();
            setSelectedDocument(null);
          }}
        />
      )}

      {showCreateModal && (
        <CreateDocumentModal
          onClose={() => setShowCreateModal(false)}
          onDocumentCreated={() => {
            fetchDocuments();
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
