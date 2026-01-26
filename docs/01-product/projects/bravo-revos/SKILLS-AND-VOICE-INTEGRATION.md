# Skills and Voice Integration Specification

## Overview

Every piece of content in Bravo revOS flows through a two-stage transformation pipeline:
1. **Copywriting Skill** - Generates professional, conversion-optimized content
2. **Voice Cartridge** - Transforms content to match user's unique voice/persona

This ensures consistent, high-quality content that sounds authentically like the user.

## Architecture

```
┌─────────────────┐
│  User Input     │
│  (optional)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Copywriting     │ ◄── Skill #1
│ Skill           │     (AI-powered copywriting)
├─────────────────┤
│ - Headlines     │
│ - Hooks         │
│ - CTAs          │
│ - Value Props   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Voice           │ ◄── Cartridge Voice Filter
│ Cartridge       │     (User's unique tone/style)
├─────────────────┤
│ - Tone          │
│ - Style         │
│ - Personality   │
│ - Vocabulary    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Other Skills    │ ◄── Optional Additional Skills
│ (Optional)      │     (Email deliverability, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Final Output    │
└─────────────────┘
```

## Stage 1: Copywriting Skill

### Purpose
Generate professional, conversion-optimized copy based on proven frameworks.

### Implementation
```typescript
interface CopywritingSkill {
  id: string;
  name: 'copywriting';
  version: '1.0.0';
  type: 'content_generation';

  generate(params: {
    contentType: 'linkedin_post' | 'dm_message' | 'comment' | 'email_subject';
    objective: string;
    leadMagnet?: {
      title: string;
      description: string;
      valueProposition: string;
    };
    context?: Record<string, any>;
  }): Promise<{
    headline?: string;
    hook: string;
    body: string;
    cta: string;
    metadata: {
      framework: string; // AIDA, PAS, BAB, etc.
      readingLevel: number;
      emotionalTone: string;
    };
  }>;
}
```

### Copywriting Frameworks Used

#### For LinkedIn Posts (AIDA)
```
Attention: Pattern-interrupt headline
Interest: Compelling problem/opportunity
Desire: Benefits and transformation
Action: Clear CTA with urgency
```

#### For DM Messages (PAS)
```
Problem: Acknowledge their challenge
Agitate: Emphasize pain of status quo
Solution: Present lead magnet as answer
```

#### For Comments (VALUE)
```
Value-first: Lead with insight
Acknowledge: Reference their post
Link: Connect to lead magnet naturally
Urgency: Time-sensitive offer
Engage: Question or invitation
```

### Example Copywriting Generation
```javascript
const copywritingSkill = new CopywritingSkill();

// Generate LinkedIn post copy
const postCopy = await copywritingSkill.generate({
  contentType: 'linkedin_post',
  objective: 'Generate leads for leadership guide',
  leadMagnet: {
    title: '10x Leadership Framework',
    description: 'Transform your team in 30 days',
    valueProposition: 'Used by 500+ CEOs to scale their teams'
  }
});

// Output (before voice filter):
{
  headline: "The Hidden Cost of Poor Leadership (It's Not What You Think)",
  hook: "After coaching 500+ CEOs, I discovered something shocking...",
  body: "Most leadership problems aren't about skills or knowledge. They're about systems. Here's what I learned from helping teams scale from 10 to 100+ employees...",
  cta: "Comment 'SCALE' below for my free 10x Leadership Framework",
  metadata: {
    framework: "AIDA",
    readingLevel: 8,
    emotionalTone: "inspiring_authoritative"
  }
}
```

## Stage 2: Voice Cartridge Filter

### Purpose
Transform professional copy to match user's unique voice while maintaining effectiveness.

### Voice Parameters
```typescript
interface VoiceCartridge {
  id: string;
  userId: string;
  tier: 'system' | 'workspace' | 'user' | 'skill';

  voice: {
    // Core personality
    tone: 'professional' | 'casual' | 'inspirational' | 'analytical' | 'friendly';
    style: 'conversational' | 'authoritative' | 'storytelling' | 'educational' | 'motivational';
    personality: string[]; // ['humble', 'confident', 'empathetic', 'direct']

    // Writing patterns
    sentenceStructure: 'simple' | 'complex' | 'varied';
    paragraphLength: 'short' | 'medium' | 'long';
    vocabulary: 'basic' | 'professional' | 'technical' | 'creative';

    // Signature elements
    phrases: string[]; // User's common phrases
    emojis: boolean;
    hashtags: string[]; // Preferred hashtags

    // Linguistic patterns
    punctuation: {
      exclamations: 'none' | 'minimal' | 'moderate' | 'frequent';
      ellipsis: boolean;
      dashes: boolean;
    };

    // Generated from last 30 posts
    averageWordCount: number;
    readingLevel: number;
    topKeywords: string[];
  };

  knowledge: {
    industry: string;
    expertise: string[];
    audience: string;
    values: string[];
  };
}
```

