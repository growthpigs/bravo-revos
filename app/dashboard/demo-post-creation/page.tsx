'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Sparkles, User } from 'lucide-react';
import { toast } from 'sonner';

interface Cartridge {
  id: string;
  name: string;
  description?: string;
  voice_params?: {
    tone?: {
      formality?: string;
      enthusiasm?: number;
    };
    style?: {
      sentence_length?: string;
    };
  };
}

export default function DemoPostCreationPage() {
  const [step, setStep] = useState<'account' | 'mode' | 'content' | 'cartridge' | 'generate' | 'result'>(
    'account'
  );
  const [cartridges, setCartridges] = useState<Cartridge[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedAccount, setSelectedAccount] = useState('');
  const [writeMode, setWriteMode] = useState<'human' | 'ai'>('ai');
  const [postTopic, setPostTopic] = useState('How to scale your startup');
  const [selectedCartridge, setSelectedCartridge] = useState('');
  const [generatedPost, setGeneratedPost] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);

  // Load cartridges
  useEffect(() => {
    const fetchCartridges = async () => {
      try {
        const response = await fetch('/api/cartridges');
        if (response.ok) {
          const data = await response.json();
          setCartridges(data.cartridges || []);
          if (data.cartridges?.length > 0) {
            setSelectedCartridge(data.cartridges[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load cartridges:', error);
      }
    };
    fetchCartridges();
  }, []);

  const handleGeneratePost = async () => {
    if (!selectedCartridge || !postTopic) {
      toast.error('Please select a cartridge and enter a topic');
      return;
    }

    setGenerateLoading(true);
    try {
      const response = await fetch('/api/agentkit/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_post',
          campaignId: 'demo-campaign',
          topic: postTopic,
        }),
      });

      const data = await response.json();

      if (data.success && data.postContent) {
        setGeneratedPost(data.postContent.postText || 'Post generated successfully');
        setStep('result');
        toast.success('Post generated with AI cartridge!');
      } else {
        toast.error(data.error || 'Failed to generate post');
      }
    } catch (error) {
      console.error('Error:', error);
      // Fallback demo post if API fails
      setGeneratedPost(
        `🚀 ${postTopic}\n\nDiscover how leading teams are using proven frameworks to scale faster. Our approach focuses on sustainable growth and building the right culture.\n\n#Growth #Leadership #Startups\n\nWhat's your biggest scaling challenge?`
      );
      setStep('result');
      toast.success('Demo post generated!');
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold text-gray-900">LinkedIn Post Creator</h1>
          <p className="text-gray-600">Create engaging posts with AI-powered voice cartridges</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {[
            { id: 'account', label: 'Account' },
            { id: 'mode', label: 'Mode' },
            { id: 'content', label: 'Content' },
            { id: 'cartridge', label: 'Voice' },
            { id: 'generate', label: 'Generate' },
            { id: 'result', label: 'Result' },
          ].map((s) => (
            <div
              key={s.id}
              className={`flex-1 text-center py-2 px-1 rounded-lg mx-1 transition ${
                step === s.id
                  ? 'bg-blue-500 text-white font-bold'
                  : ['account', 'mode', 'content'].includes(s.id) && step > s.id
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              <span className="text-sm">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Account Selection */}
        {step === 'account' && (
          <Card>
            <CardHeader>
              <CardTitle>Select LinkedIn Account</CardTitle>
              <CardDescription>Choose which LinkedIn account to post to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Demo: Using &quot;Demo LinkedIn Account&quot; for this walkthrough</AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>LinkedIn Account</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demo-1">Demo LinkedIn Account (Demo User)</SelectItem>
                    <SelectItem value="real-1">Your Real LinkedIn Account (when connected)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => {
                  if (!selectedAccount) {
                    toast.error('Please select an account');
                    return;
                  }
                  setStep('mode');
                }}
                className="w-full"
              >
                Next: Choose Write Mode
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Write Mode Selection */}
        {step === 'mode' && (
          <Card>
            <CardHeader>
              <CardTitle>How Should We Write This Post?</CardTitle>
              <CardDescription>Choose between human writing or AI-powered generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onClick={() => setWriteMode('human')}
                className={`p-6 border-2 rounded-lg cursor-pointer transition ${
                  writeMode === 'human' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <h3 className="font-semibold mb-2">
                  <User className="inline h-4 w-4 mr-2" />
                  Human Written
                </h3>
                <p className="text-sm text-gray-600">You write it manually. Full creative control.</p>
              </div>

              <div
                onClick={() => setWriteMode('ai')}
                className={`p-6 border-2 rounded-lg cursor-pointer transition ${
                  writeMode === 'ai' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <h3 className="font-semibold mb-2">
                  <Sparkles className="inline h-4 w-4 mr-2" />
                  AI Generated
                </h3>
                <p className="text-sm text-gray-600">AI writes it using your voice cartridge. Fast & consistent.</p>
              </div>

              <Button
                onClick={() => (writeMode === 'ai' ? setStep('content') : setStep('content'))}
                className="w-full"
              >
                Next: {writeMode === 'ai' ? 'Choose Topic' : 'Write Post'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Content */}
        {step === 'content' && (
          <Card>
            <CardHeader>
              <CardTitle>
                {writeMode === 'ai'
                  ? 'What should the post be about?'
                  : 'Write your LinkedIn post'}
              </CardTitle>
              <CardDescription>
                {writeMode === 'ai'
                  ? 'Tell the AI the topic for your post'
                  : 'Compose your post text'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {writeMode === 'ai' ? (
                <>
                  <div className="space-y-2">
                    <Label>Post Topic</Label>
                    <Input
                      value={postTopic}
                      onChange={(e) => setPostTopic(e.target.value)}
                      placeholder="e.g., How to scale your startup, Best practices for remote teams..."
                    />
                  </div>
                  <Button onClick={() => setStep('cartridge')} className="w-full">
                    Next: Select Voice Cartridge
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Post Content</Label>
                    <Textarea
                      placeholder="Write your LinkedIn post here..."
                      defaultValue="Share your thoughts about leadership and growth..."
                      className="h-40"
                    />
                  </div>
                  <Button onClick={() => setStep('result')} className="w-full">
                    Preview Post
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Voice Cartridge Selection */}
        {step === 'cartridge' && (
          <Card>
            <CardHeader>
              <CardTitle>Select Voice Cartridge</CardTitle>
              <CardDescription>
                Choose the personality/tone for your AI-generated post
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartridges.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No cartridges found. Use default voice style for this demo.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Label>Voice Cartridge</Label>
                  <Select value={selectedCartridge} onValueChange={setSelectedCartridge}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cartridge..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cartridges.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.voice_params?.tone?.formality && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({c.voice_params.tone.formality})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-sm font-medium mb-2">Selected Cartridge Settings:</p>
                {selectedCartridge && cartridges.find((c) => c.id === selectedCartridge) ? (
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>
                      • Style:{' '}
                      {cartridges.find((c) => c.id === selectedCartridge)?.voice_params?.style
                        ?.sentence_length || 'Default'}
                    </p>
                    <p>
                      • Tone:{' '}
                      {cartridges.find((c) => c.id === selectedCartridge)?.voice_params?.tone
                        ?.formality || 'Professional'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Default AI voice settings</p>
                )}
              </div>

              <Button onClick={() => setStep('generate')} className="w-full">
                Next: Generate Post
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Generate */}
        {step === 'generate' && (
          <Card>
            <CardHeader>
              <CardTitle>Ready to Generate?</CardTitle>
              <CardDescription>Review and generate your AI post</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p className="text-sm">
                  <strong>Topic:</strong> {postTopic}
                </p>
                <p className="text-sm">
                  <strong>Voice:</strong>{' '}
                  {cartridges.find((c) => c.id === selectedCartridge)?.name || 'Default'}
                </p>
                <p className="text-sm">
                  <strong>Write Mode:</strong> AI-Powered with Cartridge
                </p>
              </div>

              <Button onClick={handleGeneratePost} disabled={generateLoading} className="w-full">
                {generateLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Post with AI
                  </>
                )}
              </Button>

              <Button
                onClick={() => setStep('cartridge')}
                variant="outline"
                className="w-full"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Result */}
        {step === 'result' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Your Post is Ready!
              </CardTitle>
              <CardDescription>Preview and post to LinkedIn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 bg-white border-2 border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                  <div className="w-10 h-10 bg-blue-200 rounded-full" />
                  <div>
                    <p className="font-semibold text-sm">Demo User</p>
                    <p className="text-xs text-gray-500">Just now</p>
                  </div>
                </div>
                <p className="text-gray-900 whitespace-pre-wrap">{generatedPost}</p>
                <div className="mt-4 pt-4 border-t flex gap-2 text-gray-500 text-sm">
                  <span>👍 Like</span>
                  <span>💬 Comment</span>
                  <span>🔄 Share</span>
                </div>
              </div>

              <Badge variant="outline" className="w-full justify-center py-2">
                ✅ Generated with {cartridges.find((c) => c.id === selectedCartridge)?.name || 'AI'} cartridge
              </Badge>

              <div className="grid grid-cols-2 gap-2">
                <Button className="w-full">Post to LinkedIn</Button>
                <Button variant="outline" className="w-full">
                  Save as Draft
                </Button>
              </div>

              <Button
                onClick={() => {
                  setStep('account');
                  setSelectedAccount('');
                  setPostTopic('How to scale your startup');
                  setGeneratedPost('');
                }}
                variant="ghost"
                className="w-full"
              >
                Create Another Post
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
