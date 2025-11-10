'use client';

import React, { useState } from 'react';
import { X, Edit2, Save, Copy, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

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

interface DocumentDetailModalProps {
  document: Document;
  onClose: () => void;
  onDocumentUpdated?: () => void;
}

export function DocumentDetailModal({
  document: initialDocument,
  onClose,
  onDocumentUpdated,
}: DocumentDetailModalProps) {
  const [document, setDocument] = useState(initialDocument);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [linkedCampaigns, setLinkedCampaigns] = useState<string[]>([]);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch campaigns on mount
  React.useEffect(() => {
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

    const fetchLinkedCampaigns = async () => {
      try {
        const res = await fetch(`/api/knowledge-base/${document.id}/campaigns`);
        if (res.ok) {
          const data = await res.json();
          setLinkedCampaigns(data.campaign_ids || []);
        }
      } catch (error) {
        console.error('[KB] Error fetching linked campaigns:', error);
      }
    };

    fetchCampaigns();
    fetchLinkedCampaigns();
  }, [document.id]);

  const handleSave = async () => {
    if (!document.title || !document.content) {
      setError('Title and content are required');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/knowledge-base/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: document.title,
          description: document.description,
          content: document.content,
          metadata: document.metadata || {},
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save document');
      }

      const updated = await res.json();
      setDocument(updated.document);
      setSuccessMessage('Document saved successfully!');
      setIsEditing(false);

      setTimeout(() => {
        setSuccessMessage('');
        if (onDocumentUpdated) {
          onDocumentUpdated();
        }
      }, 1500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save document';
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: document.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          setError('Document is already linked to this campaign');
        } else {
          throw new Error(data.error || 'Failed to link document');
        }
        return;
      }

      setLinkedCampaigns([...linkedCampaigns, campaignId]);
      setSuccessMessage('Document linked successfully!');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to link document';
      setError(errorMsg);
    }
  };

  const handleUnlinkCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/documents?document_id=${document.id}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        throw new Error('Failed to unlink document');
      }

      setLinkedCampaigns(linkedCampaigns.filter((id) => id !== campaignId));
      setSuccessMessage('Document unlinked successfully!');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to unlink document';
      setError(errorMsg);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(document.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(document.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const fileTypeLabel =
    document.file_type === 'markdown'
      ? 'Markdown'
      : document.file_type === 'pdf'
        ? 'PDF'
        : document.file_type === 'url'
          ? 'URL'
          : 'Document';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={document.title}
                onChange={(e) =>
                  setDocument({ ...document, title: e.target.value })
                }
                className="text-xl font-bold"
                placeholder="Document title"
              />
            ) : (
              <DialogTitle className="text-2xl">{document.title}</DialogTitle>
            )}
            <p className="text-sm text-gray-600 mt-2">
              {fileTypeLabel} • Created {formattedDate}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        {/* Error and Success Messages */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg bg-green-50 p-3 mb-4">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Description */}
          {isEditing ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <Input
                value={document.description || ''}
                onChange={(e) =>
                  setDocument({ ...document, description: e.target.value })
                }
                placeholder="Brief description of the document"
              />
            </div>
          ) : document.description ? (
            <div>
              <p className="text-sm text-gray-600">{document.description}</p>
            </div>
          ) : null}

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            {isEditing ? (
              <Textarea
                value={document.content}
                onChange={(e) =>
                  setDocument({ ...document, content: e.target.value })
                }
                className="font-mono text-sm min-h-64"
                placeholder="Document content"
              />
            ) : (
              <div className="relative">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 max-h-64 overflow-y-auto">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
                    {document.content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="absolute top-2 right-2 bg-white hover:bg-gray-100"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Linked Campaigns Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Linked Campaigns</h3>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCampaignSelector(!showCampaignSelector)}
                  className="gap-2"
                >
                  <span className="text-sm">Link Campaign</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showCampaignSelector ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              )}
            </div>

            {linkedCampaigns.length > 0 ? (
              <div className="space-y-2">
                {linkedCampaigns.map((campaignId) => {
                  const campaign = campaigns.find((c) => c.id === campaignId);
                  return (
                    <div
                      key={campaignId}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <span className="text-sm text-gray-900">
                        {campaign?.name || campaignId}
                      </span>
                      {!isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlinkCampaign(campaignId)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Unlink
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No campaigns linked. Link one to organize this document.
              </p>
            )}

            {/* Campaign Selector Dropdown */}
            {showCampaignSelector && (
              <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                {campaigns
                  .filter((c) => !linkedCampaigns.includes(c.id))
                  .map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => {
                        handleLinkCampaign(campaign.id);
                        setShowCampaignSelector(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded text-sm text-gray-900 hover:bg-white transition-colors"
                    >
                      {campaign.name}
                    </button>
                  ))}
                {campaigns.length === linkedCampaigns.length && (
                  <p className="px-3 py-2 text-sm text-gray-500">
                    All campaigns linked
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 border-t pt-4">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setDocument(initialDocument);
                  setIsEditing(false);
                  setError('');
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                onClick={() => setIsEditing(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700 ml-auto"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