### Voice Transformation Process
```javascript
async function applyVoiceFilter(
  content: CopywritingOutput,
  cartridge: VoiceCartridge
): Promise<string> {

  const voicePrompt = `
    Transform this professional copy to match this voice profile:

    ORIGINAL COPY:
    ${JSON.stringify(content, null, 2)}

    VOICE PROFILE:
    - Tone: ${cartridge.voice.tone}
    - Style: ${cartridge.voice.style}
    - Personality: ${cartridge.voice.personality.join(', ')}
    - Vocabulary: ${cartridge.voice.vocabulary}
    - Common phrases: ${cartridge.voice.phrases.join(', ')}

    REQUIREMENTS:
    1. Maintain the core message and CTA
    2. Keep the persuasive structure
    3. Match the user's natural writing patterns
    4. Sound authentic, not robotic
    5. Preserve conversion elements

    OUTPUT:
    Rewritten content in the user's voice
  `;

  const transformed = await gpt4.complete(voicePrompt);

  // Validate transformation maintains key elements
  const validation = await validateTransformation(content, transformed, cartridge);

  if (!validation.isValid) {
    // Retry with specific corrections
    return await applyVoiceFilterWithCorrections(content, cartridge, validation.issues);
  }

  return transformed;
}
```

## Stage 3: Skill Chaining (Optional)

### Available Skills for Chaining

#### Email Deliverability Skill
```typescript
interface EmailDeliverabilitySkill {
  optimize(content: string): Promise<{
    subject: string;
    preview: string;
    body: string;
    spamScore: number;
    suggestions: string[];
  }>;
}
```

#### Design Skill
```typescript
interface DesignSkill {
  enhance(content: string): Promise<{
    formatting: string; // Markdown with enhanced formatting
    visualElements: string[]; // Suggested emojis, bullets, etc.
    readability: number;
  }>;
}
```

#### Analytics Skill
```typescript
interface AnalyticsSkill {
  predict(content: string): Promise<{
    estimatedReach: number;
    engagementRate: number;
    conversionProbability: number;
    improvements: string[];
  }>;
}
```

### Skill Execution Modes

```typescript
enum SkillExecutionMode {
  HUMAN = 'human',        // User writes manually
  AI = 'ai',              // AI generates automatically
  SCHEDULED = 'scheduled' // Scheduled for specific time
}

interface SkillChain {
  skills: Array<{
    skill: Skill;
    mode: SkillExecutionMode;
    schedule?: Date; // If mode is 'scheduled'
    config?: Record<string, any>;
  }>;

  execute(input: any): Promise<any>;
}
```

## Implementation Examples

### Example 1: LinkedIn Post Creation
```javascript
// User creates a campaign
const campaign = {
  id: 'camp_123',
  leadMagnet: {
    title: 'Leadership Scaling Guide',
    url: 'https://...'
  }
};

// Step 1: Copywriting Skill generates professional copy
const copy = await copywritingSkill.generate({
  contentType: 'linkedin_post',
  objective: 'Generate leads for leadership guide',
  leadMagnet: campaign.leadMagnet
});

// Step 2: Voice Cartridge transforms to user's voice
const userVoice = await getUserCartridge(userId);
const personalizedContent = await applyVoiceFilter(copy, userVoice);

// Step 3: Optional skill chaining
if (skills.design.enabled) {
  personalizedContent = await designSkill.enhance(personalizedContent);
}

if (skills.analytics.enabled) {
  const prediction = await analyticsSkill.predict(personalizedContent);
  if (prediction.engagementRate < 0.05) {
    // Suggest improvements
  }
}

// Final output ready for posting
await publishToLinkedIn(personalizedContent);
```

### Example 2: DM Message Sequence
```javascript
// When someone comments with trigger word
async function onTriggerComment(comment: Comment) {
  // Step 1: Generate DM copy
  const dmCopy = await copywritingSkill.generate({
    contentType: 'dm_message',
    objective: 'Request email for lead magnet',
    context: {
      firstName: comment.author.firstName,
      leadMagnetName: campaign.leadMagnet.title
    }
  });

  // Step 2: Apply voice filter
  const personalizedDM = await applyVoiceFilter(dmCopy, userVoice);

  // Step 3: Send via Unipile
  await unipile.sendMessage({
    recipientId: comment.author.linkedinId,
    message: personalizedDM
  });
}
```

### Example 3: Comment Reply
```javascript
async function generateCommentReply(originalPost: Post) {
  // Step 1: Copywriting skill generates value-first comment
  const commentCopy = await copywritingSkill.generate({
    contentType: 'comment',
    objective: 'Add value while mentioning lead magnet',
    context: {
      postContent: originalPost.content,
      postAuthor: originalPost.author
    }
  });

  // Step 2: Voice filter
  const personalizedComment = await applyVoiceFilter(commentCopy, userVoice);

  // Step 3: Email deliverability check (if comment includes email)
  if (personalizedComment.includes('@')) {
    const optimized = await emailDeliverabilitySkill.optimize(personalizedComment);
    return optimized.body;
  }

  return personalizedComment;
}
```

## Skill Toggle UI

