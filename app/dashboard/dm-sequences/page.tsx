'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Eye, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { DMSequence } from '@/types/dm-sequences';
import { CreateDMSequenceModal } from '@/components/dashboard/create-dm-sequence-modal';

export default function DMSequencesPage() {
  const [sequences, setSequences] = useState<DMSequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadSequences();
  }, []);

  const loadSequences = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dm-sequences');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load DM sequences');
      }

      setSequences(result.data || []);
    } catch (error) {
      console.error('Error loading DM sequences:', error);
      toast.error('Failed to load DM sequences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSequence = () => {
    setShowCreateModal(true);
  };

  const handleSequenceCreated = () => {
    loadSequences();
  };

  const handleEditSequence = (id: string) => {
    toast.info('Edit feature coming soon');
  };

  const handleDeleteSequence = async (id: string) => {
    if (!confirm('Are you sure you want to delete this DM sequence? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(id);
      const response = await fetch(`/api/dm-sequences/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete DM sequence');
      }

      toast.success('DM sequence deleted successfully');

      // Remove from local state
      setSequences(sequences.filter(seq => seq.id !== id));
    } catch (error) {
      console.error('Error deleting DM sequence:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete DM sequence');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleViewDetails = (id: string) => {
    toast.info('Details view coming soon');
  };

  const handleToggleStatus = async (sequence: DMSequence) => {
    const newStatus = sequence.status === 'active' ? 'paused' : 'active';

    try {
      const response = await fetch(`/api/dm-sequences/${sequence.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update sequence status');
      }

      toast.success(`Sequence ${newStatus === 'active' ? 'activated' : 'paused'}`);

      // Update local state
      setSequences(sequences.map(seq =>
        seq.id === sequence.id ? { ...seq, status: newStatus } : seq
      ));
    } catch (error) {
      console.error('Error updating sequence status:', error);
      toast.error('Failed to update sequence status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DM Sequences</h1>
          <p className="text-gray-600 mt-1">
            Automate your LinkedIn DM outreach with intelligent sequences
          </p>
        </div>
        <Button onClick={handleCreateSequence} className="gap-2">
          <Plus className="h-4 w-4" />
          New Sequence
        </Button>
      </div>

      {/* Sequences List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading DM sequences...</p>
        </div>
      ) : sequences.length === 0 ? (
        <div className="border rounded-lg p-12 text-center bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No DM sequences yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first DM sequence to start automating your outreach
          </p>
          <Button onClick={handleCreateSequence} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Sequence
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map((sequence: any) => (
            <div
              key={sequence.id}
              className="border rounded-lg p-6 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-gray-900">{sequence.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      sequence.status === 'active' ? 'bg-green-100 text-green-800' :
                      sequence.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sequence.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{sequence.description || 'No description'}</p>
                  <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                    <span>Sent: {sequence.sent_count}</span>
                    <span>Replies: {sequence.replied_count}</span>
                    <span>Emails: {sequence.email_captured_count}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(sequence.id)}
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(sequence)}
                    title={sequence.status === 'active' ? 'Pause sequence' : 'Activate sequence'}
                  >
                    {sequence.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSequence(sequence.id)}
                    title="Edit sequence"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSequence(sequence.id)}
                    disabled={isDeleting === sequence.id}
                    title="Delete sequence"
                  >
                    <Trash2 className={`h-4 w-4 ${isDeleting === sequence.id ? 'opacity-50' : 'text-red-600'}`} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Sections */}
      <div className="grid gap-4">
        <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">What are DM Sequences?</h3>
          <p className="text-sm text-blue-800">
            DM sequences are automated series of messages sent to LinkedIn connections over time.
            They help you nurture relationships and guide prospects through your sales process.
          </p>
        </div>

        <div className="border rounded-lg p-6 bg-amber-50 border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-2">Best Practices</h3>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Start with value-first messages, not pitches</li>
            <li>• Space messages 2-5 days apart</li>
            <li>• Personalize messages using voice cartridges</li>
            <li>• Monitor engagement and adjust timing</li>
          </ul>
        </div>
      </div>

      {/* Create Sequence Modal */}
      <CreateDMSequenceModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleSequenceCreated}
      />
    </div>
  );
}
