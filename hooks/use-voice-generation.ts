/**
 * Hook for Voice Auto-Generation
 * Handles the full flow: analyze posts → generate voice → create cartridge
 */

import { useState } from 'react'

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

interface Cartridge {
  id: string
  name: string
  tier: string
  voice_params: VoiceParams
  created_at: string
}

export function useVoiceGeneration() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedCartridge, setGeneratedCartridge] = useState<Cartridge | null>(null)

  const createCartridgeFromVoice = async (
    cartridgeName: string,
    voiceParams: VoiceParams,
    parentId?: string
  ): Promise<Cartridge | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/cartridges/generate-from-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cartridgeName,
          voiceParams,
          tier: 'user',
          parentId: parentId || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create cartridge')
      }

      setGeneratedCartridge(data.cartridge)
      return data.cartridge
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create cartridge'
      setError(errorMsg)
      return null
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setGeneratedCartridge(null)
    setError(null)
  }

  return {
    createCartridgeFromVoice,
    generatedCartridge,
    loading,
    error,
    reset,
  }
}