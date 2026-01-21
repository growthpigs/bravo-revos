# RevOS Data Model

## Database: Supabase PostgreSQL + PGVector

---

## Core Tables

### users
Multi-tenant isolation via RLS.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (Supabase Auth) |
| email | text | User email |
| role | text | 'client' or 'super_admin' |
| created_at | timestamp | Account creation |
| updated_at | timestamp | Last update |

### cartridges
Voice/persona definitions for content generation.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| name | text | Cartridge name |
| persona | jsonb | Role, expertise, target audience |
| writing_style | jsonb | Tone, vocabulary, structure |
| industry_knowledge | jsonb | Niche, topics, pain points |
| tools_enabled | text[] | Allowed MCP tools |
| system_prompt | text | Generated system prompt |
| examples | jsonb | Sample posts, DMs, emails |
| is_default | boolean | One of 3 starter cartridges |
| created_at | timestamp | Creation date |

### campaigns
LinkedIn outreach campaigns.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| cartridge_id | uuid | FK to cartridges |
| name | text | Campaign name |
| linkedin_post_url | text | Source post URL |
| status | text | 'active', 'paused', 'completed' |
| settings | jsonb | Rate limits, timing, etc. |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update |

### leads
Scraped and enriched prospects.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| campaign_id | uuid | FK to campaigns |
| linkedin_profile_url | text | Unique per campaign |
| name | text | Full name |
| comment_text | text | Original comment |
| commented_at | timestamp | When they commented |
| status | text | 'scraped', 'enriched', 'contacted', 'replied' |
| enrichment_status | text | 'pending', 'enriched', 'partial', 'failed' |
| email | text | From Apollo |
| company_name | text | From Apollo |
| job_title | text | From Apollo |
| company_size | text | From Apollo |
| dm_status | text | 'pending', 'sent', 'delivered', 'replied' |
| dm_sent_at | timestamp | When DM was sent |
| dm_replied_at | timestamp | When reply received |
| email_status | text | 'queued', 'sent', 'opened', 'clicked', 'replied' |
| email_campaign_id | text | Instantly campaign ID |
| created_at | timestamp | Creation date |

### messages
DM and email content.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| lead_id | uuid | FK to leads |
| channel | text | 'dm' or 'email' |
| content | text | Message body |
| subject | text | Email subject (null for DM) |
| status | text | 'draft', 'approved', 'sent', 'failed' |
| sent_at | timestamp | When sent |
| approved_by | uuid | FK to users (for approval flow) |
| created_at | timestamp | Creation date |

### lead_magnets
Content library for offers.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users (null = global) |
| title | text | Lead magnet title |
| description | text | What it's about |
| niche | text | Target industry |
| file_url | text | Supabase Storage URL |
| download_count | integer | Performance tracking |
| conversion_rate | decimal | Downloads → replies |
| is_custom | boolean | User-generated vs library |
| created_at | timestamp | Creation date |

### posts
LinkedIn content.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| cartridge_id | uuid | FK to cartridges |
| content | text | Post body |
| image_url | text | Canva-generated image |
| status | text | 'draft', 'approved', 'published' |
| linkedin_post_id | text | After publishing |
| likes | integer | Engagement tracking |
| comments | integer | Engagement tracking |
| shares | integer | Engagement tracking |
| published_at | timestamp | When posted |
| created_at | timestamp | Creation date |

### apollo_usage
Billing tracking for enrichment credits.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| credits_used | integer | Credits consumed |
| result | text | 'success', 'partial', 'failed' |
| created_at | timestamp | When used |

---

## Vector Tables (PGVector)

### embeddings
Mem0 memory storage.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Scope by user |
| content | text | Original content |
| embedding | vector(1536) | OpenAI embedding |
| metadata | jsonb | Type, cartridge_id, etc. |
| created_at | timestamp | Creation date |

### lead_magnet_embeddings
Semantic search for lead magnets.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| lead_magnet_id | uuid | FK to lead_magnets |
| embedding | vector(1536) | Content embedding |
| created_at | timestamp | Creation date |

---

## RLS Policies

```sql
-- Users see only their own data
CREATE POLICY "Users see own campaigns"
  ON campaigns FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users see own leads"
  ON leads FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  ));

-- Super admins see everything
CREATE POLICY "Super admins see all"
  ON campaigns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'super_admin'
  ));
```

---

*Last Updated: 2026-01-03*
*Source: archon-specs, docs/projects/bravo-revos/data-model.md*
