# Cartridge System Specification

## Overview

The **Cartridge System** is the control center of RevOS. It defines how AgentKit behaves for each client by providing:
- Persona and expertise
- Writing style and tone
- Industry-specific knowledge
- Enabled tools (MCPs)
- Example content

> **Key Insight**: "We can always change that" - Cartridges make business logic flexible because they're just prompts/data, not hardcoded logic.

## Architecture

### Storage: Mem0 + Supabase PGVector

**Why both?**

**Mem0 (Primary)**:
- Flexible memory retrieval
- Conversational context
- Learns from user feedback
- Scoped by user_id + cartridge_id
- Enables BOTH approaches:
  - System prompts (baked into agent)
  - Swappable modules (loaded dynamically)

**Supabase PGVector (Secondary)**:
- Semantic search ("find cartridge like X")
- Backup/redundancy
- Relational queries ("all cartridges for client Y")
- Embedding storage for Mem0

### Integration Flow

```
User: "Work on campaign for Rachel (Retirementality)"
   ↓
AgentKit Campaign Manager Agent
   ↓
1. Extract context: client_name = "Rachel", project = "Retirementality"
   ↓
2. Mem0 retrieval: get_memories(user_id, filters={"client": "Rachel"})
   ↓
3. Load cartridge: persona, writing_style, industry_knowledge
   ↓
4. Apply to system prompt: "You are an Executive Coach targeting financial advisors..."
   ↓
5. Generate content: Post/DM/Email using loaded cartridge context
   ↓
6. User feedback: Approve/Edit content
   ↓
7. Update Mem0: Store feedback as new memory
   ↓
8. Next generation: Retrieves updated context automatically
```

## Cartridge Schema

### TypeScript Definition

```typescript
interface Cartridge {
  // Identity
  cartridge_id: string;          // UUID
  name: string;                  // "Retirementality Executive Coach"
  client_id: string;             // Link to Supabase clients table
  user_id: string;               // Multi-tenant isolation
  
  // Persona
  persona: {
    role: string;                // "Executive Coach", "Startup Founder", "B2B SaaS CEO"
    expertise: string[];         // ["Leadership", "Financial Planning", "Retirement"]
    target_audience: string;     // "Financial advisors 40-60 years old"
    authority_level: 1-10;       // How authoritative vs humble
    storytelling_preference: "data-driven" | "anecdotal" | "mixed";
  };
  
  // Writing Style
  writing_style: {
    tone: "professional" | "casual" | "authoritative" | "friendly";
    vocabulary_level: 1-10;      // 1=simple, 10=complex
    sentence_structure: "short" | "medium" | "long" | "mixed";
    paragraph_length: number;    // Average sentences per paragraph
    use_emojis: boolean;
    use_questions: boolean;      // Engage with rhetorical questions?
    call_to_action_style: "direct" | "soft" | "story-based";
    formatting_preferences: {
      bullet_points: boolean;
      numbered_lists: boolean;
      bold_emphasis: boolean;
      line_breaks_for_impact: boolean;
    };
  };
  
  // Industry Knowledge
  industry_knowledge: {
    niche: string;               // "Financial advisory for retirement planning"
    key_topics: string[];        // ["401k optimization", "Tax-efficient withdrawal"]
    common_pain_points: string[]; // ["Clients not saving enough", "Market volatility fears"]
    solution_frameworks: string[]; // ["4% rule", "Bucket strategy"]
    competitors: string[];       // Accounts to monitor
    influencers: string[];       // Thought leaders in space
  };
  
  // Tool Access
  tools_enabled: {
    mcp_servers: string[];       // ["apollo", "canva", "context7"]
    unipile_accounts: string[];  // LinkedIn accounts this cartridge can use
    instantly_campaigns: string[]; // Pre-configured email sequences
  };
  
  // Generated Assets
  system_prompt: string;         // Auto-generated from above fields
  
  // Examples (for few-shot learning)
  examples: {
    posts: ContentExample[];
    dms: ContentExample[];
    emails: ContentExample[];
  };
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  version: number;               // Increment on updates
  active: boolean;               // Can be disabled without deleting
}

interface ContentExample {
  content: string;
  performance: {
    engagement_rate?: number;
    reply_rate?: number;
    conversion_rate?: number;
  };
  user_rating: 1-5;              // Human feedback
  created_at: Date;
}
```

### Database Schema (Supabase)

