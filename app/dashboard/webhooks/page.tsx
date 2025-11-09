'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement webhook API call
      setWebhooks([]);
    } catch (error) {
      console.error('Error loading webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWebhook = () => {
    setShowNewForm(true);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Webhook URL copied to clipboard');
  };

  const handleDeleteWebhook = (id: string) => {
    if (confirm('Are you sure you want to delete this webhook?')) {
      // TODO: Implement delete
      toast.success('Webhook deleted');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-gray-600 mt-1">
            Configure webhooks to receive real-time notifications about events
          </p>
        </div>
        <Button onClick={handleCreateWebhook} className="gap-2">
          <Plus className="h-4 w-4" />
          New Webhook
        </Button>
      </div>

      {/* Webhooks List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading webhooks...</p>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="border rounded-lg p-12 text-center bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No webhooks configured</h3>
          <p className="text-gray-600 mb-6">
            Create your first webhook to start receiving real-time notifications
          </p>
          <Button onClick={handleCreateWebhook} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Webhook
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-white">
            {webhooks.map((webhook: any) => (
              <div
                key={webhook.id}
                className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{webhook.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 font-mono break-all">{webhook.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyUrl(webhook.url)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteWebhook(webhook.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Webhook Events</h3>
        <p className="text-sm text-blue-800 mb-3">
          Webhooks are triggered for the following events:
        </p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Lead received</li>
          <li>• Campaign started</li>
          <li>• Campaign completed</li>
          <li>• Email extracted</li>
        </ul>
      </div>
    </div>
  );
}
