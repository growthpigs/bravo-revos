// Cartridge Types for AudienceOS
// Ported from RevOS with multi-tenant support

// =============================================================================
// Voice Cartridge
// =============================================================================

export interface VoiceCartridge {
  id: string
  agencyId: string
  name: string
  displayName: string
  systemInstructions: string
  tier: 'user' | 'campaign' | 'request' | 'default'
  isActive: boolean
  voiceParams?: VoiceParams
  createdAt: string
  updatedAt?: string
}

export interface VoiceParams {
  tone: {
    formality: 'professional' | 'casual' | 'friendly'
    enthusiasm: number // 0-10
    empathy: number // 0-10
  }
  style: {
    sentenceLength: 'short' | 'medium' | 'long'
    paragraphStructure: 'single' | 'multi'
    useEmojis: boolean
    useHashtags: boolean
  }
  personality: {
    voiceDescription: string
    traits: string[]
  }
  vocabulary: {
    complexity: 'simple' | 'moderate' | 'advanced'
    industryTerms: string[]
    bannedWords: string[]
    preferredPhrases: string[]
  }
  contentPreferences?: {
    topics: string[]
    contentTypes: string[]
    callToActionStyle: 'direct' | 'subtle' | 'question'
  }
}

// =============================================================================
// Style Cartridge
// =============================================================================

export interface StyleCartridge {
  id: string
  agencyId: string
  sourceFiles: StyleSourceFile[]
  learnedStyle: LearnedStyle | null
  mem0Namespace: string
  analysisStatus: 'pending' | 'analyzing' | 'completed' | 'failed'
  createdAt: string
  updatedAt?: string
}

export interface StyleSourceFile {
  fileName: string
  fileSize: number
  fileType: string
  storageUrl: string
  uploadedAt: string
}

export interface LearnedStyle {
  writingPatterns: string[]
  vocabularyProfile: Record<string, number>
  toneAnalysis: string
  structurePreferences: string[]
}

// =============================================================================
// Preferences Cartridge
// =============================================================================

export interface PreferencesCartridge {
  id: string
  agencyId: string
  language: string
  platform: 'LinkedIn' | 'Twitter' | 'Facebook' | 'Instagram'
  tone: 'Professional' | 'Casual' | 'Friendly' | 'Formal' | 'Humorous'
  contentLength: 'Short' | 'Medium' | 'Long' | 'Very Long'
  hashtagCount: number
  emojiUsage: 'None' | 'Minimal' | 'Moderate' | 'Frequent'
  callToAction: 'None' | 'Subtle' | 'Clear' | 'Strong'
  personalizationLevel: 'Low' | 'Medium' | 'High'
  createdAt: string
  updatedAt?: string
}

// =============================================================================
// Instruction Cartridge
// =============================================================================

export interface InstructionCartridge {
  id: string
  agencyId: string
  name: string
  description?: string
  trainingDocs: TrainingDocument[]
  extractedKnowledge?: ExtractedKnowledge
  mem0Namespace: string
  processStatus: 'pending' | 'processing' | 'completed' | 'failed'
  lastProcessedAt?: string
  createdAt: string
  updatedAt?: string
}

export interface TrainingDocument {
  fileName: string
  fileSize: number
  fileType: string
  storageUrl: string
  uploadedAt: string
}

export interface ExtractedKnowledge {
  frameworks: string[]
  methodologies: string[]
  keyInsights: string[]
  rules: string[]
}

// =============================================================================
// Brand Cartridge
// =============================================================================

export interface BrandCartridge {
  id: string
  agencyId: string
  name: string
  companyName?: string
  companyDescription?: string
  companyTagline?: string
  industry?: string
  targetAudience?: string
  coreValues: string[]
  brandVoice?: string
  brandPersonality: string[]
  logoUrl?: string
  brandColors: BrandColors
  socialLinks: SocialLinks
  coreMessaging?: string // 10k+ word marketing messaging
  bensonBlueprint?: BensonBlueprint
  createdAt: string
  updatedAt?: string
}

