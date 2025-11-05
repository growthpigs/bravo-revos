# Lead Magnet Library & Content Pipeline

## Core Principle

> **"Clients never have to make their own lead magnets"**

RevOS provides a curated library of pre-built lead magnets. AgentKit helps clients choose the best one based on:
- Their niche (from cartridge)
- Target audience pain points
- Campaign goals
- Past performance data

If customization is needed, AgentKit generates it automatically using Context7 + Canva MCPs.

## Library Structure

### Categories

```
lead_magnets/
├── checklists/
│   ├── executive-coaching/
│   │   ├── new-manager-90-day-checklist.pdf
│   │   ├── difficult-conversation-prep.pdf
│   │   └── annual-strategy-review.pdf
│   ├── startup-founders/
│   │   ├── product-launch-checklist.pdf
│   │   ├── fundraising-readiness-audit.pdf
│   │   └── mvp-validation-framework.pdf
│   └── b2b-sales/
│       ├── discovery-call-script.pdf
│       ├── enterprise-deal-qualification.pdf
│       └── objection-handling-guide.pdf
├── templates/
│   ├── executive-coaching/
│   │   ├── 1-on-1-meeting-template.pdf
│   │   ├── leadership-vision-canvas.pdf
│   │   └── 360-feedback-framework.pdf
│   ├── startup-founders/
│   │   ├── pitch-deck-template.pptx
│   │   ├── financial-model-template.xlsx
│   │   └── okr-planning-template.pdf
│   └── b2b-sales/
│       ├── roi-calculator.xlsx
│       ├── proposal-template.pdf
│       └── business-case-template.docx
├── guides/
│   ├── executive-coaching/
│   │   ├── 5-conversations-every-leader-must-have.pdf
│   │   ├── building-high-trust-teams.pdf
│   │   └── executive-presence-playbook.pdf
│   ├── startup-founders/
│   │   ├── first-10-customers-playbook.pdf
│   │   ├── saas-metrics-explained.pdf
│   │   └── fundraising-timeline-guide.pdf
│   └── b2b-sales/
│       ├── enterprise-sales-process-guide.pdf
│       ├── champion-building-strategies.pdf
│       └── procurement-navigation-guide.pdf
└── assessments/
    ├── executive-coaching/
    │   ├── leadership-style-assessment.pdf
    │   ├── team-health-scorecard.pdf
    │   └── executive-readiness-audit.pdf
    ├── startup-founders/
    │   ├── product-market-fit-scorecard.pdf
    │   ├── founder-readiness-quiz.pdf
    │   └── go-to-market-readiness.pdf
    └── b2b-sales/
        ├── sales-process-maturity-assessment.pdf
        ├── deal-health-scorecard.pdf
        └── sales-skills-gap-analysis.pdf
```

### Database Schema

```sql
CREATE TABLE lead_magnets (
  lead_magnet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identity
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- 'checklist', 'template', 'guide', 'assessment'
  niche TEXT NOT NULL,    -- 'executive-coaching', 'startup-founders', 'b2b-sales'
  
  -- Content
  description TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_type TEXT NOT NULL, -- 'pdf', 'xlsx', 'pptx', 'docx'
  thumbnail_url TEXT,     -- Preview image
  
  -- Metadata
  target_audience TEXT NOT NULL,
  pain_points TEXT[] NOT NULL,
  ideal_for TEXT[] NOT NULL, -- Use cases
  keywords TEXT[] NOT NULL,  -- For semantic search
  
  -- Performance tracking
  download_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4), -- % who download then book call
  avg_rating DECIMAL(3,2),
  
  -- AI generation info (if customized)
  is_custom BOOLEAN DEFAULT FALSE,
  generated_from_template UUID REFERENCES lead_magnets(lead_magnet_id),
  generation_prompt TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- Vector embeddings for semantic search
CREATE TABLE lead_magnet_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_magnet_id UUID REFERENCES lead_magnets(lead_magnet_id) ON DELETE CASCADE,
  content TEXT NOT NULL,      -- description + pain_points + keywords
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX lead_magnet_embeddings_vector_idx 
  ON lead_magnet_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Track which lead magnets are used in campaigns
CREATE TABLE campaign_lead_magnets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_magnet_id UUID REFERENCES lead_magnets(lead_magnet_id) ON DELETE CASCADE,
  
  -- Performance per campaign
  sends INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0, -- Booked calls
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## AgentKit Lead Magnet Selection

### Workflow

```
User: "I need a lead magnet for my executive coaching campaign targeting new VPs"
    ↓