```sql
CREATE TABLE cartridges (
  cartridge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- JSON columns for flexibility
  persona JSONB NOT NULL,
  writing_style JSONB NOT NULL,
  industry_knowledge JSONB NOT NULL,
  tools_enabled JSONB NOT NULL,
  
  system_prompt TEXT NOT NULL,
  examples JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  
  -- RLS
  CONSTRAINT cartridges_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users(id)
);

-- Vector embeddings for semantic search
CREATE TABLE cartridge_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cartridge_id UUID REFERENCES cartridges(cartridge_id) ON DELETE CASCADE,
  embedding_type TEXT NOT NULL, -- 'persona', 'writing_style', 'full_cartridge'
  content TEXT NOT NULL,        -- Original text that was embedded
  embedding VECTOR(1536) NOT NULL, -- OpenAI text-embedding-3-small
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX cartridge_embeddings_vector_idx 
  ON cartridge_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS Policies
CREATE POLICY "Users see own cartridges"
  ON cartridges FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own cartridges"
  ON cartridges FOR ALL
  USING (user_id = auth.uid());
```

## Default Cartridges (Pre-Built)

### 1. Executive Coach

```typescript
const executiveCoachCartridge: Cartridge = {
  name: "Executive Coach - Leadership Development",
  persona: {
    role: "Executive Coach",
    expertise: ["Leadership", "Team Building", "Executive Presence"],
    target_audience: "C-suite executives and senior managers",
    authority_level: 8,
    storytelling_preference: "mixed"
  },
  writing_style: {
    tone: "authoritative",
    vocabulary_level: 8,
    sentence_structure: "medium",
    paragraph_length: 3,
    use_emojis: false,
    use_questions: true,
    call_to_action_style: "soft",
    formatting_preferences: {
      bullet_points: true,
      numbered_lists: true,
      bold_emphasis: true,
      line_breaks_for_impact: true
    }
  },
  industry_knowledge: {
    niche: "Executive coaching and leadership development",
    key_topics: [
      "Strategic thinking",
      "Emotional intelligence",
      "Difficult conversations",
      "Executive presence"
    ],
    common_pain_points: [
      "Imposter syndrome at senior levels",
      "Work-life integration",
      "Leading through change",
      "Developing next-gen leaders"
    ],
    solution_frameworks: [
      "GROW model (Goal, Reality, Options, Will)",
      "Situational Leadership",
      "Emotional Intelligence framework"
    ]
  }
};
```

### 2. Startup Founder

```typescript
const startupFounderCartridge: Cartridge = {
  name: "Startup Founder - B2B SaaS",
  persona: {
    role: "Startup Founder",
    expertise: ["Product-Market Fit", "Fundraising", "Growth Hacking"],
    target_audience: "First-time founders and early-stage startup teams",
    authority_level: 6,
    storytelling_preference: "anecdotal"
  },
  writing_style: {
    tone: "casual",
    vocabulary_level: 6,
    sentence_structure: "short",
    paragraph_length: 2,
    use_emojis: true,
    use_questions: true,
    call_to_action_style: "direct",
    formatting_preferences: {
      bullet_points: true,
      numbered_lists: false,
      bold_emphasis: false,
      line_breaks_for_impact: true
    }
  },
  industry_knowledge: {
    niche: "B2B SaaS startup growth and fundraising",
    key_topics: [
      "Product-market fit validation",
      "Customer acquisition cost (CAC)",
      "Monthly recurring revenue (MRR)",
      "Pitch deck optimization"
    ],
    common_pain_points: [
      "Can't find first 10 customers",
      "Churn is too high",
      "VCs not responding",
      "Co-founder conflict"
    ],
    solution_frameworks: [
      "Jobs-to-be-done framework",
      "North Star Metric",
      "T2D3 (Triple, Triple, Double, Double, Double)"
    ]
  }
};
```

### 3. B2B Sales Expert

```typescript
const b2bSalesCartridge: Cartridge = {
  name: "B2B Sales Expert - Enterprise",
  persona: {
    role: "B2B Sales Consultant",
    expertise: ["Enterprise Sales", "Consultative Selling", "Deal Closing"],
    target_audience: "B2B sales reps and sales managers",
    authority_level: 7,
    storytelling_preference: "data-driven"
  },
  writing_style: {
    tone: "professional",
    vocabulary_level: 7,
    sentence_structure: "medium",
    paragraph_length: 3,
    use_emojis: false,
    use_questions: false,
    call_to_action_style: "direct",
    formatting_preferences: {
      bullet_points: true,
      numbered_lists: true,
      bold_emphasis: true,
      line_breaks_for_impact: false
    }
  },
  industry_knowledge: {
    niche: "Enterprise B2B sales and deal closing",
    key_topics: [
      "MEDDIC qualification",
      "Multi-threading deals",
      "Champion identification",
      "ROI calculators"
    ],
    common_pain_points: [
      "Long sales cycles (9-12 months)",
      "Procurement roadblocks",
      "Champion leaves mid-deal",
      "Competitors undercutting on price"
    ],
    solution_frameworks: [
      "MEDDIC (Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion)",
      "Challenger Sale methodology",
      "SPIN Selling (Situation, Problem, Implication, Need-Payoff)"
    ]
  }
};
```