```typescript
interface SkillToggleUI {
  // In campaign settings
  renderSkillToggles(): JSX.Element {
    return (
      <div className="skill-toggles">
        <SkillToggle
          skill="copywriting"
          modes={['human', 'ai', 'scheduled']}
          default="ai"
          onModeChange={(mode) => {
            if (mode === 'human') {
              showEditor(); // Let user write their own
            } else if (mode === 'scheduled') {
              showScheduler(); // Set time for execution
            }
          }}
        />

        <SkillToggle
          skill="voice_filter"
          modes={['ai']} // Always on
          locked={true}
          hint="Voice filter is always applied to maintain consistency"
        />

        <SkillToggle
          skill="email_deliverability"
          modes={['off', 'ai']}
          default="ai"
        />

        <SkillToggle
          skill="design"
          modes={['off', 'ai']}
          default="off"
        />
      </div>
    );
  }
}
```

## Memory Integration (Mem0)

The system learns and improves over time:

```javascript
// After each successful conversion
await mem0.add({
  userId: userId,
  memory: {
    type: 'successful_copy',
    content: personalizedContent,
    metrics: {
      opens: 150,
      clicks: 45,
      conversions: 12
    },
    timestamp: new Date()
  }
});

// Use memories to improve future generation
const memories = await mem0.search({
  userId: userId,
  query: 'successful linkedin posts',
  limit: 10
});

// Include in copywriting context
const improvedCopy = await copywritingSkill.generate({
  contentType: 'linkedin_post',
  objective: 'Generate leads',
  context: {
    previousSuccesses: memories,
    userPreferences: await getUserPreferences(userId)
  }
});
```

## Quality Assurance

### Validation Rules
1. **CTA Preservation**: Ensure call-to-action remains clear
2. **Keyword Retention**: Keep trigger words for comment monitoring
3. **Length Limits**: Respect platform constraints (LinkedIn: 3000 chars)
4. **Spam Avoidance**: Check for spam triggers
5. **Brand Consistency**: Maintain user's brand voice

### Testing Framework
```javascript
describe('Skills and Voice Integration', () => {
  test('Copywriting skill generates valid copy', async () => {
    const copy = await copywritingSkill.generate({...});
    expect(copy).toHaveProperty('hook');
    expect(copy).toHaveProperty('cta');
    expect(copy.metadata.framework).toBeDefined();
  });

  test('Voice filter maintains message integrity', async () => {
    const original = await copywritingSkill.generate({...});
    const filtered = await applyVoiceFilter(original, cartridge);

    // Check CTA is preserved
    expect(filtered.toLowerCase()).toContain('comment');
    expect(filtered).toContain(original.leadMagnet.title);
  });

  test('Skill chaining executes in order', async () => {
    const chain = new SkillChain([
      { skill: copywritingSkill, mode: 'ai' },
      { skill: voiceFilter, mode: 'ai' },
      { skill: designSkill, mode: 'ai' }
    ]);

    const result = await chain.execute(input);
    expect(result).toHaveProperty('formatting');
  });
});
```

## Configuration

### Environment Variables
```env
# Skills Configuration
COPYWRITING_SKILL_ENABLED=true
COPYWRITING_MODEL=gpt-4o
VOICE_FILTER_ENABLED=true
VOICE_FILTER_MODEL=gpt-4o
EMAIL_DELIVERABILITY_ENABLED=true
DESIGN_SKILL_ENABLED=false
ANALYTICS_SKILL_ENABLED=false

# Skill Execution
DEFAULT_SKILL_MODE=ai
ALLOW_HUMAN_OVERRIDE=true
ALLOW_SCHEDULING=true
MAX_SKILL_CHAIN_LENGTH=5
SKILL_TIMEOUT_MS=30000
```

### Database Schema
```sql
-- Skills configuration per campaign
CREATE TABLE campaign_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id),
  skill_name TEXT NOT NULL,
  execution_mode TEXT CHECK (execution_mode IN ('human', 'ai', 'scheduled')),
  schedule TIMESTAMPTZ,
  config JSONB,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill execution history
CREATE TABLE skill_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id),
  skill_name TEXT NOT NULL,
  input JSONB,
  output JSONB,
  execution_time_ms INTEGER,
  success BOOLEAN,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice cartridge versions
CREATE TABLE voice_cartridge_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cartridge_id UUID REFERENCES cartridges(id),
  voice_params JSONB NOT NULL,
  sample_content TEXT[],
  created_from_posts INTEGER, -- Number of posts analyzed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);
```

## Summary

The Skills and Voice Integration system ensures:
1. **Professional Copy**: Copywriting skill generates conversion-optimized content
2. **Authentic Voice**: Voice cartridge makes it sound like the user
3. **Flexibility**: Skills can be toggled between human/AI/scheduled
4. **Quality**: Multiple validation checks ensure effectiveness
5. **Learning**: System improves over time with Mem0 integration
6. **Chainable**: Skills can be combined for enhanced results

This two-stage approach (copywriting → voice) with optional skill chaining provides the perfect balance of effectiveness and authenticity.