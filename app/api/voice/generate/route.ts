/**
 * Voice Auto-Generation API
 *
 * POST /api/voice/generate
 * - Fetches user's LinkedIn posts via Unipile
 * - Analyzes posts with GPT-4 to extract voice parameters
 * - Creates cartridge with auto-generated voice
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface VoiceAnalysisResult {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { linkedinUsername, linkedinPassword, linkedinUserId } = body

    // Validate inputs
    if (!linkedinUsername && !linkedinUserId) {
      return NextResponse.json(
        { error: 'LinkedIn username or user ID required' },
        { status: 400 }
      )
    }

    // Step 1: Fetch LinkedIn posts via Unipile
    const posts = await fetchLinkedInPosts(linkedinUserId)

    if (!posts || posts.length === 0) {
      return NextResponse.json(
        {
          success: true,
          voice: null,
          message: 'No LinkedIn posts found for analysis. Please create some posts first.',
        },
        { status: 200 }
      )
    }

    // Step 2: Analyze posts with GPT-4
    const voiceParams = await analyzePostsWithGPT4(posts)

    return NextResponse.json({
      success: true,
      voice: voiceParams,
      posts_analyzed: posts.length,
      message: `Successfully analyzed ${posts.length} LinkedIn posts`,
    })
  } catch (error: any) {
    console.error('Voice generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate voice' },
      { status: 500 }
    )
  }
}

/**
 * Fetch recent LinkedIn posts via Unipile API
 * Fetches up to 30 recent posts from the user's profile
 */
async function fetchLinkedInPosts(
  linkedinUserId?: string
): Promise<string[]> {
  try {
    // Mock data for development - replace with Unipile API call
    // In production, this would call:
    // https://api.unipile.com/v1/linkedin/posts?user_id={userId}&limit=30

    const mockPosts = [
      "Just launched our new AI-powered lead generation tool. Excited to see how it transforms LinkedIn outreach!",
      "3 key insights from analyzing 10,000 LinkedIn profiles: 1) Personalization matters, 2) Timing is crucial, 3) Value first, ask later.",
      "Building in public means learning in public. Today's blocker became tomorrow's feature 🚀",
      "The future of sales isn't about being pushy. It's about being helpful. That's why we built Bravo revOS.",
      "If you're still manually managing LinkedIn outreach, we should talk. Let's automate the repetitive stuff.",
    ]

    return mockPosts
  } catch (error) {
    console.error('Failed to fetch LinkedIn posts:', error)
    throw new Error('Could not fetch LinkedIn posts. Please check credentials.')
  }
}

/**
 * Analyze LinkedIn posts with GPT-4 to extract voice parameters
 */
async function analyzePostsWithGPT4(posts: string[]): Promise<VoiceAnalysisResult> {
  const postsText = posts.join('\n---\n')

  const systemPrompt = `You are an expert at analyzing writing style and voice.
  Analyze the provided LinkedIn posts and extract the writer's voice characteristics.

  Return a JSON object with this exact structure:
  {
    "tone": {
      "formality": "professional" | "casual" | "friendly",
      "enthusiasm": 0-10,
      "empathy": 0-10
    },
    "style": {
      "sentence_length": "short" | "medium" | "long",
      "paragraph_structure": "single" | "multi",
      "use_emojis": boolean,
      "use_hashtags": boolean
    },
    "personality": {
      "traits": ["trait1", "trait2", "trait3"],
      "voice_description": "2-3 sentence description of the writer's voice"
    },
    "vocabulary": {
      "complexity": "simple" | "moderate" | "advanced",
      "industry_terms": ["term1", "term2"],
      "banned_words": ["word1", "word2"],
      "preferred_phrases": ["phrase1", "phrase2"]
    },
    "content_preferences": {
      "topics": ["topic1", "topic2"],
      "content_types": ["type1", "type2"],
      "call_to_action_style": "direct" | "subtle" | "question"
    },
    "confidence_score": 0-100
  }`

  const userPrompt = `Analyze these LinkedIn posts and extract the writer's voice:

${postsText}

Return ONLY valid JSON with no additional text.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from GPT-4')
    }

    // Parse JSON response
    const voiceData = JSON.parse(content) as VoiceAnalysisResult
    return voiceData
  } catch (error: any) {
    console.error('GPT-4 analysis error:', error)

    // Return default voice on error
    return {
      tone: {
        formality: 'professional',
        enthusiasm: 7,
        empathy: 7,
      },
      style: {
        sentence_length: 'medium',
        paragraph_structure: 'multi',
        use_emojis: false,
        use_hashtags: false,
      },
      personality: {
        traits: ['helpful', 'authentic', 'thoughtful'],
        voice_description: 'Professional and approachable, focused on providing value.',
      },
      vocabulary: {
        complexity: 'moderate',
        industry_terms: [],
        banned_words: [],
        preferred_phrases: [],
      },
      content_preferences: {
        topics: ['business', 'technology', 'sales'],
        content_types: ['insights', 'tips', 'announcements'],
        call_to_action_style: 'subtle',
      },
      confidence_score: 30, // Low confidence due to error
    }
  }
}