## Cartridge Operations

### Creating a New Cartridge

**Via AgentKit:**

```
User: "Create a new cartridge for my client Sarah. She's a business coach targeting women entrepreneurs in e-commerce."

AgentKit Campaign Manager:
1. Extract context: client=Sarah, niche=business coaching, audience=women entrepreneurs in e-commerce
2. Generate cartridge using Context7 MCP (research niche)
3. Create initial persona/writing_style/industry_knowledge
4. Store in Mem0 + Supabase
5. Generate system prompt
6. Return: "Created cartridge 'Sarah - E-commerce Coach'. Ready to generate content."
```

**Via API (for bulk import):**

```typescript
import { createClient } from '@supabase/supabase-js';
import { Memory } from 'mem0ai';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const mem0 = new Memory({ apiKey: MEM0_API_KEY });

async function createCartridge(userId: string, clientId: string, config: Partial<Cartridge>) {
  // 1. Generate system prompt
  const systemPrompt = generateSystemPrompt(config);
  
  // 2. Insert into Supabase
  const { data: cartridge, error } = await supabase
    .from('cartridges')
    .insert({
      user_id: userId,
      client_id: clientId,
      name: config.name,
      persona: config.persona,
      writing_style: config.writing_style,
      industry_knowledge: config.industry_knowledge,
      tools_enabled: config.tools_enabled,
      system_prompt: systemPrompt
    })
    .select()
    .single();
  
  // 3. Store in Mem0
  await mem0.add({
    messages: [{ role: "system", content: systemPrompt }],
    user_id: userId,
    metadata: {
      cartridge_id: cartridge.cartridge_id,
      client_id: clientId,
      type: "cartridge"
    }
  });
  
  // 4. Generate embeddings
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: JSON.stringify(config.persona) + JSON.stringify(config.writing_style)
  });
  
  await supabase.from('cartridge_embeddings').insert({
    cartridge_id: cartridge.cartridge_id,
    embedding_type: 'full_cartridge',
    content: systemPrompt,
    embedding: embedding.data[0].embedding
  });
  
  return cartridge;
}

function generateSystemPrompt(config: Partial<Cartridge>): string {
  return `You are a ${config.persona.role} with expertise in ${config.persona.expertise.join(', ')}.

Target Audience: ${config.persona.target_audience}

Writing Style:
- Tone: ${config.writing_style.tone}
- Sentence structure: ${config.writing_style.sentence_structure}
- Use emojis: ${config.writing_style.use_emojis ? 'Yes' : 'No'}
- Call-to-action style: ${config.writing_style.call_to_action_style}

Industry Context:
Niche: ${config.industry_knowledge.niche}

Key topics you write about:
${config.industry_knowledge.key_topics.map(t => `- ${t}`).join('\n')}

Common pain points your audience faces:
${config.industry_knowledge.common_pain_points.map(p => `- ${p}`).join('\n')}

Frameworks you reference:
${config.industry_knowledge.solution_frameworks.map(f => `- ${f}`).join('\n')}

When generating content, always:
1. Match the tone and style defined above
2. Address the target audience's pain points
3. Reference relevant frameworks when applicable
4. End with a ${config.writing_style.call_to_action_style} call-to-action
`;
}
```

### Loading a Cartridge (AgentKit)

**Agent Builder Workflow:**

```
1. Ask User: "Which client are you working with?"
   ↓
2. Extract: client_name from user response
   ↓
3. Call Function: search_cartridges(client_name)
   ↓
4. File Search (Mem0): Retrieve cartridge memories
   ↓
5. Apply Context: Load system_prompt into agent
   ↓
6. Generate Text: Use cartridge context for content
```

**Supabase Function:**

```typescript
async function search_cartridges(clientName: string, userId: string) {
  // Search Supabase for matching cartridges
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', `%${clientName}%`)
    .single();
  
  const { data: cartridge } = await supabase
    .from('cartridges')
    .select('*')
    .eq('client_id', client.id)
    .eq('active', true)
    .single();
  
  // Also retrieve from Mem0 for conversational context
  const memories = await mem0.search({
    query: clientName,
    user_id: userId,
    filters: { type: "cartridge", client_id: client.id }
  });
  
  return {
    cartridge,
    memories: memories.results
  };
}
```

### Updating Cartridge from Feedback

**Learning Loop:**

```
User approves post → Store as positive example
User edits post → Store edit as learning signal
User rejects post → Store as negative example

Mem0 automatically:
1. Creates memory of feedback
2. Retrieves similar past feedback
3. Adjusts future generations based on patterns
```

**Implementation:**

