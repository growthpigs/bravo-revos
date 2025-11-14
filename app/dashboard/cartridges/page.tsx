'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Settings, Mic, AlertCircle, FileText, Heart,
  BookOpen, Building, Upload, Trash2, Download, Loader2,
  Check, X, Eye, Edit
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Existing Voice interface
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

// New cartridge interfaces
interface StyleCartridge {
  id: string;
  user_id: string;
  source_files: any[];
  learned_style: any;
  mem0_namespace: string;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at?: string;
}

interface PreferencesCartridge {
  id: string;
  user_id: string;
  language: string;
  platform: string;
  tone: string;
  content_length: string;
  hashtag_count: number;
  emoji_usage: string;
  call_to_action: string;
  personalization_level: string;
  created_at: string;
  updated_at?: string;
}

interface InstructionsCartridge {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  training_docs: any[];
  extracted_knowledge?: any;
  mem0_namespace: string;
  process_status: 'pending' | 'processing' | 'completed' | 'failed';
  last_processed_at?: string;
  created_at: string;
  updated_at?: string;
}

interface BrandCartridge {
  id: string;
  user_id: string;
  name: string;
  company_name?: string;
  company_description?: string;
  company_tagline?: string;
  industry?: string;
  target_audience?: string;
  core_values: string[];
  brand_voice?: string;
  brand_personality: string[];
  logo_url?: string;
  brand_colors: any;
  social_links: any;
  created_at: string;
  updated_at?: string;
}

