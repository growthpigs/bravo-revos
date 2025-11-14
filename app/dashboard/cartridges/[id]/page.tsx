'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface VoiceCartridge {
  id: string;
  name: string;
  display_name: string;
  system_instructions: string;
  tier: 'user' | 'campaign' | 'request' | 'default';
  is_active: boolean;
  user_id?: string;
  created_at: string;
  updated_at?: string;
}

export default function CartridgeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [cartridge, setCartridge] = useState<VoiceCartridge | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    system_instructions: '',
    is_active: true,
  });

  const isNew = params.id === 'new';

  useEffect(() => {
    if (!isNew) {
      fetchCartridge();
    } else {
      // Initialize form for new cartridge
      setFormData({
        name: '',
        display_name: '',
        system_instructions: '',
        is_active: true,
      });
      setLoading(false);
    }
  }, [params.id]);

  const fetchCartridge = async () => {
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/auth/login');
        return;
      }

      // Fetch cartridge
      const { data, error } = await supabase
        .from('voice_cartridges')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        console.error('Error fetching cartridge:', error);
        toast.error('Cartridge not found');
        router.push('/dashboard/cartridges');
        return;
      }

      setCartridge(data);
      setFormData({
        name: data.name || '',
        display_name: data.display_name || '',
        system_instructions: data.system_instructions || '',
        is_active: data.is_active || false,
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast.error('Authentication required');
        router.push('/auth/login');
        return;
      }

      if (isNew) {
        // Create new cartridge
        const { data, error } = await supabase
          .from('voice_cartridges')
          .insert({
            ...formData,
            tier: 'user',
            user_id: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating cartridge:', error);
          toast.error('Failed to create cartridge');
          return;
        }

        toast.success('Cartridge created successfully');
        router.push(`/dashboard/cartridges/${data.id}`);
      } else {
        // Update existing cartridge
        const { error } = await supabase
          .from('voice_cartridges')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating cartridge:', error);
          toast.error('Failed to update cartridge');
          return;
        }

        toast.success('Cartridge updated successfully');
        await fetchCartridge(); // Refresh data
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNew) return;

    setDeleting(true);
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast.error('Authentication required');
        router.push('/auth/login');
        return;
      }

      const { error } = await supabase
        .from('voice_cartridges')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting cartridge:', error);
        toast.error('Failed to delete cartridge');
        return;
      }

      toast.success('Cartridge deleted successfully');
      router.push('/dashboard/cartridges');
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/cartridges')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cartridges
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? 'Create Voice Cartridge' : 'Edit Voice Cartridge'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isNew
                ? 'Configure a new voice personality for your campaigns'
                : 'Update the voice settings and behavior'}
            </p>
          </div>
          {!isNew && (
            <Badge variant="default">
              User Tier
            </Badge>
          )}
        </div>
      </div>

      {/* Main Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Cartridge Configuration</CardTitle>
          <CardDescription>
            Define how the AI should communicate in your campaigns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Technical Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., professional-sales-voice"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Used internally for identification (lowercase, no spaces)
            </p>
          </div>

          {/* Display Name Field */}
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="e.g., Professional Sales Voice"
            />
            <p className="text-xs text-muted-foreground">
              Human-readable name shown in the UI
            </p>
          </div>

          {/* System Instructions */}
          <div className="space-y-2">
            <Label htmlFor="system_instructions">System Instructions</Label>
            <Textarea
              id="system_instructions"
              value={formData.system_instructions}
              onChange={(e) => setFormData({ ...formData, system_instructions: e.target.value })}
              placeholder="Define the personality, tone, and behavior of this voice cartridge..."
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              These instructions override the default AI behavior when this cartridge is active
            </p>
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Active Status</Label>
              <p className="text-xs text-muted-foreground">
                Enable this cartridge for use in campaigns
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <div>
              {!isNew && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Cartridge
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Voice Cartridge?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the voice cartridge
                        and remove it from all campaigns that use it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/cartridges')}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : (isNew ? 'Create Cartridge' : 'Save Changes')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6 border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <AlertCircle className="h-5 w-5" />
            Voice Cartridge Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-3">
          <p>
            <strong>System Instructions:</strong> Be specific about tone, style, and behavior. For example:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>"You are a friendly, professional sales representative..."</li>
            <li>"Keep responses concise and action-oriented..."</li>
            <li>"Use casual language but maintain professionalism..."</li>
          </ul>
          <p>
            <strong>Active Status:</strong> Only active cartridges can be selected for campaigns.
            Inactive cartridges are preserved but won't appear in selection lists.
          </p>
          {!isNew && cartridge && (
            <p className="text-xs">
              Created: {new Date(cartridge.created_at).toLocaleString()}
              {cartridge.updated_at && (
                <> | Updated: {new Date(cartridge.updated_at).toLocaleString()}</>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}