'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

interface VoiceParams {
  tone: {
    formality: 'professional' | 'casual' | 'friendly'
    enthusiasm: number
    empathy: number
  }
  style: {
    sentence_length: 'short' | 'medium' | 'long'
    paragraph_structure: 'single' | 'multi'
    use_emojis: boolean
    use_hashtags: boolean
  }
  personality: {
    traits: string[]
    voice_description: string
  }
  vocabulary: {
    complexity: 'simple' | 'moderate' | 'advanced'
    industry_terms: string[]
    banned_words: string[]
    preferred_phrases: string[]
  }
  content_preferences?: {
    topics: string[]
    content_types: string[]
    call_to_action_style: 'direct' | 'subtle' | 'question'
  }
  confidence_score: number
}

interface VoiceAutoGeneratorProps {
  onGenerated: (voice: VoiceParams, cartridgeName: string) => void
}

export function VoiceAutoGenerator({ onGenerated }: VoiceAutoGeneratorProps) {
  const [linkedinUserId, setLinkedinUserId] = useState('')
  const [cartridgeName, setCartridgeName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedVoice, setGeneratedVoice] = useState<VoiceParams | null>(null)
  const [postsAnalyzed, setPostsAnalyzed] = useState(0)

  const handleGenerate = async () => {
    if (!linkedinUserId && !cartridgeName) {
      setError('Please enter a LinkedIn User ID or Cartridge Name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedinUserId: linkedinUserId || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate voice')
      }

      if (!data.voice) {
        setError(data.message || 'Could not generate voice from posts')
        return
      }

      setGeneratedVoice(data.voice)
      setPostsAnalyzed(data.posts_analyzed || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to generate voice')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!generatedVoice || !cartridgeName.trim()) {
      setError('Please enter a cartridge name')
      return
    }
    onGenerated(generatedVoice, cartridgeName)
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      {!generatedVoice && (
        <Card>
          <CardHeader>
            <CardTitle>Auto-Generate Your Voice</CardTitle>
            <CardDescription>
              Connect your LinkedIn to automatically generate your personal voice cartridge
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="linkedin-id">LinkedIn User ID (optional)</Label>
              <Input
                id="linkedin-id"
                placeholder="Your LinkedIn user ID or username"
                value={linkedinUserId}
                onChange={(e) => setLinkedinUserId(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to analyze sample posts for preview
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cartridge-name">Cartridge Name</Label>
              <Input
                id="cartridge-name"
                placeholder="e.g., My Personal Brand Voice"
                value={cartridgeName}
                onChange={(e) => setCartridgeName(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !cartridgeName.trim()}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Analyzing Your Posts...' : 'Generate Voice'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview Section */}
      {generatedVoice && (
        <Card>
          <CardHeader>
            <CardTitle>Your Generated Voice</CardTitle>
            <CardDescription>
              Analyzed {postsAnalyzed} LinkedIn posts (Confidence: {generatedVoice.confidence_score}%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tone */}
            <div>
              <h3 className="font-semibold mb-3">Tone</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Formality:</span>
                  <p className="font-medium capitalize">
                    {generatedVoice.tone.formality}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Enthusiasm:</span>
                  <p className="font-medium">{generatedVoice.tone.enthusiasm}/10</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Empathy:</span>
                  <p className="font-medium">{generatedVoice.tone.empathy}/10</p>
                </div>
              </div>
            </div>

            {/* Style */}
            <div>
              <h3 className="font-semibold mb-3">Style</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Sentence Length:</span>
                  <p className="font-medium capitalize">
                    {generatedVoice.style.sentence_length}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Uses Emojis:</span>
                  <p className="font-medium">
                    {generatedVoice.style.use_emojis ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Uses Hashtags:</span>
                  <p className="font-medium">
                    {generatedVoice.style.use_hashtags ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>

            {/* Personality */}
            <div>
              <h3 className="font-semibold mb-3">Personality</h3>
              <p className="text-sm mb-2">{generatedVoice.personality.voice_description}</p>
              <div className="flex flex-wrap gap-2">
                {generatedVoice.personality.traits.map((trait) => (
                  <span
                    key={trait}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>

            {/* Vocabulary */}
            <div>
              <h3 className="font-semibold mb-3">Vocabulary</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Complexity:</span>
                  <p className="font-medium capitalize">
                    {generatedVoice.vocabulary.complexity}
                  </p>
                </div>
                {generatedVoice.vocabulary.industry_terms.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block mb-1">
                      Industry Terms:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {generatedVoice.vocabulary.industry_terms.map((term) => (
                        <span
                          key={term}
                          className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {generatedVoice.vocabulary.preferred_phrases.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block mb-1">
                      Preferred Phrases:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {generatedVoice.vocabulary.preferred_phrases.map((phrase) => (
                        <span
                          key={phrase}
                          className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
                        >
                          {phrase}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Preferences */}
            {generatedVoice.content_preferences && (
              <div>
                <h3 className="font-semibold mb-3">Content Preferences</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Topics:</span>
                    <div className="flex flex-wrap gap-2">
                      {generatedVoice.content_preferences.topics.map((topic) => (
                        <span
                          key={topic}
                          className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CTA Style:</span>
                    <p className="font-medium capitalize">
                      {generatedVoice.content_preferences.call_to_action_style}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setGeneratedVoice(null)}>
                Start Over
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                Create Cartridge
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}