AgentKit Campaign Manager:
    ↓
1. Load cartridge (Executive Coach persona)
    ↓
2. Extract context:
   - Niche: executive-coaching
   - Audience: new VPs
   - Pain points: [from cartridge industry_knowledge]
    ↓
3. Semantic search lead magnets:
   Query: "new VP leadership transition executive coaching"
    ↓
4. Call Function: search_lead_magnets(query, niche, top_k=5)
    ↓
5. Return top 5 matches with:
   - Title
   - Description
   - Past performance (conversion rate)
   - Why it's a good fit
    ↓
6. Ask User: "I found these 5 lead magnets. Which one?"
   [Display with thumbnails + conversion rates]
    ↓
7. User selects OR requests customization
    ↓
If selected → Use existing lead magnet
If customize → Generate new version (see below)
```

### Search Function

```typescript
import { openai } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function searchLeadMagnets(
  query: string,
  niche: string,
  topK: number = 5
) {
  // 1. Generate query embedding
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });
  
  // 2. Semantic search + niche filter
  const { data: results } = await supabase.rpc('search_lead_magnets', {
    query_embedding: embedding.data[0].embedding,
    niche_filter: niche,
    match_count: topK
  });
  
  // 3. Rank by: similarity (70%) + past performance (30%)
  const ranked = results.map(r => ({
    ...r,
    score: (r.similarity * 0.7) + (r.conversion_rate * 0.3)
  })).sort((a, b) => b.score - a.score);
  
  return ranked;
}
```

```sql
CREATE FUNCTION search_lead_magnets(
  query_embedding VECTOR(1536),
  niche_filter TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  lead_magnet_id UUID,
  title TEXT,
  description TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  conversion_rate DECIMAL,
  download_count INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lm.lead_magnet_id,
    lm.title,
    lm.description,
    lm.file_url,
    lm.thumbnail_url,
    lm.conversion_rate,
    lm.download_count,
    1 - (lme.embedding <=> query_embedding) AS similarity
  FROM lead_magnet_embeddings lme
  JOIN lead_magnets lm ON lme.lead_magnet_id = lm.lead_magnet_id
  WHERE lm.niche = niche_filter
    AND lm.active = TRUE
  ORDER BY lme.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## Content Generation Pipeline

### When to Generate Custom Lead Magnets

**User requests:**
- "Can you customize this for my specific audience?"
- "I need this but for tech startups, not general startups"
- "Create a new version with my branding"

### Generation Workflow (AgentKit + MCPs)

```
User: "Customize the 'New Manager 90-Day Checklist' for CTOs at Series A startups"
    ↓
AgentKit Content Generation Agent:
    ↓
1. Load cartridge (Startup Founder persona)
    ↓
2. Retrieve template lead magnet
    ↓
3. Call Context7 MCP:
   "Research: Common challenges for CTOs at Series A startups in first 90 days"
    ↓
4. Context7 returns:
   - Building engineering team (5→15 engineers)
   - Setting up dev processes
   - Tech debt vs new features
   - Aligning with product roadmap
    ↓
5. Generate customized content (GPT-4o):
   System: [Cartridge system prompt]
   User: "Create 90-day CTO checklist for Series A, covering: [Context7 findings]"
    ↓
6. GPT-4o generates:
   - Week 1-2: Team assessment
   - Week 3-4: Process setup
   - Week 5-8: Tech debt audit
   - Week 9-12: Roadmap alignment
    ↓
7. Call Canva MCP:
   "Create professional PDF with:
   - Title: 'The New CTO's 90-Day Plan'
   - Sections: [generated content]
   - Branding: [from cartridge]
   - Style: Professional, tech-focused"
    ↓
8. Canva generates PDF
    ↓
9. Upload to Supabase Storage
    ↓
10. Create database record:
    - is_custom = TRUE
    - generated_from_template = [original template ID]
    - generation_prompt = [stored for versioning]
    ↓
11. Ask User: "Here's your custom lead magnet. Approve?"
    [Display preview]
    ↓
If Yes → Save to library + associate with campaign
If No → Regenerate with feedback
```

### Content Generation Function

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { context7, canva } from './mcp-clients';

async function generateCustomLeadMagnet(
  templateId: string,
  cartridgeId: string,
  customization: string
) {
  // 1. Load template + cartridge
  const template = await supabase
    .from('lead_magnets')
    .select('*')
    .eq('lead_magnet_id', templateId)
    .single();
  
  const cartridge = await supabase
    .from('cartridges')
    .select('*')
    .eq('cartridge_id', cartridgeId)
    .single();
  
  // 2. Research via Context7 MCP
  const research = await context7.search({
    query: `${customization} ${cartridge.industry_knowledge.niche}`,
    sources: ['industry_reports', 'best_practices', 'case_studies'],
    max_results: 10
  });
  
  // 3. Generate content
  const { text: content } = await generateText({
    model: openai('gpt-4o'),
    system: cartridge.system_prompt,
    prompt: `Create a ${template.category} titled "${template.title}" customized for: ${customization}.

Base it on this template:
${template.description}

Incorporate these research findings:
${research.results.map(r => r.summary).join('\n\n')}

Target audience pain points:
${cartridge.industry_knowledge.common_pain_points.join('\n')}

Format as a structured document with clear sections, actionable steps, and examples.`
  });
  
  // 4. Design via Canva MCP
  const pdf = await canva.createDocument({
    template: 'professional_guide',
    title: template.title,
    content: content,
    branding: {
      color_scheme: cartridge.writing_style.color_preferences || 'professional_blue',
      font_family: 'Inter',
      logo_url: cartridge.logo_url
    },
    format: 'pdf'
  });
  
  // 5. Upload to Supabase Storage
  const fileName = `${slugify(template.title)}-${Date.now()}.pdf`;
  const { data: uploadData } = await supabase.storage
    .from('lead-magnets')
    .upload(fileName, pdf.buffer, {
      contentType: 'application/pdf',
      cacheControl: '3600'
    });
  
  const publicUrl = supabase.storage
    .from('lead-magnets')
    .getPublicUrl(fileName).data.publicUrl;
  
  // 6. Create database record
  const { data: newLeadMagnet } = await supabase
    .from('lead_magnets')
    .insert({
      title: template.title,
      slug: slugify(template.title) + '-custom-' + Date.now(),
      category: template.category,
      niche: cartridge.industry_knowledge.niche,
      description: `Customized version: ${customization}`,
      file_url: publicUrl,
      file_type: 'pdf',
      target_audience: customization,
      pain_points: cartridge.industry_knowledge.common_pain_points,
      ideal_for: [customization],
      keywords: extractKeywords(content),
      is_custom: true,
      generated_from_template: templateId,
      generation_prompt: customization
    })
    .select()
    .single();
  
  // 7. Generate embedding
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: `${newLeadMagnet.title} ${newLeadMagnet.description} ${newLeadMagnet.pain_points.join(' ')}`
  });
  
  await supabase.from('lead_magnet_embeddings').insert({
    lead_magnet_id: newLeadMagnet.lead_magnet_id,
    content: content,
    embedding: embedding.data[0].embedding
  });
  
  return newLeadMagnet;
}
```

## Delivery Mechanisms

### Option 1: Direct Send (DM/Email)

**Best for**: Warm leads, existing conversations

```
DM message:
"Hey [Name], 

