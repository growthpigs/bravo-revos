'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Mic, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface VoiceCartridge {
  id: string;
  name: string;
  display_name: string;
  system_instructions: string;
  tier: 'user' | 'campaign' | 'request' | 'default';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export default function CartridgesPage() {
  const [cartridges, setCartridges] = useState<VoiceCartridge[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCartridges();
  }, []);

  const fetchCartridges = async () => {
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Auth error:', authError);
        router.push('/auth/login');
        return;
      }

      // Fetch user's voice cartridges
      const { data, error } = await supabase
        .from('voice_cartridges')
        .select('*')
        .eq('user_id', user.id)
        .eq('tier', 'user')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cartridges:', error);
        toast.error('Failed to load cartridges');
        return;
      }

      setCartridges(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'user': return 'default';
      case 'campaign': return 'secondary';
      case 'request': return 'outline';
      case 'default': return 'ghost';
      default: return 'default';
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
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Voice Cartridges</h1>
            <p className="text-muted-foreground mt-2">
              Customize AI voice and behavior for your campaigns
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/cartridges/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Cartridge
          </Button>
        </div>
      </div>

      {/* Cartridge Grid */}
      {cartridges.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mic className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Voice Cartridges</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create custom voice personalities for different campaigns and contexts.
              Each cartridge can have its own tone, style, and behavior.
            </p>
            <Button onClick={() => router.push('/dashboard/cartridges/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Cartridge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cartridges.map((cartridge) => (
            <Card
              key={cartridge.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/cartridges/${cartridge.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      {cartridge.display_name || cartridge.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {cartridge.name}
                    </CardDescription>
                  </div>
                  <Badge variant={getTierBadgeVariant(cartridge.tier)}>
                    {cartridge.tier}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {cartridge.is_active ? (
                      <Badge variant="success" className="bg-green-500/10 text-green-600">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  {/* Instructions Preview */}
                  <div className="text-sm text-muted-foreground">
                    <p className="line-clamp-2">
                      {cartridge.system_instructions || 'No instructions configured'}
                    </p>
                  </div>

                  {/* Dates */}
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(cartridge.created_at).toLocaleDateString()}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/cartridges/${cartridge.id}`);
                      }}
                    >
                      <Settings className="mr-2 h-3 w-3" />
                      Configure
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-8 border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <AlertCircle className="h-5 w-5" />
            About Voice Cartridges
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200">
          <p className="mb-3">
            Voice cartridges define how the AI communicates in your campaigns. They work in a hierarchy:
          </p>
          <ul className="space-y-2 ml-4">
            <li>• <strong>Request:</strong> Highest priority, set per API call</li>
            <li>• <strong>Campaign:</strong> Campaign-specific voice settings</li>
            <li>• <strong>User:</strong> Your personal default voice (shown here)</li>
            <li>• <strong>Default:</strong> System fallback voice</li>
          </ul>
          <p className="mt-3">
            The system uses the most specific cartridge available for each interaction.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}