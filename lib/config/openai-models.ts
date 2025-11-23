export const OPENAI_MODELS = {
  // The flagship model for complex reasoning and orchestration
  // NOTE: GPT-5.1 not compatible with AgentKit SDK v0.3.0 - using gpt-4o until SDK update
  LATEST: 'gpt-4o',

  // Cost-effective model for simple tasks and high-volume processing
  FAST: 'gpt-4o-mini',

  // Legacy high-performance model (keep for backward compatibility if needed)
  STABLE: 'gpt-4o',

  // Legacy Preview
  LEGACY_PREVIEW: 'gpt-4-turbo-preview',

  // Legacy Turbo
  LEGACY_TURBO: 'gpt-4-turbo',
} as const;

export const DEFAULT_MODEL = OPENAI_MODELS.LATEST;
export const DEFAULT_FAST_MODEL = OPENAI_MODELS.FAST;
