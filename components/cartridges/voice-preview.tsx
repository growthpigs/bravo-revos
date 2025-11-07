'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VoiceParams } from '@/lib/cartridge-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VoicePreviewProps {
  voiceParams: VoiceParams;
  title?: string;
  description?: string;
  isResolved?: boolean;
}

export function VoicePreview({
  voiceParams,
  title = 'Voice Parameters',
  description,
  isResolved = false,
}: VoicePreviewProps) {
  const getToneColor = (value: number) => {
    if (value <= 3) return 'bg-red-100 text-red-900';
    if (value <= 6) return 'bg-yellow-100 text-yellow-900';
    return 'bg-green-100 text-green-900';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          {isResolved && (
            <Badge variant="outline" className="text-xs">
              Resolved with inheritance
            </Badge>
          )}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tone" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tone">Tone</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="personality">Personality</TabsTrigger>
            <TabsTrigger value="vocabulary">Vocabulary</TabsTrigger>
          </TabsList>

          {/* Tone Tab */}
          <TabsContent value="tone" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-sm font-semibold mb-2">Formality</div>
                <Badge variant="secondary" className="capitalize">
                  {voiceParams.tone.formality}
                </Badge>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Enthusiasm</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all ${getToneColor(voiceParams.tone.enthusiasm)}`}
                      style={{
                        width: `${(voiceParams.tone.enthusiasm / 10) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8">{voiceParams.tone.enthusiasm}/10</span>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Empathy</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all ${getToneColor(voiceParams.tone.empathy)}`}
                      style={{
                        width: `${(voiceParams.tone.empathy / 10) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8">{voiceParams.tone.empathy}/10</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-semibold mb-2">Sentence Length</div>
                <Badge variant="secondary" className="capitalize">
                  {voiceParams.style.sentence_length}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Paragraph Structure</div>
                <Badge variant="secondary" className="capitalize">
                  {voiceParams.style.paragraph_structure}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Emojis</div>
                <Badge variant={voiceParams.style.use_emojis ? 'default' : 'outline'}>
                  {voiceParams.style.use_emojis ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Hashtags</div>
                <Badge variant={voiceParams.style.use_hashtags ? 'default' : 'outline'}>
                  {voiceParams.style.use_hashtags ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </TabsContent>

          {/* Personality Tab */}
          <TabsContent value="personality" className="space-y-4">
            <div>
              <div className="text-sm font-semibold mb-2">Voice Description</div>
              <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                {voiceParams.personality.voice_description}
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">Personality Traits</div>
              <div className="flex flex-wrap gap-2">
                {voiceParams.personality.traits.length > 0 ? (
                  voiceParams.personality.traits.map((trait, i) => (
                    <Badge key={i} variant="outline">
                      {trait}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No traits defined</span>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Vocabulary Tab */}
          <TabsContent value="vocabulary" className="space-y-4">
            <div>
              <div className="text-sm font-semibold mb-2">Complexity Level</div>
              <Badge variant="secondary" className="capitalize">
                {voiceParams.vocabulary.complexity}
              </Badge>
            </div>

            {voiceParams.vocabulary.industry_terms.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-2">Industry Terms</div>
                <div className="flex flex-wrap gap-2">
                  {voiceParams.vocabulary.industry_terms.map((term, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {voiceParams.vocabulary.banned_words.length > 0 && (
              <div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="text-sm font-semibold mb-1">Banned Words</div>
                    <div className="flex flex-wrap gap-2">
                      {voiceParams.vocabulary.banned_words.map((word, i) => (
                        <span key={i} className="text-xs bg-red-100 text-red-900 px-2 py-1 rounded">
                          {word}
                        </span>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {voiceParams.vocabulary.preferred_phrases.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-2">Preferred Phrases</div>
                <div className="space-y-2">
                  {voiceParams.vocabulary.preferred_phrases.map((phrase, i) => (
                    <div key={i} className="text-sm p-2 bg-blue-50 rounded border border-blue-100">
                      &quot;{phrase}&quot;
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {voiceParams.content_preferences && (
          <div className="mt-6 pt-6 border-t">
            <div className="text-sm font-semibold mb-3">Content Preferences</div>
            <div className="grid grid-cols-1 gap-4">
              {voiceParams.content_preferences.topics.length > 0 && (
                <div>
                  <div className="text-xs font-semibold mb-2">Topics</div>
                  <div className="flex flex-wrap gap-2">
                    {voiceParams.content_preferences.topics.map((topic, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {voiceParams.content_preferences.content_types.length > 0 && (
                <div>
                  <div className="text-xs font-semibold mb-2">Content Types</div>
                  <div className="flex flex-wrap gap-2">
                    {voiceParams.content_preferences.content_types.map((type, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold mb-2">CTA Style</div>
                <Badge variant="secondary" className="capitalize text-xs">
                  {voiceParams.content_preferences.call_to_action_style}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