```typescript
async function updateCartridgeFromFeedback(
  cartridgeId: string,
  userId: string,
  content: string,
  feedback: 'approved' | 'edited' | 'rejected',
  edits?: string
) {
  // Store in Mem0
  await mem0.add({
    messages: [
      { role: "assistant", content: content },
      { role: "user", content: feedback === 'approved' 
        ? "This is perfect, use this style." 
        : `Please adjust: ${edits}` }
    ],
    user_id: userId,
    metadata: {
      cartridge_id: cartridgeId,
      feedback_type: feedback,
      type: "learning_signal"
    }
  });
  
  // If approved, add to examples in Supabase
  if (feedback === 'approved') {
    const { data: cartridge } = await supabase
      .from('cartridges')
      .select('examples')
      .eq('cartridge_id', cartridgeId)
      .single();
    
    const updatedExamples = [
      ...cartridge.examples,
      {
        content,
        user_rating: 5,
        created_at: new Date()
      }
    ];
    
    await supabase
      .from('cartridges')
      .update({ 
        examples: updatedExamples,
        version: cartridge.version + 1,
        updated_at: new Date()
      })
      .eq('cartridge_id', cartridgeId);
  }
}
```

## Semantic Search

### Find Similar Cartridges

**Use case**: "Create cartridge like my Executive Coach one, but for tech CEOs"

```sql
CREATE FUNCTION find_similar_cartridges(
  query_embedding VECTOR(1536),
  user_id_param UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  cartridge_id UUID,
  name TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.cartridge_id,
    c.name,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM cartridge_embeddings ce
  JOIN cartridges c ON ce.cartridge_id = c.cartridge_id
  WHERE c.user_id = user_id_param
    AND c.active = TRUE
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## Integration with AgentKit

### Agent Builder Configuration

**Tool Definition:**

```json
{
  "name": "load_cartridge",
  "description": "Load client cartridge (persona, writing style, industry knowledge) into agent context",
  "parameters": {
    "type": "object",
    "properties": {
      "client_name": {
        "type": "string",
        "description": "Name of the client to load cartridge for"
      }
    },
    "required": ["client_name"]
  },
  "endpoint": "https://[supabase-url]/functions/v1/load-cartridge"
}
```

**Workflow:**

```
Agent Builder Visual Workflow:

[Ask User] "Which client?" 
    ↓
[Call Function] load_cartridge(client_name)
    ↓
[File Search] Retrieve from Mem0
    ↓
[Generate Text] Create content with cartridge context
    ↓
[Ask User] "Approve this content?"
    ↓
If Yes → [Call Function] post_to_linkedin(content)
    ↓
If No → [Loop] Regenerate with feedback
```

## Testing Cartridges

### Unit Test Example

```typescript
import { generateSystemPrompt } from './cartridge';

test('Executive Coach cartridge generates appropriate system prompt', () => {
  const cartridge = executiveCoachCartridge;
  const prompt = generateSystemPrompt(cartridge);
  
  expect(prompt).toContain('Executive Coach');
  expect(prompt).toContain('authoritative');
  expect(prompt).toContain('C-suite executives');
  expect(prompt).not.toContain('emoji');
});

test('Startup Founder cartridge uses casual tone', () => {
  const cartridge = startupFounderCartridge;
  const prompt = generateSystemPrompt(cartridge);
  
  expect(prompt).toContain('casual');
  expect(prompt).toContain('Use emojis: Yes');
  expect(prompt).toContain('Product-market fit');
});
```

### A/B Testing

**Test different cartridge variations:**

```typescript
const cartridgeA = { ...baseCartridge, writing_style: { ...baseCartridge.writing_style, tone: 'professional' } };
const cartridgeB = { ...baseCartridge, writing_style: { ...baseCartridge.writing_style, tone: 'casual' } };

// Generate 10 posts with each
const postsA = await generatePosts(cartridgeA, 10);
const postsB = await generatePosts(cartridgeB, 10);

// Track engagement
const resultsA = await trackEngagement(postsA, '7 days');
const resultsB = await trackEngagement(postsB, '7 days');

// Winner becomes new default
if (resultsB.avg_engagement > resultsA.avg_engagement) {
  await updateCartridge(cartridgeId, { writing_style: cartridgeB.writing_style });
}
```

## Best Practices

1. **Start with defaults** - Use pre-built cartridges, customize later
2. **Learn from feedback** - Always update Mem0 with user approvals/edits
3. **Version cartridges** - Increment version on major changes
4. **A/B test styles** - Try variations, track performance
5. **Keep examples** - Store high-performing content as examples
6. **Semantic search** - Use PGVector to find similar successful cartridges
7. **Multi-tenant isolation** - Always filter by user_id

## Next Steps

See companion documents:
1. **Technical Architecture v3** - How cartridges fit into overall system
2. **Lead Magnet Library** - How cartridges influence content selection
3. **Content Generation Workflow** - AgentKit using cartridges step-by-step