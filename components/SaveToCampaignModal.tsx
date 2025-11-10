'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader, ChevronDown } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description?: string;
}

interface SaveToCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentContent: string;
  documentTitle: string;
  onSave?: (campaignId: string, documentId: string) => Promise<void>;
}

export function SaveToCampaignModal({
  isOpen,
  onClose,
  documentContent,
  documentTitle,
  onSave,
}: SaveToCampaignModalProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch campaigns on mount
  useEffect(() => {
    if (isOpen) {
      fetchCampaigns();
    }
  }, [isOpen]);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/campaigns?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const data = await response.json();
      setCampaigns(data.campaigns || []);

      if (data.campaigns && data.campaigns.length > 0) {
        setSelectedCampaignId(data.campaigns[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      console.error('[SAVE_TO_CAMPAIGN] Error fetching campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCampaignId) {
      setError('Please select a campaign');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      // First, create the document in the knowledge base
      const docResponse = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: documentTitle,
          content: documentContent,
          metadata: {
            source: 'chat_document_viewer',
          },
        }),
      });

      if (!docResponse.ok) {
        throw new Error('Failed to save document');
      }

      const docData = await docResponse.json();
      const documentId = docData.document.id;

      // Then link it to the selected campaign
      const linkResponse = await fetch(`/api/campaigns/${selectedCampaignId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId }),
      });

      if (!linkResponse.ok) {
        throw new Error('Failed to link document to campaign');
      }

      setSuccessMessage(`Document saved to campaign "${campaigns.find((c) => c.id === selectedCampaignId)?.name}" successfully!`);

      // Call optional callback
      if (onSave) {
        await onSave(selectedCampaignId, documentId);
      }

      // Close modal after success
      setTimeout(() => {
        onClose();
        setSuccessMessage('');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document');
      console.error('[SAVE_TO_CAMPAIGN] Error saving:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Filter campaigns based on search
  const filteredCampaigns = campaigns.filter(
    (campaign) =>
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-gray-100"
          aria-label="Close modal"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Header */}
        <h2 className="mb-2 text-xl font-bold text-gray-900">Save Document to Campaign</h2>
        <p className="mb-4 text-sm text-gray-600">
          Select a campaign to save this document to your knowledge base.
        </p>

        {/* Document preview */}
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-900">
            {documentTitle || 'Untitled Document'}
          </p>
          <p className="mt-2 line-clamp-2 text-xs text-gray-600">
            {documentContent.substring(0, 100)}
            {documentContent.length > 100 ? '...' : ''}
          </p>
        </div>

        {/* Campaign selector */}
        <div className="mb-6">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50 py-8">
              <Loader className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading campaigns...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-lg border border-gray-300 bg-gray-50 py-8 text-center">
              <p className="text-sm text-gray-500">No campaigns found</p>
              <p className="mt-1 text-xs text-gray-400">Create a campaign first</p>
            </div>
          ) : (
            <>
              {/* Search input */}
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />

              {/* Campaign dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    // This would open a proper select if needed
                    // For now, we'll use a simple display
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm focus:border-blue-500 focus:outline-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900">
                      {campaigns.find((c) => c.id === selectedCampaignId)?.name || 'Select campaign'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </button>

                {/* Campaign list */}
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-300 bg-white">
                  {filteredCampaigns.length === 0 ? (
                    <div className="px-3 py-2 text-center text-xs text-gray-500">
                      No campaigns match your search
                    </div>
                  ) : (
                    filteredCampaigns.map((campaign) => (
                      <button
                        key={campaign.id}
                        onClick={() => setSelectedCampaignId(campaign.id)}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                          selectedCampaignId === campaign.id
                            ? 'bg-blue-50 text-blue-900'
                            : 'text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">{campaign.name}</div>
                        {campaign.description && (
                          <div className="text-xs text-gray-500">{campaign.description}</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-50 p-3">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || campaigns.length === 0}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="flex items-center justify-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                Saving...
              </div>
            ) : (
              'Save to Campaign'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