export interface BrandColors {
  primary?: string
  secondary?: string
  accent?: string
  background?: string
  text?: string
}

export interface SocialLinks {
  linkedin?: string
  twitter?: string
  facebook?: string
  instagram?: string
  website?: string
}

// =============================================================================
// Benson Blueprint (112-point marketing framework)
// =============================================================================

export interface BensonBlueprint {
  bio: {
    name: string
    credentials: string[]
    backstory: string
    uniqueJourney: string
  }
  positioning: {
    niche: string
    targetAvatars: Avatar[]
    marketPosition: string
    competitiveDifferentiator: string
  }
  painAndObjections: {
    painPoints: string[]
    commonObjections: string[]
    fearsTriggers: string[]
    desiresTriggers: string[]
  }
  liesAndTruths: {
    industryLies: string[]
    truthBombs: string[]
    mythBusters: string[]
  }
  offer: {
    mainOffer: string
    pricing: string
    guarantees: string[]
    bonuses: string[]
    urgencyTriggers: string[]
    scarcityElements: string[]
  }
  hooks: {
    attentionGrabbers: string[]
    openingLines: string[]
    curiosityHooks: string[]
    controversialHooks: string[]
  }
  sales: {
    closingTechniques: string[]
    persuasionTriggers: string[]
    testimonialTypes: string[]
    proofElements: string[]
  }
  socialProof: {
    caseStudies: string[]
    results: string[]
    endorsements: string[]
    mediaAppearances: string[]
  }
  consumption: {
    deliveryMethod: string
    contentFormat: string[]
    engagementStrategies: string[]
  }
  page: {
    headlineFormulas: string[]
    subheadlineFormulas: string[]
    ctaVariations: string[]
  }
  service: {
    deliverables: string[]
    processSteps: string[]
    timelineExpectations: string
  }
  tips: {
    quickWins: string[]
    bestPractices: string[]
    commonMistakes: string[]
  }
  lessons: {
    keyInsights: string[]
    transformationStories: string[]
    ahamoments: string[]
  }
  email: {
    subjectLineFormulas: string[]
    openingHooks: string[]
    closingCtas: string[]
    sequenceStructure: string[]
  }
  leadMagnet: {
    types: string[]
    titles: string[]
    deliveryMechanism: string
  }
  visuals: {
    imageStyles: string[]
    colorPalette: string[]
    fontRecommendations: string[]
    layoutPreferences: string[]
  }
}

export interface Avatar {
  name: string
  demographics: string
  psychographics: string
  painPoints: string[]
  desires: string[]
  objections: string[]
}

// =============================================================================
// Cartridge Tab Types
// =============================================================================

export type CartridgeType = 'voice' | 'style' | 'preferences' | 'instructions' | 'brand'

export interface CartridgeTab {
  id: CartridgeType
  label: string
  icon: string
  description: string
}

// =============================================================================
// Default Values
// =============================================================================

export function getDefaultVoiceParams(): VoiceParams {
  return {
    tone: {
      formality: 'professional',
      enthusiasm: 5,
      empathy: 5,
    },
    style: {
      sentenceLength: 'medium',
      paragraphStructure: 'multi',
      useEmojis: false,
      useHashtags: true,
    },
    personality: {
      voiceDescription: '',
      traits: [],
    },
    vocabulary: {
      complexity: 'moderate',
      industryTerms: [],
      bannedWords: [],
      preferredPhrases: [],
    },
    contentPreferences: {
      topics: [],
      contentTypes: [],
      callToActionStyle: 'direct',
    },
  }
}

export function getDefaultPreferences(): Partial<PreferencesCartridge> {
  return {
    language: 'English',
    platform: 'LinkedIn',
    tone: 'Professional',
    contentLength: 'Medium',
    hashtagCount: 3,
    emojiUsage: 'Moderate',
    callToAction: 'Subtle',
    personalizationLevel: 'Medium',
  }
}