export default function CartridgesPage() {
  const [activeTab, setActiveTab] = useState('voice');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Voice state
  const [voiceCartridges, setVoiceCartridges] = useState<VoiceCartridge[]>([]);

  // Style state
  const [styleCartridge, setStyleCartridge] = useState<StyleCartridge | null>(null);
  const [styleFiles, setStyleFiles] = useState<File[]>([]);
  const [analyzingStyle, setAnalyzingStyle] = useState(false);

  // Preferences state
  const [preferencesCartridge, setPreferencesCartridge] = useState<PreferencesCartridge | null>(null);
  const [editingPreferences, setEditingPreferences] = useState(false);

  // Instructions state
  const [instructionCartridges, setInstructionCartridges] = useState<InstructionsCartridge[]>([]);
  const [newInstructionName, setNewInstructionName] = useState('');
  const [newInstructionDescription, setNewInstructionDescription] = useState('');

  // Brand state
  const [brandCartridge, setBrandCartridge] = useState<BrandCartridge | null>(null);
  const [editingBrand, setEditingBrand] = useState(false);
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchAllCartridges();
  }, []);

  const fetchAllCartridges = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('Auth error:', authError);
        router.push('/auth/login');
        return;
      }

      // Fetch all cartridge types in parallel
      await Promise.all([
        fetchVoiceCartridges(),
        fetchStyleCartridge(),
        fetchPreferencesCartridge(),
        fetchInstructionCartridges(),
        fetchBrandCartridge()
      ]);
    } catch (error) {
      console.error('Error fetching cartridges:', error);
      toast.error('Failed to load cartridges');
    } finally {
      setLoading(false);
    }
  };

  const fetchVoiceCartridges = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('voice_cartridges')
        .select('*')
        .eq('user_id', user.id)
        .eq('tier', 'user')
        .order('created_at', { ascending: false });

      if (!error) {
        setVoiceCartridges(data || []);
      }
    } catch (error) {
      console.error('Error fetching voice cartridges:', error);
    }
  };

  const fetchStyleCartridge = async () => {
    try {
      const response = await fetch('/api/cartridges/style');
      if (response.ok) {
        const data = await response.json();
        setStyleCartridge(data.cartridge);
      }
    } catch (error) {
      console.error('Error fetching style cartridge:', error);
    }
  };

  const fetchPreferencesCartridge = async () => {
    try {
      const response = await fetch('/api/cartridges/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferencesCartridge(data.preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const fetchInstructionCartridges = async () => {
    try {
      const response = await fetch('/api/cartridges/instructions');
      if (response.ok) {
        const data = await response.json();
        setInstructionCartridges(data.cartridges || []);
      }
    } catch (error) {
      console.error('Error fetching instruction cartridges:', error);
    }
  };

  const fetchBrandCartridge = async () => {
    try {
      const response = await fetch('/api/cartridges/brand');
      if (response.ok) {
        const data = await response.json();
        setBrandCartridge(data.brand);
      }
    } catch (error) {
      console.error('Error fetching brand cartridge:', error);
    }
  };

  // Style handlers
  const handleStyleUpload = async () => {
    if (styleFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    const formData = new FormData();
    styleFiles.forEach(file => formData.append('files', file));

    try {
      const response = await fetch('/api/cartridges/style/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast.success('Files uploaded successfully');
        setStyleFiles([]);
        await fetchStyleCartridge();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    }
  };

  const handleStyleAnalyze = async () => {
    if (!styleCartridge) return;

    setAnalyzingStyle(true);
    try {
      const response = await fetch('/api/cartridges/style/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartridgeId: styleCartridge.id })
      });

      if (response.ok) {
        toast.success('Style analysis started');
        await fetchStyleCartridge();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze style');
    } finally {
      setAnalyzingStyle(false);
    }
  };

  // Preferences handlers
  const handlePreferencesSave = async (data: Partial<PreferencesCartridge>) => {
    try {
      const response = await fetch('/api/cartridges/preferences', {
        method: preferencesCartridge ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast.success('Preferences saved');
        await fetchPreferencesCartridge();
        setEditingPreferences(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save preferences');
    }
  };

  // Instructions handlers
  const handleInstructionCreate = async () => {
    if (!newInstructionName) {
      toast.error('Please enter a name');
      return;
    }

    try {
      const response = await fetch('/api/cartridges/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newInstructionName,
          description: newInstructionDescription
        })
      });

      if (response.ok) {
        toast.success('Instruction cartridge created');
        setNewInstructionName('');
        setNewInstructionDescription('');
        await fetchInstructionCartridges();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Creation failed');
      }
    } catch (error) {
      console.error('Creation error:', error);
      toast.error('Failed to create instruction cartridge');
    }
  };

  // Brand handlers
  const handleBrandSave = async (data: Partial<BrandCartridge>) => {
    try {
      const response = await fetch('/api/cartridges/brand', {
        method: brandCartridge ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast.success('Brand information saved');
        await fetchBrandCartridge();
        setEditingBrand(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save brand information');
    }
  };

  const handleLogoUpload = async () => {
    if (!brandLogoFile) {
      toast.error('Please select a logo file');
      return;
    }

    const formData = new FormData();
    formData.append('file', brandLogoFile);

    try {
      const response = await fetch('/api/cartridges/brand/upload-logo', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast.success('Logo uploaded successfully');
        setBrandLogoFile(null);
        await fetchBrandCartridge();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload logo');
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
        <h1 className="text-3xl font-bold">Marketing Cartridges</h1>
        <p className="text-muted-foreground mt-2">
          Configure AI voice, style, preferences, instructions, and brand for your campaigns
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="style" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Style
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="instructions" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Instructions
          </TabsTrigger>
          <TabsTrigger value="brand" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Brand
          </TabsTrigger>
        </TabsList>

        {/* Voice Tab - Existing functionality */}
        <TabsContent value="voice" className="space-y-6">
          {voiceCartridges.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mic className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Voice Cartridges</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Create custom voice personalities for different campaigns and contexts.
                </p>
                <Button onClick={() => router.push('/dashboard/cartridges/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Voice Cartridge
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {voiceCartridges.map((cartridge) => (
                <Card key={cartridge.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      {cartridge.display_name || cartridge.name}
                    </CardTitle>
                    <CardDescription>{cartridge.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Badge variant={cartridge.is_active ? 'default' : 'secondary'}>
                        {cartridge.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {cartridge.system_instructions || 'No instructions configured'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/cartridges/${cartridge.id}`)}
                      >
                        <Settings className="mr-2 h-3 w-3" />
                        Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center py-12">
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard/cartridges/new')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Voice
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Style Tab */}
        <TabsContent value="style" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Writing Style Learning</CardTitle>
              <CardDescription>
                Upload documents to teach the AI your unique writing style
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Section */}
              <div className="space-y-4">
                <Label>Upload Style Documents</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.docx,.md"
                    onChange={(e) => setStyleFiles(Array.from(e.target.files || []))}
                    className="hidden"
                    id="style-upload"
                  />
                  <Label htmlFor="style-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drop files here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, TXT, DOCX, MD (max 10MB each)
                    </p>
                  </Label>
                </div>

                {styleFiles.length > 0 && (
                  <div className="space-y-2">
                    {styleFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStyleFiles(files => files.filter((_, i) => i !== idx))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button onClick={handleStyleUpload} className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Files
                    </Button>
                  </div>
                )}
              </div>

              {/* Existing Files */}
              {styleCartridge && styleCartridge.source_files.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Documents</Label>
                  {styleCartridge.source_files.map((file: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{file.file_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {(file.file_size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Analysis Section */}
              {styleCartridge && styleCartridge.source_files.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Style Analysis</Label>
                      <p className="text-sm text-muted-foreground">
                        Status: {styleCartridge.analysis_status}
                      </p>
                    </div>
                    <Button
                      onClick={handleStyleAnalyze}
                      disabled={analyzingStyle}
                    >
                      {analyzingStyle ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Analyze Style
                        </>
                      )}
                    </Button>
                  </div>

                  {styleCartridge.learned_style && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Learned Patterns</h4>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(styleCartridge.learned_style, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Preferences</CardTitle>
              <CardDescription>
                Configure default settings for AI-generated content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingPreferences || !preferencesCartridge ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select defaultValue={preferencesCartridge?.language || 'English'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                          <SelectItem value="Portuguese">Portuguese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Platform</Label>
                      <Select defaultValue={preferencesCartridge?.platform || 'LinkedIn'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                          <SelectItem value="Twitter">Twitter</SelectItem>
                          <SelectItem value="Facebook">Facebook</SelectItem>
                          <SelectItem value="Instagram">Instagram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select defaultValue={preferencesCartridge?.tone || 'Professional'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Professional">Professional</SelectItem>
                          <SelectItem value="Casual">Casual</SelectItem>
                          <SelectItem value="Friendly">Friendly</SelectItem>
                          <SelectItem value="Formal">Formal</SelectItem>
                          <SelectItem value="Humorous">Humorous</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Content Length</Label>
                      <Select defaultValue={preferencesCartridge?.content_length || 'Medium'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Short">Short (50-100 words)</SelectItem>
                          <SelectItem value="Medium">Medium (100-200 words)</SelectItem>
                          <SelectItem value="Long">Long (200-300 words)</SelectItem>
                          <SelectItem value="Very Long">Very Long (300+ words)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Emoji Usage</Label>
                      <Select defaultValue={preferencesCartridge?.emoji_usage || 'Moderate'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Minimal">Minimal</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="Frequent">Frequent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Call to Action</Label>
                      <Select defaultValue={preferencesCartridge?.call_to_action || 'Subtle'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Subtle">Subtle</SelectItem>
                          <SelectItem value="Clear">Clear</SelectItem>
                          <SelectItem value="Strong">Strong</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => {
                        // Collect form data and save
                        handlePreferencesSave({
                          language: 'English',
                          platform: 'LinkedIn',
                          tone: 'Professional',
                          content_length: 'Medium',
                          hashtag_count: 3,
                          emoji_usage: 'Moderate',
                          call_to_action: 'Subtle',
                          personalization_level: 'Medium'
                        });
                      }}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Save Preferences
                    </Button>
                    {preferencesCartridge && (
                      <Button
                        variant="outline"
                        onClick={() => setEditingPreferences(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium">Language</p>
                      <p className="text-sm text-muted-foreground">{preferencesCartridge.language}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Platform</p>
                      <p className="text-sm text-muted-foreground">{preferencesCartridge.platform}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Tone</p>
                      <p className="text-sm text-muted-foreground">{preferencesCartridge.tone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Content Length</p>
                      <p className="text-sm text-muted-foreground">{preferencesCartridge.content_length}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Emoji Usage</p>
                      <p className="text-sm text-muted-foreground">{preferencesCartridge.emoji_usage}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Call to Action</p>
                      <p className="text-sm text-muted-foreground">{preferencesCartridge.call_to_action}</p>
                    </div>
                  </div>
                  <Button onClick={() => setEditingPreferences(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Preferences
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instructions Tab */}
        <TabsContent value="instructions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Instructions</CardTitle>
              <CardDescription>
                Upload training documents to teach specific marketing frameworks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create New */}
              <div className="space-y-4">
                <Label>Create New Instruction Set</Label>
                <Input
                  placeholder="Name (e.g., 'StoryBrand Framework')"
                  value={newInstructionName}
                  onChange={(e) => setNewInstructionName(e.target.value)}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newInstructionDescription}
                  onChange={(e) => setNewInstructionDescription(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleInstructionCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Instruction Set
                </Button>
              </div>

              {/* Existing Instructions */}
              {instructionCartridges.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <Label>Instruction Sets</Label>
                  {instructionCartridges.map((instruction) => (
                    <Card key={instruction.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{instruction.name}</CardTitle>
                        {instruction.description && (
                          <CardDescription>{instruction.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Documents: {instruction.training_docs?.length || 0}
                            </span>
                            <Badge variant={
                              instruction.process_status === 'completed' ? 'default' :
                              instruction.process_status === 'processing' ? 'secondary' :
                              instruction.process_status === 'failed' ? 'destructive' :
                              'outline'
                            }>
                              {instruction.process_status}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Upload className="mr-2 h-3 w-3" />
                              Upload Docs
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="mr-2 h-3 w-3" />
                              Process
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Tab */}
        <TabsContent value="brand" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Information</CardTitle>
              <CardDescription>
                Define your company brand and visual identity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingBrand || !brandCartridge ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Brand Name</Label>
                      <Input
                        placeholder="Your Brand"
                        defaultValue={brandCartridge?.name || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input
                        placeholder="Company Inc."
                        defaultValue={brandCartridge?.company_name || ''}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Company Description</Label>
                      <Textarea
                        placeholder="What does your company do?"
                        defaultValue={brandCartridge?.company_description || ''}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Tagline</Label>
                      <Input
                        placeholder="Your memorable tagline"
                        defaultValue={brandCartridge?.company_tagline || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input
                        placeholder="Technology, Healthcare, etc."
                        defaultValue={brandCartridge?.industry || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <Input
                        placeholder="B2B SaaS, Consumers, etc."
                        defaultValue={brandCartridge?.target_audience || ''}
                      />
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label>Brand Logo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBrandLogoFile(e.target.files?.[0] || null)}
                      />
                      {brandLogoFile && (
                        <Button onClick={handleLogoUpload}>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => {
                        handleBrandSave({
                          name: 'My Brand',
                          company_name: 'Company Inc.',
                          core_values: [],
                          brand_personality: []
                        });
                      }}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Save Brand
                    </Button>
                    {brandCartridge && (
                      <Button
                        variant="outline"
                        onClick={() => setEditingBrand(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium">Brand Name</p>
                      <p className="text-sm text-muted-foreground">{brandCartridge.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Company</p>
                      <p className="text-sm text-muted-foreground">
                        {brandCartridge.company_name || 'Not set'}
                      </p>
                    </div>
                    {brandCartridge.company_description && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium">Description</p>
                        <p className="text-sm text-muted-foreground">
                          {brandCartridge.company_description}
                        </p>
                      </div>
                    )}
                    {brandCartridge.company_tagline && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium">Tagline</p>
                        <p className="text-sm text-muted-foreground">
                          {brandCartridge.company_tagline}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button onClick={() => setEditingBrand(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Brand
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="mt-8 border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <AlertCircle className="h-5 w-5" />
            About Marketing Cartridges
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200">
          <p className="mb-3">
            Marketing cartridges help the AI understand and replicate your unique approach:
          </p>
          <ul className="space-y-2 ml-4">
            <li>• <strong>Voice:</strong> How the AI speaks in your campaigns</li>
            <li>• <strong>Style:</strong> Your writing patterns learned from examples</li>
            <li>• <strong>Preferences:</strong> Default settings for content generation</li>
            <li>• <strong>Instructions:</strong> Specific frameworks and methodologies</li>
            <li>• <strong>Brand:</strong> Your company identity and visual elements</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}