Saw your comment about [topic]. I created a guide specifically for [their situation]:

[Lead Magnet Title]

Want me to send it over? 🚀"

[If they reply yes]

AgentKit → Send file directly via Unipile DM attachment
```

### Option 2: Landing Page

**Best for**: Cold outreach, email sequences

```
DM/Email message:
"Hey [Name],

Based on your LinkedIn activity, I think you'd find this useful:

[Landing Page URL]

Grab your free copy → takes 30 seconds."

Landing Page (Bolt.new generated):
- Hero: Lead magnet preview image
- Headline: Value proposition
- Form: Name + Email
- CTA: "Download Now"

On submit:
1. Capture email → Supabase
2. Send download link via email (Instantly)
3. Trigger follow-up sequence
4. Track conversion (PostHog)
```

### Option 3: LinkedIn Article (No Gate)

**Best for**: Thought leadership, SEO

```
AgentKit publishes lead magnet content as LinkedIn article
→ No email capture
→ CTA at end: "Want the PDF version? Comment 'SEND' below"
→ AgentKit monitors comments
→ Sends DM with PDF to commenters
```

## Performance Tracking

### Metrics per Lead Magnet

```sql
CREATE VIEW lead_magnet_performance AS
SELECT 
  lm.lead_magnet_id,
  lm.title,
  lm.category,
  lm.niche,
  COUNT(DISTINCT clm.campaign_id) AS campaigns_used,
  SUM(clm.sends) AS total_sends,
  SUM(clm.downloads) AS total_downloads,
  SUM(clm.conversions) AS total_conversions,
  CASE 
    WHEN SUM(clm.sends) > 0 
    THEN (SUM(clm.downloads)::DECIMAL / SUM(clm.sends)) 
    ELSE 0 
  END AS download_rate,
  CASE 
    WHEN SUM(clm.downloads) > 0 
    THEN (SUM(clm.conversions)::DECIMAL / SUM(clm.downloads)) 
    ELSE 0 
  END AS conversion_rate
