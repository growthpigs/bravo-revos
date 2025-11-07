'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { VoiceAutoGenerator } from '@/components/voice/voice-auto-generator'
import { useVoiceGeneration } from '@/hooks/use-voice-generation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

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

export default function VoicePage() {
  const router = useRouter()
  const { createCartridgeFromVoice, generatedCartridge, loading, error } = useVoiceGeneration()
  const [selectedVoice, setSelectedVoice] = useState<VoiceParams | null>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)

  const handleVoiceGenerated = async (voice: VoiceParams, name: string) => {
    setSelectedVoice(voice)
    setSelectedName(name)

    // Create the cartridge
    const cartridge = await createCartridgeFromVoice(name, voice)

    if (cartridge) {
      // Success! Show confirmation and redirect
      setTimeout(() => {
        router.push(`/dashboard/cartridges/${cartridge.id}`)
      }, 2000)
    }
  }

  if (generatedCartridge) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Voice Created Successfully!</h1>
          <p className="text-muted-foreground mt-2">
            Your cartridge has been created and is ready to use
          </p>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle>{generatedCartridge.name}</CardTitle>
            </div>
            <CardDescription>Cartridge ID: {generatedCartridge.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">What&apos;s next?</h3>
              <ul className="space-y-2 text-sm">
                <li>✓ Your voice cartridge has been created</li>
                <li>✓ You can now use it for content generation</li>
                <li>✓ Share it with team members or keep it personal</li>
              </ul>
            </div>

            <Button onClick={() => router.push('/dashboard/cartridges')} className="w-full">
              View All Cartridges
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Create Your Voice</h1>
        <p className="text-muted-foreground mt-2">
          Let AI analyze your LinkedIn profile to create your unique voice cartridge
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <VoiceAutoGenerator
        onGenerated={handleVoiceGenerated}
      />

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            1. <strong>Connect your LinkedIn:</strong> We&apos;ll fetch your recent posts
          </p>
          <p>
            2. <strong>AI Analysis:</strong> GPT-4 analyzes your writing style
          </p>
          <p>
            3. <strong>Voice Creation:</strong> We create a cartridge with your voice parameters
          </p>
          <p>
            4. <strong>Ready to Use:</strong> Start using your voice for all content
          </p>
        </CardContent>
      </Card>
    </div>
  )
}