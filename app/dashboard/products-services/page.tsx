'use client';

/**
 * Products & Services Management UI
 * Define what you're selling to train AI conversations
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { offeringsChip } from '@/lib/chips/offerings';
import { conversationIntelligenceChip } from '@/lib/chips/conversation-intelligence';
import type { Offering } from '@/lib/types/offerings';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

export default function OfferingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    elevator_pitch: '',
    key_benefits: '',
    objection_handlers: '',
    qualification_questions: '',
    proof_points: '',
  });

  // Preview state
  const [previewMessage, setPreviewMessage] = useState('ugh another sales tool... what makes you different?');
  const [previewResponse, setPreviewResponse] = useState('');

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [offeringToDelete, setOfferingToDelete] = useState<Offering | null>(null);

  // Fetch user and load offerings
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          console.error('Auth error:', error);
          router.push('/auth/login');
          return;
        }

        setUser(user);

        // Load offerings for this user
        const result = await offeringsChip.execute({
          action: 'list',
          userId: user.id,
        });

        if (result.success && result.offerings) {
          setOfferings(result.offerings);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const loadOfferings = async () => {
    if (!user?.id) return;

    const result = await offeringsChip.execute({
      action: 'list',
      userId: user.id,
    });

    if (result.success && result.offerings) {
      setOfferings(result.offerings);
    }
  };

  const handleCreate = async () => {
    if (!user?.id) return;

    const result = await offeringsChip.execute({
      action: 'create',
      userId: user.id,
      data: {
        name: formData.name,
        elevator_pitch: formData.elevator_pitch,
        key_benefits: formData.key_benefits.split('\n').filter(b => b.trim()),
        objection_handlers: parseKeyValue(formData.objection_handlers),
        qualification_questions: formData.qualification_questions.split('\n').filter(q => q.trim()),
        proof_points: parseProofPoints(formData.proof_points),
      },
    });

    if (result.success) {
      await loadOfferings();
      resetForm();
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedOffering || !user?.id) return;

    const result = await offeringsChip.execute({
      action: 'update',
      userId: user.id,
      offeringId: selectedOffering.id,
      data: {
        name: formData.name,
        elevator_pitch: formData.elevator_pitch,
        key_benefits: formData.key_benefits.split('\n').filter(b => b.trim()),
        objection_handlers: parseKeyValue(formData.objection_handlers),
        qualification_questions: formData.qualification_questions.split('\n').filter(q => q.trim()),
        proof_points: parseProofPoints(formData.proof_points),
      },
    });

    if (result.success) {
      await loadOfferings();
      setSelectedOffering(null);
      resetForm();
    }
  };

  const handleDeleteClick = (offering: Offering) => {
    setOfferingToDelete(offering);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!offeringToDelete || !user?.id) return;

    const result = await offeringsChip.execute({
      action: 'delete',
      userId: user.id,
      offeringId: offeringToDelete.id,
    });

    if (result.success) {
      await loadOfferings();
      if (selectedOffering?.id === offeringToDelete.id) {
        setSelectedOffering(null);
        resetForm();
      }
      setDeleteDialogOpen(false);
      setOfferingToDelete(null);
    }
  };

  const handleEdit = (offering: Offering) => {
    setSelectedOffering(offering);
    setIsCreating(true);
    setFormData({
      name: offering.name,
      elevator_pitch: offering.elevator_pitch,
      key_benefits: offering.key_benefits.join('\n'),
      objection_handlers: Object.entries(offering.objection_handlers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n'),
      qualification_questions: offering.qualification_questions.join('\n'),
      proof_points: offering.proof_points
        .map(p => `${p.metric}: ${p.value}`)
        .join('\n'),
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      elevator_pitch: '',
      key_benefits: '',
      objection_handlers: '',
      qualification_questions: '',
      proof_points: '',
    });
    setSelectedOffering(null);
    setIsCreating(false);
  };

  const handlePreview = async () => {
    if (!selectedOffering && offerings.length === 0) {
      setPreviewResponse('Please create an offering first to see a preview.');
      return;
    }

    const offering = selectedOffering || offerings[0];
    const toneProfile = await conversationIntelligenceChip.analyzeTone(previewMessage);

    const response = await conversationIntelligenceChip.generateDynamicResponse({
      userMessage: previewMessage,
      toneProfile,
      conversationHistory: [],
      offering,
    });

    setPreviewResponse(response);
  };

  const parseKeyValue = (text: string): Record<string, string> => {
    const result: Record<string, string> = {};
    text.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        result[key.trim()] = valueParts.join(':').trim();
      }
    });
    return result;
  };

  const parseProofPoints = (text: string): { metric: string; value: string }[] => {
    return text.split('\n')
      .map(line => {
        const [metric, ...valueParts] = line.split(':');
        if (metric && valueParts.length > 0) {
          return { metric: metric.trim(), value: valueParts.join(':').trim() };
        }
        return null;
      })
      .filter((p): p is { metric: string; value: string } => p !== null);
  };

  // Show loading state while authenticating
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Products & Services</h1>
          <p className="text-muted-foreground mt-2">Define what you&apos;re selling to train AI conversations</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>Create New Offering</Button>
        )}
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">My Offerings</TabsTrigger>
          <TabsTrigger value="preview">AI Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedOffering ? 'Edit Offering' : 'Create New Offering'}</CardTitle>
                <CardDescription>
                  Define your product/service details for AI-powered conversations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enterprise CRM Solution"
                  />
                </div>

                <div>
                  <Label htmlFor="pitch">Elevator Pitch *</Label>
                  <Textarea
                    id="pitch"
                    value={formData.elevator_pitch}
                    onChange={e => setFormData({ ...formData, elevator_pitch: e.target.value })}
                    placeholder="Reduce sales cycle by 40% with AI-powered CRM"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="benefits">Key Benefits (one per line)</Label>
                  <Textarea
                    id="benefits"
                    value={formData.key_benefits}
                    onChange={e => setFormData({ ...formData, key_benefits: e.target.value })}
                    placeholder="40% reduction in sales cycle&#10;2x improvement in lead quality&#10;Automated follow-ups"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="objections">Objection Handlers (format: concern: response)</Label>
                  <Textarea
                    id="objections"
                    value={formData.objection_handlers}
                    onChange={e => setFormData({ ...formData, objection_handlers: e.target.value })}
                    placeholder="price: ROI typically 5x within 6 months&#10;timing: We offer phased implementation"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="questions">Qualification Questions (one per line)</Label>
                  <Textarea
                    id="questions"
                    value={formData.qualification_questions}
                    onChange={e => setFormData({ ...formData, qualification_questions: e.target.value })}
                    placeholder="What is your current sales team size?&#10;Which CRM are you using today?"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="proof">Proof Points (format: metric: value)</Label>
                  <Textarea
                    id="proof"
                    value={formData.proof_points}
                    onChange={e => setFormData({ ...formData, proof_points: e.target.value })}
                    placeholder="Customer Count: 500+ enterprises&#10;Average ROI: 5.2x"
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  {selectedOffering ? (
                    <Button onClick={handleUpdate}>Update Offering</Button>
                  ) : (
                    <Button onClick={handleCreate}>Create Offering</Button>
                  )}
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {offerings.length === 0 && !isCreating ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No offerings yet</p>
                <Button onClick={() => setIsCreating(true)}>Create Your First Offering</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {offerings.map(offering => (
                <Card key={offering.id}>
                  <CardHeader>
                    <CardTitle>{offering.name}</CardTitle>
                    <CardDescription>{offering.elevator_pitch}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Key Benefits:</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {offering.key_benefits.map((benefit, i) => (
                          <li key={i}>{benefit}</li>
                        ))}
                      </ul>
                    </div>

                    {offering.proof_points.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Proof Points:</h4>
                        <div className="text-sm text-muted-foreground">
                          {offering.proof_points.map((point, i) => (
                            <div key={i}>
                              <strong>{point.metric}:</strong> {point.value}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(offering)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedOffering(offering)}
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClick(offering)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Response Preview</CardTitle>
              <CardDescription>
                See how the AI adapts responses based on user tone and your offering details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="offering-select">Select Offering</Label>
                <select
                  id="offering-select"
                  className="w-full p-2 border rounded-md"
                  value={selectedOffering?.id || ''}
                  onChange={e => {
                    const offering = offerings.find(o => o.id === e.target.value);
                    setSelectedOffering(offering || null);
                  }}
                >
                  <option value="">Select an offering...</option>
                  {offerings.map(offering => (
                    <option key={offering.id} value={offering.id}>
                      {offering.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="preview-message">User Message</Label>
                <Textarea
                  id="preview-message"
                  value={previewMessage}
                  onChange={e => setPreviewMessage(e.target.value)}
                  placeholder="Try different tones: skeptical, professional, casual..."
                  rows={3}
                />
              </div>

              <Button onClick={handlePreview}>Generate Response</Button>

              {previewResponse && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">AI Response:</h4>
                  <p className="text-sm">{previewResponse}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Offering?"
        description={`This will permanently delete "${offeringToDelete?.name}" and cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
