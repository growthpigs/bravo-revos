'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function LeadMagnetsPage() {
  const [leadMagnets, setLeadMagnets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeadMagnets();
  }, []);

  const loadLeadMagnets = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement lead magnets API call
      setLeadMagnets([]);
    } catch (error) {
      console.error('Error loading lead magnets:', error);
      toast.error('Failed to load lead magnets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLeadMagnet = () => {
    toast.info('Create lead magnet feature coming soon');
  };

  const handleEditLeadMagnet = (id: string) => {
    toast.info('Edit feature coming soon');
  };

  const handleDeleteLeadMagnet = (id: string) => {
    if (confirm('Are you sure you want to delete this lead magnet?')) {
      toast.success('Lead magnet deleted');
    }
  };

  const handleViewDetails = (id: string) => {
    toast.info('Details view coming soon');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Magnets</h1>
          <p className="text-gray-600 mt-1">
            Create and manage lead magnet campaigns to capture leads
          </p>
        </div>
        <Button onClick={handleCreateLeadMagnet} className="gap-2">
          <Plus className="h-4 w-4" />
          New Lead Magnet
        </Button>
      </div>

      {/* Lead Magnets Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading lead magnets...</p>
        </div>
      ) : leadMagnets.length === 0 ? (
        <div className="border rounded-lg p-12 text-center bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lead magnets yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first lead magnet to start capturing leads
          </p>
          <Button onClick={handleCreateLeadMagnet} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Lead Magnet
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {leadMagnets.map((magnet: any) => (
            <div
              key={magnet.id}
              className="border rounded-lg p-6 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">{magnet.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{magnet.description}</p>
                  <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                    <span>Leads: {magnet.lead_count || 0}</span>
                    <span>Conversion: {magnet.conversion_rate || '0%'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(magnet.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditLeadMagnet(magnet.id)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteLeadMagnet(magnet.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="border rounded-lg p-6 bg-green-50 border-green-200">
        <h3 className="font-semibold text-green-900 mb-2">What are Lead Magnets?</h3>
        <p className="text-sm text-green-800">
          Lead magnets are valuable resources or incentives (like whitepapers, templates, webinars, or free tools)
          that you offer in exchange for contact information. They help you build your email list and nurture leads.
        </p>
      </div>
    </div>
  );
}
