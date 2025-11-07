'use client';

import { useState, useEffect } from 'react';
import { Cartridge, VoiceParams } from '@/lib/cartridge-utils';
import { CartridgeList } from '@/components/cartridges/cartridge-list';
import { CartridgeEditForm } from '@/components/cartridges/cartridge-edit-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function CartridgesPage() {
  const [cartridges, setCartridges] = useState<Cartridge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCartridge, setEditingCartridge] = useState<Cartridge | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load cartridges on mount
  useEffect(() => {
    loadCartridges();
  }, []);

  const loadCartridges = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/cartridges');
      if (!response.ok) {
        throw new Error('Failed to load cartridges');
      }
      const data = await response.json();
      setCartridges(data.cartridges || []);
    } catch (error) {
      console.error('Error loading cartridges:', error);
      toast.error('Failed to load cartridges');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCartridge = async (data: {
    name: string;
    description?: string;
    voice_params: VoiceParams;
  }) => {
    try {
      setIsSaving(true);

      if (editingCartridge) {
        // Update existing
        const response = await fetch(`/api/cartridges/${editingCartridge.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to update cartridge');
        }

        const result = await response.json();
        setCartridges((prev) =>
          prev.map((c) => (c.id === editingCartridge.id ? result.cartridge : c))
        );
        toast.success('Cartridge updated successfully');
      } else {
        // Create new
        const response = await fetch('/api/cartridges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            tier: 'user',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create cartridge');
        }

        const result = await response.json();
        setCartridges((prev) => [result.cartridge, ...prev]);
        toast.success('Cartridge created successfully');
      }

      setShowEditModal(false);
      setShowCreateModal(false);
      setEditingCartridge(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast.error(message);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCartridge = async (cartridgeId: string) => {
    if (!confirm('Are you sure you want to delete this cartridge?')) {
      return;
    }

    try {
      const response = await fetch(`/api/cartridges/${cartridgeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete cartridge');
      }

      setCartridges((prev) => prev.filter((c) => c.id !== cartridgeId));
      toast.success('Cartridge deleted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete';
      toast.error(message);
    }
  };

  const handleDuplicateCartridge = async (cartridge: Cartridge) => {
    try {
      setIsSaving(true);

      const response = await fetch('/api/cartridges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${cartridge.name} (Copy)`,
          description: cartridge.description,
          voice_params: cartridge.voice_params,
          parent_id: cartridge.parent_id,
          tier: cartridge.tier,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate cartridge');
      }

      const result = await response.json();
      setCartridges((prev) => [result.cartridge, ...prev]);
      toast.success('Cartridge duplicated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to duplicate';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoGenerate = (cartridge: Cartridge) => {
    // This would navigate to the voice generation page or open a modal
    // For now, show a toast
    toast.info('Auto-generate feature coming soon. Use the Voice page to generate from LinkedIn posts.');
  };

  const handleEditCartridge = (cartridge: Cartridge) => {
    setEditingCartridge(cartridge);
    setShowEditModal(true);
  };

  const handleCreateNew = () => {
    setEditingCartridge(null);
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voice Cartridges</h1>
          <p className="text-gray-600 mt-1">
            Manage and customize voice profiles with hierarchical inheritance
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          New Cartridge
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">All Cartridges</TabsTrigger>
          <TabsTrigger value="guide">Quick Guide</TabsTrigger>
        </TabsList>

        {/* Cartridge List Tab */}
        <TabsContent value="list">
          <CartridgeList
            cartridges={cartridges}
            isLoading={isLoading}
            onEdit={handleEditCartridge}
            onDelete={handleDeleteCartridge}
            onDuplicate={handleDuplicateCartridge}
            onAutoGenerate={handleAutoGenerate}
          />
        </TabsContent>

        {/* Quick Guide Tab */}
        <TabsContent value="guide" className="space-y-4">
          <div className="grid gap-4">
            <div className="rounded-lg border p-6 bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">What is a Voice Cartridge?</h3>
              <p className="text-sm text-blue-800">
                A voice cartridge defines the personality, tone, and style of your AI-generated messages.
                It includes parameters like formality level, enthusiasm, vocabulary preferences, and content style.
              </p>
            </div>

            <div className="rounded-lg border p-6 bg-purple-50 border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">Hierarchical Inheritance</h3>
              <p className="text-sm text-purple-800 mb-3">
                Cartridges follow a 4-tier hierarchy:
              </p>
              <ul className="text-sm text-purple-800 space-y-1">
                <li><strong>System</strong> - Default voice for entire platform</li>
                <li><strong>Agency</strong> - Custom voice for each agency</li>
                <li><strong>Client</strong> - Custom voice for each client within agency</li>
                <li><strong>User</strong> - Personal voice overrides</li>
              </ul>
              <p className="text-xs text-purple-700 mt-3">
                Child cartridges inherit from parents and can override specific settings.
              </p>
            </div>

            <div className="rounded-lg border p-6 bg-green-50 border-green-200">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Start
              </h3>
              <ol className="text-sm text-green-800 space-y-2 ml-4 list-decimal">
                <li>Click &quot;New Cartridge&quot; to create a voice profile</li>
                <li>Set the basic tone: formality, enthusiasm, empathy (0-10)</li>
                <li>Customize writing style: sentence length, emojis, hashtags</li>
                <li>Define personality traits and vocabulary preferences</li>
                <li>Review the live preview as you configure</li>
                <li>Save and use in campaigns</li>
              </ol>
            </div>

            <div className="rounded-lg border p-6 bg-amber-50 border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-2">Progressive Disclosure</h3>
              <p className="text-sm text-amber-800">
                Complex options are hidden by default. Click section headers to expand and customize:
              </p>
              <ul className="text-sm text-amber-800 mt-2 space-y-1">
                <li>• <strong>Tone & Attitude</strong> - Core personality traits</li>
                <li>• <strong>Writing Style</strong> - Format and presentation</li>
                <li>• <strong>Personality</strong> - Voice description and traits</li>
                <li>• <strong>Vocabulary</strong> - Language preferences and restrictions</li>
                <li>• <strong>Content Preferences</strong> - Topics and CTA style</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowCreateModal(false);
          setShowEditModal(false);
          setEditingCartridge(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCartridge ? 'Edit Voice Cartridge' : 'Create New Voice Cartridge'}
            </DialogTitle>
            <DialogDescription>
              {editingCartridge
                ? 'Customize the voice parameters for this cartridge'
                : 'Set up a new voice profile for your campaigns'}
            </DialogDescription>
          </DialogHeader>
          <CartridgeEditForm
            cartridge={editingCartridge || undefined}
            onSave={handleSaveCartridge}
            onCancel={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setEditingCartridge(null);
            }}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