FROM lead_magnets lm
LEFT JOIN campaign_lead_magnets clm ON lm.lead_magnet_id = clm.lead_magnet_id
GROUP BY lm.lead_magnet_id, lm.title, lm.category, lm.niche;
```

### Dashboard (Bolt.new generated)

```typescript
interface LeadMagnetDashboard {
  overview: {
    total_lead_magnets: number;
    total_downloads_this_month: number;
    avg_conversion_rate: number;
    top_performing_category: string;
  };
  top_performers: LeadMagnet[];
  recent_generations: LeadMagnet[];
  recommendations: {
    lead_magnet_id: string;
    title: string;
    reason: string; // "High conversion rate in your niche"
  }[];
}
```

## Human Override (Content Only)

### When Humans Can Intervene

**Content creation:**
- ✅ Write own lead magnet from scratch
- ✅ Edit AI-generated lead magnet
- ✅ Approve/reject AI suggestions

**NOT allowed to override:**
- ❌ Scraping logic
- ❌ Enrichment process
- ❌ DM sending (handled by queue)

### Approval Workflow

```
AgentKit generates lead magnet
    ↓
Post to Slack channel: #client-[name]-approval
    ↓
Slack message:
  "Generated new lead magnet:
  📝 Title: [title]
  🎯 For: [customization]
  📄 Preview: [thumbnail]
  
  React to approve:
  ✅ Approve (use as-is)
  ✏️ Edit (provide feedback)
  ❌ Reject (regenerate)"
    ↓
User reacts:
  ✅ → Save to library + use in campaign
  ✏️ → AgentKit: "What changes?"
  ❌ → AgentKit: "What didn't work?"
```

## Library Management

### Adding New Templates (Manual)

**For RevOS team to expand library:**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addLeadMagnetTemplate(
  title: string,
  category: string,
  niche: string,
  filePath: string
) {
  // 1. Upload file to Supabase Storage
  const fileBuffer = await fs.readFile(filePath);
  const fileName = path.basename(filePath);
  
  const { data: uploadData } = await supabase.storage
    .from('lead-magnets')
    .upload(`templates/${niche}/${fileName}`, fileBuffer);
  
  const publicUrl = supabase.storage
    .from('lead-magnets')
    .getPublicUrl(`templates/${niche}/${fileName}`).data.publicUrl;
  
  // 2. Generate thumbnail (Canva MCP)
  const thumbnail = await canva.generateThumbnail({
    source_pdf: publicUrl,
    size: '400x300'
  });
  
  // 3. Extract keywords (GPT-4o)
  const { text: keywords } = await generateText({
    model: openai('gpt-4o'),
    prompt: `Extract 10 keywords from this lead magnet title and description:
Title: ${title}
Category: ${category}
Niche: ${niche}

Return as JSON array.`
  });
  
  // 4. Create database record
  const { data: leadMagnet } = await supabase
    .from('lead_magnets')
    .insert({
      title,
      slug: slugify(title),
      category,
      niche,
      description: `[Manually add description]`,
      file_url: publicUrl,
      file_type: path.extname(fileName).slice(1),
      thumbnail_url: thumbnail.url,
      target_audience: `[Manually add]`,
      pain_points: [],
      ideal_for: [],
      keywords: JSON.parse(keywords)
    })
    .select()
    .single();
  
  console.log(`✅ Added: ${leadMagnet.title}`);
}
```

## Best Practices

1. **Start with library** - Always search existing before generating
2. **Track performance** - Update conversion_rate after campaigns
3. **A/B test variations** - Test different lead magnets for same niche
4. **Version custom magnets** - Store generation_prompt for reproducibility
5. **Semantic search** - Use pain points + keywords for better matches
6. **Human approval** - Content only, automate the rest
7. **Update embeddings** - Re-embed when lead magnet is edited

## Next Steps

See companion documents:
1. **Cartridge System** - How cartridges influence lead magnet selection
2. **MVP Feature Specification** - Lead magnet delivery workflows
3. **MCP Integration Guide** - Context7 + Canva setup