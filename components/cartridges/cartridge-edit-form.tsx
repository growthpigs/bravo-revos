'use client';

import { useState } from 'react';
import { Cartridge, VoiceParams, getDefaultVoiceParams } from '@/lib/cartridge-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { VoicePreview } from './voice-preview';

interface CartridgeEditFormProps {
  cartridge?: Cartridge;
  onSave: (data: {
    name: string;
    description?: string;
    voice_params: VoiceParams;
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  isResolved?: boolean;
}

export function CartridgeEditForm({
  cartridge,
  onSave,
  onCancel,
  isLoading,
  isResolved,
}: CartridgeEditFormProps) {
  const isNew = !cartridge;

  // Form state
  const [name, setName] = useState(cartridge?.name || '');
  const [description, setDescription] = useState(cartridge?.description || '');
  const [voiceParams, setVoiceParams] = useState<VoiceParams>(
    cartridge?.voice_params || getDefaultVoiceParams()
  );
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      await onSave({
        name,
        description: description || undefined,
        voice_params: voiceParams,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cartridge');
    }
  };

  const updateVoiceParams = (updates: Partial<VoiceParams>) => {
    setVoiceParams((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const addArrayItem = (section: string, field: string, value: string) => {
    if (!value.trim()) return;

    setVoiceParams((prev) => {
      const newParams = JSON.parse(JSON.stringify(prev));
      if (!Array.isArray(newParams[section][field])) {
        newParams[section][field] = [];
      }
      newParams[section][field].push(value);
      return newParams;
    });
  };

  const removeArrayItem = (section: string, field: string, index: number) => {
    setVoiceParams((prev) => {
      const newParams = JSON.parse(JSON.stringify(prev));
      newParams[section][field] = newParams[section][field].filter(
        (_: string, i: number) => i !== index
      );
      return newParams;
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            {isNew ? 'Create a new voice cartridge' : 'Update cartridge details'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Cartridge Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Professional Tech Writer"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this voice profile..."
              className="resize-none h-20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Voice Parameters with Progressive Disclosure */}
      <Accordion type="single" collapsible className="space-y-4">
        {/* Tone Section */}
        <AccordionItem value="tone" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full mr-2">
              <span className="font-semibold">Tone & Attitude</span>
              <Badge variant="outline" className="text-xs">
                {voiceParams.tone.formality}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <Label htmlFor="formality">Formality Level</Label>
              <Select
                value={voiceParams.tone.formality}
                onValueChange={(value) =>
                  updateVoiceParams({
                    tone: { ...voiceParams.tone, formality: value as any },
                  })
                }
              >
                <SelectTrigger id="formality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Enthusiasm Level</Label>
                <span className="text-sm font-semibold text-blue-600">
                  {voiceParams.tone.enthusiasm}/10
                </span>
              </div>
              <Slider
                value={[voiceParams.tone.enthusiasm]}
                onValueChange={(value) =>
                  updateVoiceParams({
                    tone: { ...voiceParams.tone, enthusiasm: value[0] },
                  })
                }
                min={0}
                max={10}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-gray-600 mt-2">
                {voiceParams.tone.enthusiasm <= 3
                  ? 'Low energy, measured approach'
                  : voiceParams.tone.enthusiasm <= 6
                    ? 'Balanced, moderate energy'
                    : 'High energy, exciting tone'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Empathy Level</Label>
                <span className="text-sm font-semibold text-blue-600">
                  {voiceParams.tone.empathy}/10
                </span>
              </div>
              <Slider
                value={[voiceParams.tone.empathy]}
                onValueChange={(value) =>
                  updateVoiceParams({
                    tone: { ...voiceParams.tone, empathy: value[0] },
                  })
                }
                min={0}
                max={10}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-gray-600 mt-2">
                {voiceParams.tone.empathy <= 3
                  ? 'Direct, facts-focused'
                  : voiceParams.tone.empathy <= 6
                    ? 'Balanced understanding and facts'
                    : 'Highly empathetic, understanding-focused'}
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Style Section */}
        <AccordionItem value="style" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full mr-2">
              <span className="font-semibold">Writing Style</span>
              <Badge variant="outline" className="text-xs">
                {voiceParams.style.sentence_length} sentences
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <Label htmlFor="sentence-length">Sentence Length Preference</Label>
              <Select
                value={voiceParams.style.sentence_length}
                onValueChange={(value) =>
                  updateVoiceParams({
                    style: { ...voiceParams.style, sentence_length: value as any },
                  })
                }
              >
                <SelectTrigger id="sentence-length">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (Punchy, direct)</SelectItem>
                  <SelectItem value="medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="long">Long (Detailed, thorough)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paragraph-structure">Paragraph Structure</Label>
              <Select
                value={voiceParams.style.paragraph_structure}
                onValueChange={(value) =>
                  updateVoiceParams({
                    style: { ...voiceParams.style, paragraph_structure: value as any },
                  })
                }
              >
                <SelectTrigger id="paragraph-structure">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single sentence paragraphs</SelectItem>
                  <SelectItem value="multi">Multi-sentence paragraphs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-emojis"
                checked={voiceParams.style.use_emojis}
                onCheckedChange={(checked) =>
                  updateVoiceParams({
                    style: { ...voiceParams.style, use_emojis: checked === true },
                  })
                }
              />
              <Label htmlFor="use-emojis" className="cursor-pointer">
                Use emojis occasionally ✨
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-hashtags"
                checked={voiceParams.style.use_hashtags}
                onCheckedChange={(checked) =>
                  updateVoiceParams({
                    style: { ...voiceParams.style, use_hashtags: checked === true },
                  })
                }
              />
              <Label htmlFor="use-hashtags" className="cursor-pointer">
                Use hashtags when relevant #hashtag
              </Label>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Personality Section */}
        <AccordionItem value="personality" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full mr-2">
              <span className="font-semibold">Personality</span>
              <Badge variant="outline" className="text-xs">
                {voiceParams.personality.traits.length} traits
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <Label htmlFor="voice-description">Voice Description</Label>
              <Textarea
                id="voice-description"
                value={voiceParams.personality.voice_description}
                onChange={(e) =>
                  updateVoiceParams({
                    personality: {
                      ...voiceParams.personality,
                      voice_description: e.target.value,
                    },
                  })
                }
                placeholder="Describe the personality in one or two sentences..."
                className="resize-none h-20"
              />
            </div>

            <div>
              <Label>Personality Traits</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {voiceParams.personality.traits.map((trait, i) => (
                  <Badge key={i} variant="secondary" className="cursor-pointer">
                    {trait}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('personality', 'traits', i)}
                      className="ml-2"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a trait (e.g., 'confident', 'warm')"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addArrayItem('personality', 'traits', e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Vocabulary Section */}
        <AccordionItem value="vocabulary" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full mr-2">
              <span className="font-semibold">Vocabulary & Language</span>
              <Badge variant="outline" className="text-xs">
                {voiceParams.vocabulary.complexity}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <Label htmlFor="complexity">Complexity Level</Label>
              <Select
                value={voiceParams.vocabulary.complexity}
                onValueChange={(value) =>
                  updateVoiceParams({
                    vocabulary: { ...voiceParams.vocabulary, complexity: value as any },
                  })
                }
              >
                <SelectTrigger id="complexity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple (Everyday language)</SelectItem>
                  <SelectItem value="moderate">Moderate (Professional vocabulary)</SelectItem>
                  <SelectItem value="advanced">Advanced (Specialized terminology)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Industry Terms to Use</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {voiceParams.vocabulary.industry_terms.map((term, i) => (
                  <Badge key={i} variant="secondary" className="cursor-pointer">
                    {term}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('vocabulary', 'industry_terms', i)}
                      className="ml-2"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add a term (e.g., 'API', 'machine learning')"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addArrayItem('vocabulary', 'industry_terms', e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>

            <div>
              <Label>Words to Avoid</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {voiceParams.vocabulary.banned_words.map((word, i) => (
                  <Badge key={i} variant="destructive" className="cursor-pointer">
                    {word}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('vocabulary', 'banned_words', i)}
                      className="ml-2"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add a word to avoid"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addArrayItem('vocabulary', 'banned_words', e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>

            <div>
              <Label>Preferred Phrases</Label>
              <div className="space-y-2 mb-3">
                {voiceParams.vocabulary.preferred_phrases.map((phrase, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm">&quot;{phrase}&quot;</span>
                    <button
                      type="button"
                      onClick={() => removeArrayItem('vocabulary', 'preferred_phrases', i)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Input
                placeholder="Add a phrase to use (e.g., 'let me know')"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addArrayItem('vocabulary', 'preferred_phrases', e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Content Preferences */}
        <AccordionItem value="content" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold">Content Preferences</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <Label>Topics</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {voiceParams.content_preferences?.topics.map((topic, i) => (
                  <Badge key={i} variant="outline" className="cursor-pointer">
                    {topic}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('content_preferences', 'topics', i)}
                      className="ml-2"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add a topic (e.g., 'productivity', 'AI')"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!voiceParams.content_preferences) {
                      setVoiceParams((prev) => ({
                        ...prev,
                        content_preferences: {
                          topics: [e.currentTarget.value],
                          content_types: [],
                          call_to_action_style: 'direct',
                        },
                      }));
                    } else {
                      addArrayItem('content_preferences', 'topics', e.currentTarget.value);
                    }
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>

            <div>
              <Label>Content Types</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {voiceParams.content_preferences?.content_types.map((type, i) => (
                  <Badge key={i} variant="outline" className="cursor-pointer">
                    {type}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('content_preferences', 'content_types', i)}
                      className="ml-2"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add a content type (e.g., 'how-to', 'case-study')"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!voiceParams.content_preferences) {
                      setVoiceParams((prev) => ({
                        ...prev,
                        content_preferences: {
                          topics: [],
                          content_types: [e.currentTarget.value],
                          call_to_action_style: 'direct',
                        },
                      }));
                    } else {
                      addArrayItem('content_preferences', 'content_types', e.currentTarget.value);
                    }
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>

            <div>
              <Label htmlFor="cta-style">Call-to-Action Style</Label>
              <Select
                value={voiceParams.content_preferences?.call_to_action_style || 'direct'}
                onValueChange={(value) =>
                  setVoiceParams((prev) => {
                    const contentPrefs = prev.content_preferences || {
                      topics: [],
                      content_types: [],
                      call_to_action_style: 'direct',
                    };
                    return {
                      ...prev,
                      content_preferences: {
                        ...contentPrefs,
                        call_to_action_style: value as any,
                      },
                    };
                  })
                }
              >
                <SelectTrigger id="cta-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct (Clear ask)</SelectItem>
                  <SelectItem value="subtle">Subtle (Implied ask)</SelectItem>
                  <SelectItem value="question">Question (Curiosity-driven)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Live Preview */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
        <VoicePreview voiceParams={voiceParams} isResolved={isResolved} />
      </div>

      {/* Form Actions */}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Cartridge'}
        </Button>
      </div>
    </form>
  );
}
