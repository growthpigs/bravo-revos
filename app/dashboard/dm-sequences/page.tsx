'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Eye, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function DMSequencesPage() {
  const [sequences, setSequences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSequences();
  }, []);

  const loadSequences = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement DM sequences API call
      setSequences([]);
    } catch (error) {
      console.error('Error loading DM sequences:', error);
      toast.error('Failed to load DM sequences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSequence = () => {
    toast.info('Create DM sequence feature coming soon');
  };

  const handleEditSequence = (id: string) => {
    toast.info('Edit feature coming soon');
  };

  const handleDeleteSequence = (id: string) => {
    if (confirm('Are you sure you want to delete this DM sequence?')) {
      toast.success('DM sequence deleted');
    }
  };

  const handleViewDetails = (id: string) => {
    toast.info('Details view coming soon');
  };

  const handleActivateSequence = (id: string) => {
    toast.success('DM sequence activated');
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
                  <h3 className="font-semibold text-lg text-gray-900">{sequence.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{sequence.description}</p>
                  <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                    <span className={sequence.status === 'active' ? 'text-green-600' : ''}>
                      Status: {sequence.status}
                    </span>
                    <span>Messages: {sequence.message_count || 0}</span>
                    <span>Sent: {sequence.sent_count || 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(sequence.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleActivateSequence(sequence.id)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSequence(sequence.id)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSequence(sequence.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
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
    </div>
  );
}
