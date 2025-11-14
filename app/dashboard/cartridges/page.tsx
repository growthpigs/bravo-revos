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
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
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

interface InstructionCartridge {
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
  const [preferencesFormData, setPreferencesFormData] = useState({
    language: 'English',
    platform: 'LinkedIn',
    tone: 'Professional',
    content_length: 'Medium',
    hashtag_count: 3,
    emoji_usage: 'Moderate',
    call_to_action: 'Subtle',
    personalization_level: 'Medium'
  });

  // Instructions state
  const [instructionCartridges, setInstructionCartridges] = useState<InstructionCartridge[]>([]);
  const [newInstructionName, setNewInstructionName] = useState('');
  const [newInstructionDescription, setNewInstructionDescription] = useState('');

  // Brand state
  const [brandCartridge, setBrandCartridge] = useState<BrandCartridge | null>(null);
  const [editingBrand, setEditingBrand] = useState(false);
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);
  const [brandFormData, setBrandFormData] = useState({
    name: '',
    company_name: '',
    company_description: '',
    company_tagline: '',
    industry: '',
    target_audience: ''
  });

  // Polling state for processing status
  const [pollingIntervals, setPollingIntervals] = useState<{
    style?: NodeJS.Timeout;
    instructions: Map<string, NodeJS.Timeout>;
  }>({ instructions: new Map() });

  // Poll style cartridge status if processing
  useEffect(() => {
    console.log('[DEBUG_POLL] Style polling effect triggered, status:', styleCartridge?.analysis_status);

    if (!styleCartridge?.id) {
      console.log('[DEBUG_POLL] No style cartridge, skipping poll');
      return;
    }

    const status = styleCartridge.analysis_status;

    // Only poll if status is 'analyzing' (the status during processing)
    if (status === 'analyzing') {
      console.log('[DEBUG_POLL] Starting style status polling for:', styleCartridge.id);

      const pollStyleStatus = async () => {
        try {
          const response = await fetch(`/api/cartridges/style/${styleCartridge.id}/status`, {
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            console.log('[DEBUG_POLL] Style status update:', data);

            // Update the cartridge status if it changed
            if (data.status !== status) {
              console.log('[DEBUG_POLL] Status changed from', status, 'to', data.status);
              await fetchStyleCartridge();

              // Show toast on completion or failure
              if (data.status === 'completed') {
                toast.success('Style analysis completed!');
              } else if (data.status === 'failed') {
                toast.error(data.error || 'Style analysis failed');
              }
            }
          }
        } catch (error) {
          console.error('[DEBUG_POLL] Error polling style status:', error);
        }
      };

      // Poll immediately
      pollStyleStatus();

      // Then poll every 3 seconds
      const interval = setInterval(pollStyleStatus, 3000);

      setPollingIntervals(prev => ({ ...prev, style: interval }));

      return () => {
        console.log('[DEBUG_POLL] Cleaning up style polling interval');
        clearInterval(interval);
      };
    } else {
      console.log('[DEBUG_POLL] Style not processing, clearing any existing interval');
      // Clear interval if status is not processing
      if (pollingIntervals.style) {
        clearInterval(pollingIntervals.style);
        setPollingIntervals(prev => ({ ...prev, style: undefined }));
      }
    }
  }, [styleCartridge?.id, styleCartridge?.analysis_status]);

  // Poll instruction cartridges status if processing
  useEffect(() => {
    console.log('[DEBUG_POLL] Instructions polling effect triggered, count:', instructionCartridges.length);

    const processingInstructions = instructionCartridges.filter(
      inst => inst.process_status === 'processing'
    );

    console.log('[DEBUG_POLL] Processing instructions:', processingInstructions.map(i => i.id));

    // Clear intervals for instructions that are no longer processing
    const currentIds = new Set(processingInstructions.map(i => i.id));
    pollingIntervals.instructions.forEach((interval, id) => {
      if (!currentIds.has(id)) {
        console.log('[DEBUG_POLL] Clearing interval for instruction:', id);
        clearInterval(interval);
        pollingIntervals.instructions.delete(id);
      }
    });

    // Set up polling for each processing instruction
    processingInstructions.forEach(instruction => {
      if (!pollingIntervals.instructions.has(instruction.id)) {
        console.log('[DEBUG_POLL] Starting polling for instruction:', instruction.id);

        const pollInstructionStatus = async () => {
          try {
            const response = await fetch(`/api/cartridges/instructions/${instruction.id}/status`, {
              credentials: 'include'
            });

            if (response.ok) {
              const data = await response.json();
              console.log('[DEBUG_POLL] Instruction status update:', instruction.id, data);

              // If status changed, refetch all instructions
              if (data.status !== instruction.process_status) {
                console.log('[DEBUG_POLL] Instruction status changed from', instruction.process_status, 'to', data.status);
                await fetchInstructionCartridges();

                // Show toast on completion or failure
                if (data.status === 'completed') {
                  toast.success(`Instruction "${instruction.name}" processed successfully!`);
                } else if (data.status === 'failed') {
                  toast.error(`Instruction "${instruction.name}" processing failed`);
                }
              }
            }
          } catch (error) {
            console.error('[DEBUG_POLL] Error polling instruction status:', error);
          }
        };

        // Poll immediately
        pollInstructionStatus();

        // Then poll every 3 seconds
        const interval = setInterval(pollInstructionStatus, 3000);
        pollingIntervals.instructions.set(instruction.id, interval);
      }
    });

    // Cleanup function
    return () => {
      console.log('[DEBUG_POLL] Cleaning up all instruction polling intervals');
      pollingIntervals.instructions.forEach(interval => clearInterval(interval));
      pollingIntervals.instructions.clear();
    };
  }, [instructionCartridges.map(i => `${i.id}:${i.process_status}`).join(',')]);

  useEffect(() => {
    fetchAllCartridges();
  }, []);

  const fetchAllCartridges = async () => {
    console.log('[TRACE_INIT] ========== CARTRIDGE FETCH SESSION START ==========');
    console.log('[TRACE_INIT] 1. Window location:', window.location.href);
    console.log('[TRACE_INIT] 2. Document cookies present:', document.cookie ? 'YES' : 'NO');
    console.log('[TRACE_INIT] 3. Cookie details:', document.cookie);

    // Check localStorage for Supabase auth
    const authKeys = Object.keys(localStorage).filter(k => k.includes('supabase'));
    console.log('[TRACE_INIT] 4. LocalStorage auth keys:', authKeys);
    authKeys.forEach(key => {
      console.log('[TRACE_INIT]   -', key, ':', localStorage.getItem(key)?.substring(0, 50) + '...');
    });

    setLoading(true);
    try {
      const supabase = createClient();
      console.log('[TRACE_INIT] 5. Supabase client created');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('[TRACE_INIT] 6. Auth check result:', {
        hasUser: !!user,
        userId: user?.id,
        error: authError?.message
      });

      if (authError || !user) {
        console.error('[TRACE_INIT] 7. Auth failed, redirecting to login:', authError);
        router.push('/auth/login');
        return;
      }

      console.log('[TRACE_INIT] 8. Starting parallel fetches...');
      // Fetch all cartridge types in parallel
      const results = await Promise.allSettled([
        fetchVoiceCartridges().catch(e => { console.log('[TRACE_ERROR] Voice failed:', e); return 'failed'; }),
        fetchStyleCartridge().catch(e => { console.log('[TRACE_ERROR] Style failed:', e); return 'failed'; }),
        fetchPreferencesCartridge().catch(e => { console.log('[TRACE_ERROR] Preferences failed:', e); return 'failed'; }),
        fetchInstructionCartridges().catch(e => { console.log('[TRACE_ERROR] Instructions failed:', e); return 'failed'; }),
        fetchBrandCartridge().catch(e => { console.log('[TRACE_ERROR] Brand failed:', e); return 'failed'; })
      ]);

      console.log('[TRACE_INIT] 9. Fetch results:', results.map((r, i) =>
        `${['Voice', 'Style', 'Preferences', 'Instructions', 'Brand'][i]}: ${r.status}`
      ));
    } catch (error) {
      console.error('[TRACE_INIT] 10. CRITICAL ERROR:', error);
      toast.error('Failed to load cartridges');
    } finally {
      setLoading(false);
      console.log('[TRACE_INIT] ========== CARTRIDGE FETCH SESSION END ==========');
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
      console.log('[TRACE_STYLE] 1. Starting style fetch');
      const response = await fetch('/api/cartridges/style', {
        credentials: 'include', // CRITICAL: Include cookies
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('[TRACE_STYLE] 2. Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TRACE_STYLE] 3. Error response:', errorText);
        throw new Error(`Style fetch failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[TRACE_STYLE] 4. Success, got data:', data);
      setStyleCartridge(data.cartridge);
    } catch (error) {
      console.error('[TRACE_STYLE] 5. FULL ERROR:', error);
      throw error; // Re-throw to be caught by Promise.allSettled
    }
  };

  const fetchPreferencesCartridge = async () => {
    try {
      console.log('[TRACE_PREFS] 1. Starting preferences fetch');
      const response = await fetch('/api/cartridges/preferences', {
        credentials: 'include', // CRITICAL: Include cookies
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('[TRACE_PREFS] 2. Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TRACE_PREFS] 3. Error response:', errorText);
        throw new Error(`Preferences fetch failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[TRACE_PREFS] 4. Success, got data:', data);
      setPreferencesCartridge(data.preferences);
    } catch (error) {
      console.error('[TRACE_PREFS] 5. FULL ERROR:', error);
      throw error; // Re-throw to be caught by Promise.allSettled
    }
  };

  const fetchInstructionCartridges = async () => {
    try {
      console.log('[TRACE_INSTR] 1. Starting instructions fetch');
      const response = await fetch('/api/cartridges/instructions', {
        credentials: 'include', // CRITICAL: Include cookies
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('[TRACE_INSTR] 2. Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TRACE_INSTR] 3. Error response:', errorText);
        throw new Error(`Instructions fetch failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[TRACE_INSTR] 4. Success, got data:', data);
      setInstructionCartridges(data.cartridges || []);
    } catch (error) {
      console.error('[TRACE_INSTR] 5. FULL ERROR:', error);
      throw error; // Re-throw to be caught by Promise.allSettled
    }
  };

  const fetchBrandCartridge = async () => {
    try {
      console.log('[TRACE_API] 1. Frontend: Starting brand fetch');
      console.log('[TRACE_API] 2. Frontend: Current URL:', window.location.href);
      console.log('[TRACE_API] 3. Frontend: Cookies present:', document.cookie ? 'YES' : 'NO');

      const response = await fetch('/api/cartridges/brand', {
        credentials: 'include', // CRITICAL: Include cookies
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('[TRACE_API] 4. Frontend: Response status:', response.status);
      console.log('[TRACE_API] 5. Frontend: Response headers:', response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TRACE_API] 6. Frontend: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[TRACE_API] 7. Frontend: Success, got data:', data);
      setBrandCartridge(data.brand);
    } catch (error) {
      console.error('[TRACE_API] 8. Frontend: FULL ERROR:', error);
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

  const handleInstructionUpload = async (instructionId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.txt,.docx,.md';

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      formData.append('instructionId', instructionId);

      try {
        const response = await fetch('/api/cartridges/instructions/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          toast.success('Documents uploaded successfully');
          await fetchInstructionCartridges();
        } else {
          const error = await response.json();
          toast.error(error.error || 'Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload documents');
      }
    };

    input.click();
  };

  const handleInstructionProcess = async (instructionId: string) => {
    try {
      const response = await fetch('/api/cartridges/instructions/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructionId })
      });

      if (response.ok) {
        toast.success('Processing started');
        await fetchInstructionCartridges();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Process failed');
      }
    } catch (error) {
      console.error('Process error:', error);
      toast.error('Failed to process instruction');
    }
  };

  const handleInstructionDelete = async (instructionId: string) => {
    // Find the instruction name for better UX
    const instruction = instructionCartridges.find(i => i.id === instructionId);
    const name = instruction?.name || 'instruction set';

    // Show confirmation toast
    toast.custom(
      (t) => (
        <div className="flex flex-col gap-2 bg-background border rounded-lg p-4 shadow-lg">
          <p className="font-medium">Delete "{name}"?</p>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={async () => {
                toast.dismiss(t);
                try {
                  const response = await fetch(`/api/cartridges/instructions/${instructionId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                  });

                  if (response.ok) {
                    toast.success('Instruction deleted');
                    await fetchInstructionCartridges();
                  } else {
                    const error = await response.json();
                    toast.error(error.error || 'Delete failed');
                  }
                } catch (error) {
                  console.error('Delete error:', error);
                  toast.error('Failed to delete instruction');
                }
              }}
              className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => toast.dismiss(t)}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: 'top-center' as const
      }
    );
  };

  // Preferences handlers
  const handlePreferencesDelete = async () => {
    // Show confirmation toast
    toast.custom(
      (t) => (
        <div className="flex flex-col gap-2 bg-background border rounded-lg p-4 shadow-lg">
          <p className="font-medium">Delete your preferences?</p>
          <p className="text-sm text-muted-foreground">This will reset to default settings.</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={async () => {
                toast.dismiss(t);
                try {
                  const response = await fetch('/api/cartridges/preferences', {
                    method: 'DELETE',
                    credentials: 'include'
                  });

                  if (response.ok) {
                    toast.success('Preferences deleted');
                    await fetchPreferencesCartridge();
                  } else {
                    const error = await response.json();
                    toast.error(error.error || 'Delete failed');
                  }
                } catch (error) {
                  console.error('Delete error:', error);
                  toast.error('Failed to delete preferences');
                }
              }}
              className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => toast.dismiss(t)}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: 'top-center' as const
      }
    );
  };

  // Style handlers
  const handleStyleDelete = async () => {
    toast.custom(
      (t) => (
        <div className="flex flex-col gap-2 bg-background border rounded-lg p-4 shadow-lg">
          <p className="font-medium">Delete style guide?</p>
          <p className="text-sm text-muted-foreground">This will remove all uploaded style documents.</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={async () => {
                toast.dismiss(t);
                try {
                  const response = await fetch(`/api/cartridges/style/${styleCartridge?.id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                  });

                  if (response.ok) {
                    toast.success('Style guide deleted');
                    await fetchStyleCartridge();
                  } else {
                    const error = await response.json();
                    toast.error(error.error || 'Delete failed');
                  }
                } catch (error) {
                  console.error('Delete error:', error);
                  toast.error('Failed to delete style guide');
                }
              }}
              className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => toast.dismiss(t)}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: 'top-center' as const
      }
    );
  };

  // Brand handlers
  const handleBrandDelete = async () => {
    toast.custom(
      (t) => (
        <div className="flex flex-col gap-2 bg-background border rounded-lg p-4 shadow-lg">
          <p className="font-medium">Delete brand information?</p>
          <p className="text-sm text-muted-foreground">This will remove all brand settings.</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={async () => {
                toast.dismiss(t);
                try {
                  const response = await fetch('/api/cartridges/brand', {
                    method: 'DELETE',
                    credentials: 'include'
                  });

                  if (response.ok) {
                    toast.success('Brand information deleted');
                    await fetchBrandCartridge();
                    setEditingBrand(false);
                  } else {
                    const error = await response.json();
                    toast.error(error.error || 'Delete failed');
                  }
                } catch (error) {
                  console.error('Delete error:', error);
                  toast.error('Failed to delete brand information');
                }
              }}
              className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => toast.dismiss(t)}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: 'top-center' as const
      }
    );
  };

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
                    <div className="flex gap-2">
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
                      <Button
                        variant="destructive"
                        size="default"
                        onClick={handleStyleDelete}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
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
                      <Select
                        value={preferencesFormData.language}
                        onValueChange={(value) => setPreferencesFormData(prev => ({ ...prev, language: value }))}>
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
                      <Select
                        value={preferencesFormData.platform}
                        onValueChange={(value) => setPreferencesFormData(prev => ({ ...prev, platform: value }))}>
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
                      <Select
                        value={preferencesFormData.tone}
                        onValueChange={(value) => setPreferencesFormData(prev => ({ ...prev, tone: value }))}>
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
                      <Select
                        value={preferencesFormData.content_length}
                        onValueChange={(value) => setPreferencesFormData(prev => ({ ...prev, content_length: value }))}>
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
                      <Select
                        value={preferencesFormData.emoji_usage}
                        onValueChange={(value) => setPreferencesFormData(prev => ({ ...prev, emoji_usage: value }))}>
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
                      <Select
                        value={preferencesFormData.call_to_action}
                        onValueChange={(value) => setPreferencesFormData(prev => ({ ...prev, call_to_action: value }))}>
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
                        handlePreferencesSave(preferencesFormData);
                      }}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Save Preferences
                    </Button>
                    {preferencesCartridge && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setEditingPreferences(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handlePreferencesDelete}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete All
                        </Button>
                      </>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleInstructionUpload(instruction.id)}
                            >
                              <Upload className="mr-2 h-3 w-3" />
                              Upload Docs
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleInstructionProcess(instruction.id)}
                              disabled={instruction.process_status === 'processing'}
                            >
                              <Eye className="mr-2 h-3 w-3" />
                              Process
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleInstructionDelete(instruction.id)}
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Delete
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
                        value={brandFormData.name || brandCartridge?.name || ''}
                        onChange={(e) => setBrandFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input
                        placeholder="Company Inc."
                        value={brandFormData.company_name || brandCartridge?.company_name || ''}
                        onChange={(e) => setBrandFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Company Description</Label>
                      <Textarea
                        placeholder="What does your company do?"
                        value={brandFormData.company_description || brandCartridge?.company_description || ''}
                        onChange={(e) => setBrandFormData(prev => ({ ...prev, company_description: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Tagline</Label>
                      <Input
                        placeholder="Your memorable tagline"
                        value={brandFormData.company_tagline || brandCartridge?.company_tagline || ''}
                        onChange={(e) => setBrandFormData(prev => ({ ...prev, company_tagline: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input
                        placeholder="Technology, Healthcare, etc."
                        value={brandFormData.industry || brandCartridge?.industry || ''}
                        onChange={(e) => setBrandFormData(prev => ({ ...prev, industry: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <Input
                        placeholder="B2B SaaS, Consumers, etc."
                        value={brandFormData.target_audience || brandCartridge?.target_audience || ''}
                        onChange={(e) => setBrandFormData(prev => ({ ...prev, target_audience: e.target.value }))}
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
                          ...brandFormData,
                          core_values: [],
                          brand_personality: []
                        });
                      }}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Save Brand
                    </Button>
                    {brandCartridge && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setEditingBrand(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleBrandDelete}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </>
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