# Interface Specification Document - RevOS API Contracts & Schemas

**Version:** 1.0  
**Last Updated:** 2025-10-27  
**Status:** Planning  
**Owner:** Chase  

---

## Table of Contents

1. [Document Purpose](#document-purpose)
2. [REST API Endpoints](#rest-api-endpoints)
3. [AgentKit Tool Definitions](#agentkit-tool-definitions)
4. [Webhook Schemas](#webhook-schemas)
5. [Database Schema Consolidation](#database-schema-consolidation)
6. [PostHog Event Schema](#posthog-event-schema)
7. [MCP Integration Contracts](#mcp-integration-contracts)
8. [Error Codes & Messages](#error-codes--messages)
9. [Authentication & Authorization](#authentication--authorization)
10. [Rate Limiting & Quotas](#rate-limiting--quotas)

---

## 1. Document Purpose

This Interface Specification Document (ISD) defines **ALL** programmatic interfaces in the RevOS system:

- **REST API Endpoints** - Supabase Edge Functions called by UI and AgentKit
- **AgentKit Tools** - Functions AgentKit can call during orchestration
- **Webhook Schemas** - Payloads from Unipile, Instantly, Slack
- **Database Contracts** - Complete schema with constraints
- **Event Tracking** - PostHog analytics events
- **MCP Contracts** - Expected inputs/outputs for each MCP
- **Error Standards** - Consistent error handling across all layers

**Audience:**
- Frontend developers (Bolt.new prompts)
- AgentKit configurators (Agent Builder setup)
- MCP integrators (testing scripts)
- QA engineers (API testing)

---

## 2. REST API Endpoints

### 2.1 Authentication Endpoints

#### `POST /auth/login`
**Purpose:** Authenticate user with Supabase Auth  
**Authentication:** None (public endpoint)  
**Rate Limit:** 5 requests/minute per IP  

**Request:**
```json
{
  "email": "rachel@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "rachel@example.com",
    "role": "client",
    "client_id": "client-uuid"
  },
  "session": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "expires_at": 1730000000
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `429` - Too many login attempts
- `500` - Server error

---

#### `POST /auth/logout`
**Purpose:** Invalidate user session  
**Authentication:** Bearer token required  
**Rate Limit:** 10 requests/minute  

**Request:**
```json
{
  "refresh_token": "eyJhbGci..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 2.2 Campaign Management Endpoints

#### `POST /api/campaigns`
**Purpose:** Create new LinkedIn growth campaign  
**Authentication:** Bearer token (client or super_admin)  
**Rate Limit:** 20 requests/hour  

**Request:**
```json
{
  "name": "Executive Coaching Leads - Q4 2025",
  "target_post_url": "https://www.linkedin.com/posts/target-post-12345",
  "cartridge_id": "cart-uuid",
  "lead_magnet_id": "lm-uuid",
  "settings": {
    "dm_enabled": true,
    "dm_delay_minutes": 2,
    "email_enabled": true,
    "email_delay_hours": 48,
    "max_leads_per_day": 50
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "campaign": {
    "id": "camp-uuid",
    "name": "Executive Coaching Leads - Q4 2025",
    "status": "active",
    "created_at": "2025-10-27T10:00:00Z",
    "stats": {
      "leads_scraped": 0,
      "dms_sent": 0,
      "emails_sent": 0,
      "replies_received": 0
    }
  }
}
```

**Errors:**
- `400` - Invalid post URL or missing required fields
- `403` - User doesn't have permission
- `409` - Campaign with same post URL already exists
- `500` - Server error

---

#### `GET /api/campaigns`
**Purpose:** List all campaigns for authenticated user  
**Authentication:** Bearer token  
**Rate Limit:** 60 requests/minute  

**Query Params:**
- `status` (optional): `active`, `paused`, `completed`
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Results per page (default: 20, max: 100)

**Response (200 OK):**
```json
{
  "success": true,
  "campaigns": [
    {
      "id": "camp-uuid",
      "name": "Executive Coaching Leads - Q4 2025",
      "status": "active",
      "created_at": "2025-10-27T10:00:00Z",
      "stats": {
        "leads_scraped": 147,
        "dms_sent": 89,
        "emails_sent": 12,
        "replies_received": 23
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 3,
    "total_pages": 1
  }
}
```

---

#### `PATCH /api/campaigns/:id`
**Purpose:** Update campaign settings or status  
**Authentication:** Bearer token  
**Rate Limit:** 30 requests/hour  

**Request:**
```json
{
  "status": "paused",
  "settings": {
    "max_leads_per_day": 30
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "campaign": {
    "id": "camp-uuid",
    "status": "paused",
    "updated_at": "2025-10-27T11:00:00Z"
  }
}
```

---

### 2.3 Lead Management Endpoints

#### `GET /api/leads`
**Purpose:** List leads with filtering and search  
**Authentication:** Bearer token  
**Rate Limit:** 60 requests/minute  

**Query Params:**
- `campaign_id` (optional): Filter by campaign
- `status` (optional): `new`, `contacted`, `replied`, `qualified`, `unqualified`
- `search` (optional): Search by name or company
- `page`, `per_page`: Pagination

**Response (200 OK):**
```json
{
  "success": true,
  "leads": [
    {
      "id": "lead-uuid",
      "campaign_id": "camp-uuid",
      "status": "replied",
      "profile": {
        "name": "Sarah Johnson",
        "title": "VP of Marketing",
        "company": "TechCorp Inc",
        "linkedin_url": "https://linkedin.com/in/sarah-johnson",
        "avatar_url": "https://..."
      },
      "enrichment": {
        "email": "sarah.johnson@techcorp.com",
        "phone": null,
        "company_size": "201-500",
        "industry": "Technology"
      },
      "engagement": {
        "dm_sent": true,
        "dm_sent_at": "2025-10-27T10:15:00Z",
        "dm_replied": true,
        "dm_replied_at": "2025-10-27T12:30:00Z",
        "email_sent": false
      },
      "created_at": "2025-10-27T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 147,
    "total_pages": 8
  }
}
```

---

#### `PATCH /api/leads/:id`
**Purpose:** Update lead status or add notes  
**Authentication:** Bearer token  
**Rate Limit:** 30 requests/hour  

**Request:**
```json
{
  "status": "qualified",
  "notes": "Had great call, scheduling demo for next week"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "lead": {
    "id": "lead-uuid",
    "status": "qualified",
    "notes": "Had great call, scheduling demo for next week",
    "updated_at": "2025-10-27T15:00:00Z"
  }
}
```

---

### 2.4 Content Generation Endpoints

#### `POST /api/content/generate-dm`
**Purpose:** Generate personalized DM using AgentKit  
**Authentication:** Bearer token  
**Rate Limit:** 30 requests/hour (OpenAI costs)  

**Request:**
```json
{
  "cartridge_id": "cart-uuid",
  "lead_id": "lead-uuid",
  "lead_magnet_id": "lm-uuid",
  "context": {
    "comment_text": "Great insights on leadership!",
    "post_topic": "Executive presence"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "content": {
    "message": "Hi Sarah,\n\nI saw your thoughtful comment on executive presence - clearly you're thinking deeply about leadership development.\n\nI've put together a practical Executive Presence Scorecard that my clients find incredibly useful for identifying blind spots. Would you like me to send it over?\n\nBest,\nRachel",
    "char_count": 287,
    "needs_approval": true,
    "generated_at": "2025-10-27T10:05:00Z"
  }
}
```

**Errors:**
- `400` - Missing cartridge_id or lead_id
- `402` - OpenAI quota exceeded
- `500` - AgentKit error

---

#### `POST /api/content/approve`
**Purpose:** Approve AI-generated content (triggers learning loop)  
**Authentication:** Bearer token  
**Rate Limit:** 100 requests/hour  

**Request:**
```json
{
  "content_id": "content-uuid",
  "approved": true,
  "edits": null,
  "feedback": "Perfect tone!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Content approved and learning loop triggered",
  "dm_queued": true,
  "estimated_send_time": "2025-10-27T10:10:00Z"
}
```

**If Edited:**
```json
{
  "content_id": "content-uuid",
  "approved": true,
  "edits": "Hi Sarah,\n\nLoved your comment on executive presence...\n\n[edited version]",
  "feedback": "Less formal, more casual"
}
```

**Response includes Mem0 learning:**
```json
{
  "success": true,
  "message": "Content approved with edits - cartridge updated",
  "learning": {
    "mem0_memory_id": "mem-uuid",
    "pattern_learned": "User prefers casual tone, avoiding formal greetings"
  }
}
```

---

### 2.5 Cartridge Management Endpoints

#### `POST /api/cartridges`
**Purpose:** Create new AI persona cartridge  
**Authentication:** Bearer token  
**Rate Limit:** 10 requests/hour  

**Request:**
```json
{
  "name": "Executive Coaching - Professional",
  "persona": {
    "role": "Executive Coach",
    "expertise": ["Leadership development", "C-suite transitions", "Executive presence"],
    "target_audience": "VP+ executives in tech/finance",
    "years_experience": 15
  },
  "writing_style": {
    "tone": "professional",
    "vocabulary_level": 8,
    "sentence_length": "medium",
    "use_emojis": false,
    "use_questions": true,
    "personal_pronouns": "first-person"
  },
  "industry_knowledge": {
    "niche": "Executive coaching for tech leaders",
    "key_topics": ["Imposter syndrome", "Strategic thinking", "Team delegation"],
    "common_pain_points": ["Overwhelm", "Lack of executive presence", "Poor time management"],
    "value_propositions": ["Accelerate VP → C-suite transition", "Build confident leadership"]
  },
  "tools_enabled": ["web_search", "image_generation"],
  "system_prompt": "You are Rachel, an executive coach with 15 years experience..."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "cartridge": {
    "id": "cart-uuid",
    "name": "Executive Coaching - Professional",
    "created_at": "2025-10-27T10:00:00Z",
    "mem0_memory_id": "mem-uuid",
    "backup_stored": true
  }
}
```

---

#### `GET /api/cartridges/:id`
**Purpose:** Retrieve cartridge details  
**Authentication:** Bearer token  
**Rate Limit:** 60 requests/minute  

**Response (200 OK):**
```json
{
  "success": true,
  "cartridge": {
    "id": "cart-uuid",
    "name": "Executive Coaching - Professional",
    "persona": { /* full persona object */ },
    "writing_style": { /* full style object */ },
    "industry_knowledge": { /* full knowledge object */ },
    "learning_history": [
      {
        "date": "2025-10-25",
        "pattern": "User prefers casual tone",
        "example_edit": "Changed 'Dear Sarah' to 'Hi Sarah'"
      }
    ],
    "performance_stats": {
      "messages_generated": 234,
      "approval_rate": 0.87,
      "edit_rate": 0.13,
      "avg_char_count": 312
    }
  }
}
```

---

### 2.6 Lead Magnet Library Endpoints

#### `GET /api/lead-magnets`
**Purpose:** Search pre-built lead magnet library  
**Authentication:** Bearer token  
**Rate Limit:** 60 requests/minute  

**Query Params:**
- `query` (optional): Semantic search query
- `category` (optional): `checklist`, `template`, `guide`, `assessment`
- `industry` (optional): Filter by industry
- `page`, `per_page`: Pagination

**Response (200 OK):**
```json
{
  "success": true,
  "lead_magnets": [
    {
      "id": "lm-uuid",
      "title": "Executive Presence Scorecard",
      "description": "Self-assessment tool for VP+ leaders to identify blind spots in executive presence",
      "category": "assessment",
      "format": "PDF",
      "industries": ["Technology", "Finance", "Consulting"],
      "target_audience": "VP+ executives",
      "preview_url": "https://storage.supabase.co/...",
      "thumbnail_url": "https://storage.supabase.co/...",
      "download_count": 1247,
      "avg_rating": 4.8
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 52,
    "total_pages": 3
  }
}
```

---

### 2.7 Analytics Endpoints

#### `GET /api/analytics/dashboard`
**Purpose:** Get dashboard metrics for user  
**Authentication:** Bearer token  
**Rate Limit:** 60 requests/minute  

**Query Params:**
- `date_from` (optional): Start date (ISO 8601)
- `date_to` (optional): End date (ISO 8601)
- `campaign_id` (optional): Filter by campaign

**Response (200 OK):**
```json
{
  "success": true,
  "period": {
    "from": "2025-10-01T00:00:00Z",
    "to": "2025-10-27T23:59:59Z"
  },
  "metrics": {
    "leads": {
      "total": 347,
      "new_this_period": 147,
      "growth_rate": 0.73
    },
    "engagement": {
      "dms_sent": 234,
      "dm_reply_rate": 0.34,
      "emails_sent": 45,
      "email_reply_rate": 0.22
    },
    "conversions": {
      "qualified_leads": 67,
      "conversion_rate": 0.19,
      "lead_magnet_downloads": 89
    },
    "costs": {
      "total_spent": 127.50,
      "cost_per_lead": 0.87,
      "cost_per_qualified_lead": 1.90
    }
  },
  "top_campaigns": [
    {
      "id": "camp-uuid",
      "name": "Executive Coaching Leads - Q4 2025",
      "leads": 147,
      "qualified": 34
    }
  ]
}
```

---

### 2.8 Super Admin Endpoints

#### `GET /api/admin/clients`
**Purpose:** List all clients (Chase only)  
**Authentication:** Bearer token with `super_admin` role  
**Rate Limit:** 60 requests/minute  

**Response (200 OK):**
```json
{
  "success": true,
  "clients": [
    {
      "id": "client-uuid",
      "name": "Rachel Thompson",
      "email": "rachel@example.com",
      "tier": "tier_2",
      "status": "active",
      "created_at": "2025-09-01T00:00:00Z",
      "usage": {
        "campaigns_active": 2,
        "leads_total": 347,
        "monthly_cost": 312.50
      },
      "health": {
        "last_login": "2025-10-27T09:00:00Z",
        "reply_rate": 0.34,
        "satisfaction_score": 4.5
      }
    }
  ]
}
```

---

#### `GET /api/admin/system-health`
**Purpose:** Get system-wide health metrics  
**Authentication:** Bearer token with `super_admin` role  
**Rate Limit:** 60 requests/minute  

**Response (200 OK):**
```json
{
  "success": true,
  "system": {
    "status": "operational",
    "uptime_percentage": 99.87,
    "last_downtime": "2025-10-15T03:22:00Z"
  },
  "services": {
    "supabase": { "status": "healthy", "latency_ms": 45 },
    "unipile": { "status": "healthy", "latency_ms": 230 },
    "apollo": { "status": "healthy", "latency_ms": 180 },
    "instantly": { "status": "healthy", "latency_ms": 120 },
    "openai": { "status": "healthy", "latency_ms": 890 },
    "mem0": { "status": "healthy", "latency_ms": 150 }
  },
  "queues": {
    "dm_queue": {
      "pending": 47,
      "processing": 3,
      "failed": 2
    },
    "email_queue": {
      "pending": 12,
      "processing": 1,
      "failed": 0
    }
  },
  "costs_today": {
    "total": 172.50,
    "by_service": {
      "apollo": 45.20,
      "openai": 67.30,
      "unipile": 35.00,
      "instantly": 25.00
    }
  },
  "alerts": [
    {
      "severity": "warning",
      "service": "apollo",
      "message": "Client 'jake-startup' exceeded Apollo credits",
      "action_url": "/admin/clients/jake-uuid"
    }
  ]
}
```

---

## 3. AgentKit Tool Definitions

**These are the functions AgentKit can call during orchestration. Configure in Agent Builder.**

### 3.1 Campaign Management Agent Tools

#### `scrape_linkedin_comments`
**Purpose:** Scrape commenters from LinkedIn post via Unipile  
**Agent:** Campaign Management Agent  
**MCP Used:** None (direct Unipile API call)  

**Input Schema:**
```json
{
  "post_url": "https://www.linkedin.com/posts/...",
  "max_comments": 100,
  "filter_criteria": {
    "min_followers": 500,
    "exclude_keywords": ["spam", "bot"]
  }
}
```

**Output Schema:**
```json
{
  "success": true,
  "comments": [
    {
      "commenter_id": "linkedin-profile-id",
      "name": "Sarah Johnson",
      "profile_url": "https://linkedin.com/in/sarah-johnson",
      "comment_text": "Great insights on leadership!",
      "timestamp": "2025-10-27T09:30:00Z"
    }
  ],
  "total_scraped": 87,
  "filtered_out": 13
}
```

---

#### `check_existing_lead`
**Purpose:** Check if lead already exists in system (prevent duplicates)  
**Agent:** Campaign Management Agent  
**MCP Used:** Supabase MCP  

**Input Schema:**
```json
{
  "linkedin_url": "https://linkedin.com/in/sarah-johnson"
}
```

**Output Schema:**
```json
{
  "exists": true,
  "lead_id": "lead-uuid",
  "status": "contacted",
  "last_contact_date": "2025-10-15T10:00:00Z"
}
```

---

### 3.2 Lead Enrichment Agent Tools

#### `enrich_lead_apollo`
**Purpose:** Enrich lead with email/phone/company data via Apollo.io  
**Agent:** Lead Enrichment Agent  
**MCP Used:** Apollo.io MCP  

**Input Schema:**
```json
{
  "linkedin_url": "https://linkedin.com/in/sarah-johnson",
  "fallback_data": {
    "name": "Sarah Johnson",
    "company": "TechCorp Inc"
  }
}
```

**Output Schema:**
```json
{
  "success": true,
  "enrichment": {
    "email": "sarah.johnson@techcorp.com",
    "email_confidence": 0.92,
    "phone": "+1-555-0123",
    "phone_confidence": 0.78,
    "company_info": {
      "name": "TechCorp Inc",
      "size": "201-500",
      "industry": "Technology",
      "revenue": "$50M-$100M"
    },
    "credits_used": 1
  }
}
```

**Error Handling:**
```json
{
  "success": false,
  "error": "apollo_quota_exceeded",
  "message": "Apollo.io monthly credits exhausted",
  "credits_remaining": 0
}
```

---

#### `save_enriched_lead`
**Purpose:** Store enriched lead in Supabase  
**Agent:** Lead Enrichment Agent  
**MCP Used:** Supabase MCP  

**Input Schema:**
```json
{
  "campaign_id": "camp-uuid",
  "profile": {
    "name": "Sarah Johnson",
    "title": "VP of Marketing",
    "company": "TechCorp Inc",
    "linkedin_url": "https://linkedin.com/in/sarah-johnson"
  },
  "enrichment": {
    "email": "sarah.johnson@techcorp.com",
    "phone": "+1-555-0123",
    "company_size": "201-500"
  },
  "source_comment": "Great insights on leadership!"
}
```

**Output Schema:**
```json
{
  "success": true,
  "lead_id": "lead-uuid",
  "created_at": "2025-10-27T10:05:00Z"
}
```

---

### 3.3 Content Generation Agent Tools

#### `load_cartridge_context`
**Purpose:** Retrieve cartridge from Mem0 for content generation  
**Agent:** Content Generation Agent  
**MCP Used:** Mem0 MCP  

**Input Schema:**
```json
{
  "cartridge_id": "cart-uuid"
}
```

**Output Schema:**
```json
{
  "success": true,
  "cartridge": {
    "persona": { /* full persona */ },
    "writing_style": { /* full style */ },
    "industry_knowledge": { /* full knowledge */ },
    "system_prompt": "You are Rachel, an executive coach...",
    "learned_patterns": [
      "User prefers casual tone",
      "Avoid emoji usage",
      "Keep messages under 300 characters"
    ]
  }
}
```

---

#### `generate_personalized_dm`
**Purpose:** Generate DM using cartridge + lead context  
**Agent:** Content Generation Agent  
**MCP Used:** None (uses OpenAI directly via AgentKit)  

**Input Schema:**
```json
{
  "cartridge_context": { /* from load_cartridge_context */ },
  "lead_data": {
    "name": "Sarah",
    "title": "VP of Marketing",
    "company": "TechCorp Inc",
    "comment": "Great insights on leadership!"
  },
  "lead_magnet": {
    "title": "Executive Presence Scorecard",
    "description": "Self-assessment tool for VP+ leaders"
  }
}
```

**Output Schema:**
```json
{
  "success": true,
  "message": "Hi Sarah,\n\nI saw your thoughtful comment on executive presence...",
  "char_count": 287,
  "tone_analysis": {
    "formality": 0.7,
    "confidence": 0.85,
    "persuasiveness": 0.78
  },
  "needs_approval": true
}
```

---

#### `update_cartridge_from_feedback`
**Purpose:** Learn from user edits and update Mem0 cartridge  
**Agent:** Content Generation Agent  
**MCP Used:** Mem0 MCP  

**Input Schema:**
```json
{
  "cartridge_id": "cart-uuid",
  "original_content": "Dear Sarah,\n\n...",
  "edited_content": "Hi Sarah,\n\n...",
  "user_feedback": "Less formal, more casual"
}
```

**Output Schema:**
```json
{
  "success": true,
  "learning": {
    "pattern_detected": "User prefers casual greetings (Hi vs Dear)",
    "mem0_memory_id": "mem-uuid",
    "applied_to_cartridge": true
  }
}
```

---

#### `search_lead_magnet_library`
**Purpose:** Semantic search for relevant lead magnet  
**Agent:** Content Generation Agent  
**MCP Used:** Supabase MCP (PGVector search)  

**Input Schema:**
```json
{
  "query": "executive leadership assessment",
  "industry": "Technology",
  "target_audience": "VP+ executives",
  "max_results": 3
}
```

**Output Schema:**
```json
{
  "success": true,
  "results": [
    {
      "id": "lm-uuid",
      "title": "Executive Presence Scorecard",
      "relevance_score": 0.94,
      "preview_url": "https://..."
    }
  ]
}
```

---

### 3.4 Shared Tools (All Agents)

#### `web_search`
**Purpose:** Search web for research (built into AgentKit)  
**Agent:** All agents  
**MCP Used:** None (AgentKit native WebSearchTool)  

**Input Schema:**
```json
{
  "query": "latest trends in executive coaching 2025",
  "max_results": 5
}
```

**Output Schema:**
```json
{
  "results": [
    {
      "title": "Top Executive Coaching Trends for 2025",
      "url": "https://...",
      "snippet": "AI-powered coaching, hybrid models..."
    }
  ]
}
```

---

#### `generate_image`
**Purpose:** Generate images with DALL-E (built into AgentKit)  
**Agent:** Content Generation Agent  
**MCP Used:** None (AgentKit native ImageGenerationTool)  

**Input Schema:**
```json
{
  "prompt": "Professional minimalist checklist design for executive coaching",
  "size": "1024x1024"
}
```

**Output Schema:**
```json
{
  "image_url": "https://oaidalleapiprodscus.blob.core.windows.net/...",
  "revised_prompt": "A clean, professional checklist..."
}
```

---

## 4. Webhook Schemas

### 4.1 Unipile Webhooks

**Webhook URL:** `https://[your-domain]/webhooks/unipile`  
**Authentication:** Shared secret in header `X-Unipile-Signature`  

#### Event: `message.received`
**Triggered:** When LinkedIn DM reply is received  

**Payload:**
```json
{
  "event": "message.received",
  "timestamp": "2025-10-27T12:30:00Z",
  "account_id": "unipile-account-uuid",
  "message": {
    "id": "unipile-message-id",
    "text": "Yes, I'd love to see the scorecard!",
    "sender": {
      "id": "linkedin-profile-id",
      "name": "Sarah Johnson",
      "profile_url": "https://linkedin.com/in/sarah-johnson"
    },
    "thread_id": "unipile-thread-id",
    "attachments": []
  }
}
```

**Expected Response:** `200 OK` (webhook acknowledged)

**RevOS Action:**
1. Match sender to existing lead in database
2. Update lead status to `replied`
3. Trigger PostHog event `dm_reply_received`
4. Send Slack notification to client
5. Queue email with lead magnet attachment

---

#### Event: `message.sent`
**Triggered:** When RevOS DM is successfully sent via Unipile  

**Payload:**
```json
{
  "event": "message.sent",
  "timestamp": "2025-10-27T10:15:00Z",
  "account_id": "unipile-account-uuid",
  "message": {
    "id": "unipile-message-id",
    "text": "Hi Sarah, I saw your comment...",
    "recipient": {
      "id": "linkedin-profile-id",
      "name": "Sarah Johnson"
    },
    "status": "delivered"
  }
}
```

**RevOS Action:**
1. Update lead engagement record
2. Mark DM as sent in `dm_queue`
3. Schedule 48-hour email follow-up

---

#### Event: `account.disconnected`
**Triggered:** When LinkedIn account is disconnected or banned  

**Payload:**
```json
{
  "event": "account.disconnected",
  "timestamp": "2025-10-27T14:00:00Z",
  "account_id": "unipile-account-uuid",
  "reason": "credentials_invalid",
  "details": "LinkedIn session expired or account restricted"
}
```

**RevOS Action:**
1. Pause all campaigns for this client
2. Send urgent Slack alert to client and Chase
3. Update client status to `account_issue`

---

### 4.2 Instantly Webhooks

**Webhook URL:** `https://[your-domain]/webhooks/instantly`  
**Authentication:** API key in query param `?api_key=xxx`  

#### Event: `email.sent`
**Triggered:** When email is successfully delivered  

**Payload:**
```json
{
  "event": "email.sent",
  "timestamp": "2025-10-29T10:15:00Z",
  "campaign_id": "instantly-campaign-id",
  "email": {
    "id": "instantly-email-id",
    "to": "sarah.johnson@techcorp.com",
    "subject": "Your Executive Presence Scorecard",
    "status": "delivered"
  }
}
```

**RevOS Action:**
1. Update lead engagement record
2. Trigger PostHog event `email_sent`

---

#### Event: `email.opened`
**Triggered:** When recipient opens email  

**Payload:**
```json
{
  "event": "email.opened",
  "timestamp": "2025-10-29T11:30:00Z",
  "email_id": "instantly-email-id",
  "opened_at": "2025-10-29T11:30:00Z",
  "ip_address": "203.0.113.42",
  "user_agent": "Mozilla/5.0..."
}
```

**RevOS Action:**
1. Update lead engagement record
2. Trigger PostHog event `email_opened`
3. Update lead score (+5 points)

---

#### Event: `email.replied`
**Triggered:** When recipient replies to email  

**Payload:**
```json
{
  "event": "email.replied",
  "timestamp": "2025-10-29T14:00:00Z",
  "email_id": "instantly-email-id",
  "reply": {
    "from": "sarah.johnson@techcorp.com",
    "text": "Thanks for the scorecard! Can we schedule a call?",
    "thread_id": "instantly-thread-id"
  }
}
```

**RevOS Action:**
1. Update lead status to `replied`
2. Trigger PostHog event `email_reply_received`
3. Send Slack notification to client
4. Update lead score (+20 points)

---

### 4.3 Slack Webhooks (Outgoing)

**Purpose:** Send notifications to client Slack channels  
**Authentication:** Slack Incoming Webhook URL (per client)  

#### Notification: `new_qualified_lead`
**Triggered:** When lead reaches `qualified` status  

**Payload to Slack:**
```json
{
  "text": ":tada: New Qualified Lead!",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🎯 New Qualified Lead: Sarah Johnson"
      }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Name:*\nSarah Johnson" },
        { "type": "mrkdwn", "text": "*Title:*\nVP of Marketing" },
        { "type": "mrkdwn", "text": "*Company:*\nTechCorp Inc" },
        { "type": "mrkdwn", "text": "*Status:*\nReplied to DM + opened email" }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "View in RevOS" },
          "url": "https://revos.app/leads/lead-uuid"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "LinkedIn Profile" },
          "url": "https://linkedin.com/in/sarah-johnson"
        }
      ]
    }
  ]
}
```

---

## 5. Database Schema Consolidation

**Database:** PostgreSQL 15+ (Supabase)  
**Extensions Required:** `pgvector`, `uuid-ossp`, `pg_cron`  

### 5.1 Core Tables

#### `users` Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'super_admin')),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_client_id ON users(client_id);
```

---

#### `clients` Table
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('tier_1', 'tier_2', 'tier_3')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'paused', 'churned', 'account_issue')),
  linkedin_account_id VARCHAR(255), -- Unipile account ID
  slack_webhook_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_tier ON clients(tier);
```

---

#### `cartridges` Table
```sql
CREATE TABLE cartridges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  persona JSONB NOT NULL,
  writing_style JSONB NOT NULL,
  industry_knowledge JSONB NOT NULL,
  tools_enabled TEXT[] DEFAULT ARRAY['web_search'],
  system_prompt TEXT NOT NULL,
  mem0_memory_id VARCHAR(255), -- Mem0 memory ID for this cartridge
  embedding VECTOR(1536), -- PGVector embedding for similarity search
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cartridges_client_id ON cartridges(client_id);
CREATE INDEX idx_cartridges_embedding ON cartridges USING ivfflat (embedding vector_cosine_ops);
```

---

#### `campaigns` Table
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_post_url TEXT NOT NULL,
  cartridge_id UUID REFERENCES cartridges(id) ON DELETE SET NULL,
  lead_magnet_id UUID REFERENCES lead_magnets(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'paused', 'completed')),
  settings JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{"leads_scraped": 0, "dms_sent": 0, "emails_sent": 0, "replies_received": 0}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE UNIQUE INDEX idx_campaigns_post_url ON campaigns(target_post_url);
```

---

#### `leads` Table
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('new', 'contacted', 'replied', 'qualified', 'unqualified')),
  profile JSONB NOT NULL, -- {name, title, company, linkedin_url, avatar_url}
  enrichment JSONB DEFAULT '{}', -- {email, phone, company_size, industry}
  engagement JSONB DEFAULT '{}', -- {dm_sent, dm_sent_at, dm_replied, email_sent, etc}
  source_comment TEXT,
  notes TEXT,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX idx_leads_client_id ON leads(client_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE UNIQUE INDEX idx_leads_linkedin_url ON leads((profile->>'linkedin_url'));
```

---

#### `lead_magnets` Table
```sql
CREATE TABLE lead_magnets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('checklist', 'template', 'guide', 'assessment')),
  format VARCHAR(20) NOT NULL CHECK (format IN ('PDF', 'DOCX', 'XLSX', 'Notion')),
  industries TEXT[] DEFAULT '{}',
  target_audience VARCHAR(255),
  file_url TEXT NOT NULL,
  preview_url TEXT,
  thumbnail_url TEXT,
  embedding VECTOR(1536), -- For semantic search
  download_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_magnets_category ON lead_magnets(category);
CREATE INDEX idx_lead_magnets_embedding ON lead_magnets USING ivfflat (embedding vector_cosine_ops);
```

---

#### `dm_queue` Table (BullMQ jobs)
```sql
CREATE TABLE dm_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  scheduled_send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dm_queue_status ON dm_queue(status);
CREATE INDEX idx_dm_queue_scheduled_send_at ON dm_queue(scheduled_send_at);
CREATE INDEX idx_dm_queue_client_id ON dm_queue(client_id);
```

---

#### `content_approvals` Table
```sql
CREATE TABLE content_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  cartridge_id UUID NOT NULL REFERENCES cartridges(id) ON DELETE CASCADE,
  original_content TEXT NOT NULL,
  edited_content TEXT,
  user_feedback TEXT,
  approved BOOLEAN NOT NULL,
  approved_at TIMESTAMPTZ,
  mem0_learning_id VARCHAR(255), -- ID of Mem0 memory created from this feedback
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_approvals_cartridge_id ON content_approvals(cartridge_id);
CREATE INDEX idx_content_approvals_approved ON content_approvals(approved);
```

---

### 5.2 Row Level Security (RLS) Policies

**Enable RLS on all tables:**
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_approvals ENABLE ROW LEVEL SECURITY;
```

**Client isolation policy (example for `leads` table):**
```sql
CREATE POLICY "Clients can only see their own leads"
ON leads
FOR SELECT
USING (
  client_id = (SELECT client_id FROM users WHERE id = auth.uid())
  OR
  (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
);
```

---

## 6. PostHog Event Schema

**PostHog Integration:** Track all user actions and system events  
**Project API Key:** Stored in `POSTHOG_API_KEY` env var  

### 6.1 User Events

#### Event: `campaign_created`
```json
{
  "event": "campaign_created",
  "distinct_id": "user-uuid",
  "properties": {
    "campaign_id": "camp-uuid",
    "campaign_name": "Executive Coaching Leads - Q4 2025",
    "target_post_url": "https://linkedin.com/posts/...",
    "cartridge_id": "cart-uuid",
    "lead_magnet_id": "lm-uuid",
    "client_tier": "tier_2",
    "timestamp": "2025-10-27T10:00:00Z"
  }
}
```

---

#### Event: `content_approved`
```json
{
  "event": "content_approved",
  "distinct_id": "user-uuid",
  "properties": {
    "content_id": "content-uuid",
    "was_edited": false,
    "char_count": 287,
    "approval_time_seconds": 12,
    "cartridge_id": "cart-uuid",
    "timestamp": "2025-10-27T10:05:00Z"
  }
}
```

---

#### Event: `content_edited_before_approval`
```json
{
  "event": "content_edited_before_approval",
  "distinct_id": "user-uuid",
  "properties": {
    "content_id": "content-uuid",
    "original_char_count": 287,
    "edited_char_count": 245,
    "edit_type": "tone_change",
    "feedback": "Less formal, more casual",
    "cartridge_id": "cart-uuid",
    "mem0_learning_triggered": true,
    "timestamp": "2025-10-27T10:06:00Z"
  }
}
```

---

### 6.2 System Events

#### Event: `dm_sent`
```json
{
  "event": "dm_sent",
  "distinct_id": "system",
  "properties": {
    "lead_id": "lead-uuid",
    "campaign_id": "camp-uuid",
    "client_id": "client-uuid",
    "char_count": 287,
    "delay_minutes_from_scrape": 127,
    "unipile_account_id": "unipile-account-uuid",
    "timestamp": "2025-10-27T10:15:00Z"
  }
}
```

---

#### Event: `dm_reply_received`
```json
{
  "event": "dm_reply_received",
  "distinct_id": "system",
  "properties": {
    "lead_id": "lead-uuid",
    "campaign_id": "camp-uuid",
    "client_id": "client-uuid",
    "reply_time_hours": 2.25,
    "reply_char_count": 47,
    "lead_status_updated_to": "replied",
    "timestamp": "2025-10-27T12:30:00Z"
  }
}
```

---

#### Event: `apollo_enrichment_success`
```json
{
  "event": "apollo_enrichment_success",
  "distinct_id": "system",
  "properties": {
    "lead_id": "lead-uuid",
    "client_id": "client-uuid",
    "email_found": true,
    "email_confidence": 0.92,
    "phone_found": true,
    "credits_used": 1,
    "credits_remaining": 487,
    "timestamp": "2025-10-27T10:03:00Z"
  }
}
```

---

#### Event: `apollo_quota_exceeded`
```json
{
  "event": "apollo_quota_exceeded",
  "distinct_id": "system",
  "properties": {
    "client_id": "client-uuid",
    "campaign_id": "camp-uuid",
    "credits_remaining": 0,
    "leads_pending_enrichment": 23,
    "alert_sent_to": ["client", "super_admin"],
    "timestamp": "2025-10-27T14:00:00Z"
  }
}
```

---

### 6.3 Conversion Events

#### Event: `lead_qualified`
```json
{
  "event": "lead_qualified",
  "distinct_id": "user-uuid",
  "properties": {
    "lead_id": "lead-uuid",
    "campaign_id": "camp-uuid",
    "time_to_qualify_hours": 48,
    "engagement_path": "dm_sent → dm_replied → email_sent → email_replied",
    "lead_score": 45,
    "timestamp": "2025-10-29T14:00:00Z"
  }
}
```

---

## 7. MCP Integration Contracts

### 7.1 Apollo.io MCP

**Package:** `@lkm1developer/apollo-io-mcp-server`  
**Tool Used:** `search_people`  

**Expected Input:**
```json
{
  "linkedin_url": "https://linkedin.com/in/sarah-johnson"
}
```

**Expected Output:**
```json
{
  "person": {
    "id": "apollo-person-id",
    "name": "Sarah Johnson",
    "title": "VP of Marketing",
    "email": "sarah.johnson@techcorp.com",
    "email_confidence": 0.92,
    "phone": "+1-555-0123",
    "phone_confidence": 0.78,
    "organization": {
      "name": "TechCorp Inc",
      "size": "201-500",
      "industry": "Technology",
      "revenue": "$50M-$100M"
    }
  },
  "credits_used": 1
}
```

**Error Cases:**
- `quota_exceeded` - Monthly credits exhausted
- `not_found` - LinkedIn profile not in Apollo database
- `invalid_url` - Malformed LinkedIn URL

---

### 7.2 Mem0 MCP

**Package:** `@mem0/mcp-server`  
**Tools Used:** `create_memory`, `search_memories`, `update_memory`  

#### Tool: `create_memory`
**Expected Input:**
```json
{
  "text": "User prefers casual tone, avoiding formal greetings like 'Dear'",
  "user_id": "cart-uuid",
  "metadata": {
    "category": "writing_style",
    "source": "user_feedback",
    "example_edit": "Changed 'Dear Sarah' to 'Hi Sarah'"
  }
}
```

**Expected Output:**
```json
{
  "memory_id": "mem-uuid",
  "created_at": "2025-10-27T10:06:00Z"
}
```

---

#### Tool: `search_memories`
**Expected Input:**
```json
{
  "query": "tone preferences",
  "user_id": "cart-uuid",
  "limit": 10
}
```

**Expected Output:**
```json
{
  "memories": [
    {
      "id": "mem-uuid",
      "text": "User prefers casual tone, avoiding formal greetings",
      "relevance_score": 0.94,
      "created_at": "2025-10-27T10:06:00Z"
    }
  ]
}
```

---

### 7.3 Supabase MCP

**Package:** `@supabase/mcp-server-supabase`  
**Tools Used:** `query`, `insert`, `update`, `delete`  

#### Tool: `query` (with PGVector search)
**Expected Input:**
```json
{
  "query": "SELECT * FROM lead_magnets ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector LIMIT 3",
  "params": []
}
```

**Expected Output:**
```json
{
  "rows": [
    {
      "id": "lm-uuid",
      "title": "Executive Presence Scorecard",
      "description": "...",
      "relevance_score": 0.94
    }
  ],
  "count": 3
}
```

---

### 7.4 Canva MCP

**Package:** `canva-mcp-server`  
**Tool Used:** `create_design`  

**Expected Input:**
```json
{
  "template_id": "canva-template-id",
  "title": "Executive Presence Scorecard",
  "customizations": {
    "brand_colors": ["#1E3A8A", "#F59E0B"],
    "logo_url": "https://..."
  }
}
```

**Expected Output:**
```json
{
  "design_id": "canva-design-id",
  "preview_url": "https://canva.com/design/...",
  "download_url": "https://canva.com/download/..."
}
```

---

### 7.5 Context7 MCP

**Package:** `context7-mcp-server`  
**Tool Used:** `search_documentation`  

**Expected Input:**
```json
{
  "query": "executive coaching best practices",
  "sources": ["harvard_business_review", "forbes"],
  "max_results": 5
}
```

**Expected Output:**
```json
{
  "results": [
    {
      "title": "10 Executive Coaching Principles That Work",
      "url": "https://...",
      "snippet": "Research shows that...",
      "source": "harvard_business_review",
      "relevance_score": 0.89
    }
  ]
}
```

---

### 7.6 Clarity MCP

**Package:** `@microsoft/clarity-mcp-server`  
**Tool Used:** `get_session_recordings`  

**Expected Input:**
```json
{
  "project_id": "clarity-project-id",
  "filters": {
    "user_id": "user-uuid",
    "date_from": "2025-10-27",
    "date_to": "2025-10-27"
  },
  "limit": 10
}
```

**Expected Output:**
```json
{
  "sessions": [
    {
      "session_id": "clarity-session-id",
      "duration_seconds": 342,
      "page_views": 7,
      "rage_clicks": 2,
      "recording_url": "https://clarity.microsoft.com/..."
    }
  ]
}
```

---

## 8. Error Codes & Messages

**Standard Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* optional additional context */ },
    "timestamp": "2025-10-27T10:00:00Z"
  }
}
```

### 8.1 Authentication Errors (401, 403)

| Code | HTTP Status | Message | Action |
|------|-------------|---------|--------|
| `INVALID_CREDENTIALS` | 401 | Invalid email or password | Retry with correct credentials |
| `TOKEN_EXPIRED` | 401 | Access token has expired | Refresh token |
| `INSUFFICIENT_PERMISSIONS` | 403 | User does not have permission | Contact admin |
| `ACCOUNT_SUSPENDED` | 403 | Account has been suspended | Contact support |

---

### 8.2 Validation Errors (400)

| Code | HTTP Status | Message | Action |
|------|-------------|---------|--------|
| `MISSING_REQUIRED_FIELD` | 400 | Field '{field_name}' is required | Provide missing field |
| `INVALID_POST_URL` | 400 | LinkedIn post URL is invalid | Verify URL format |
| `INVALID_EMAIL` | 400 | Email format is invalid | Correct email format |
| `CHAR_LIMIT_EXCEEDED` | 400 | Message exceeds 300 character limit | Reduce message length |

---

### 8.3 Resource Errors (404, 409)

| Code | HTTP Status | Message | Action |
|------|-------------|---------|--------|
| `CAMPAIGN_NOT_FOUND` | 404 | Campaign not found | Verify campaign ID |
| `LEAD_NOT_FOUND` | 404 | Lead not found | Verify lead ID |
| `CARTRIDGE_NOT_FOUND` | 404 | Cartridge not found | Create cartridge first |
| `DUPLICATE_CAMPAIGN` | 409 | Campaign for this post already exists | Use existing campaign |
| `DUPLICATE_LEAD` | 409 | Lead already exists in system | Update existing lead |

---

### 8.4 External API Errors (502, 503)

| Code | HTTP Status | Message | Action |
|------|-------------|---------|--------|
| `UNIPILE_ERROR` | 502 | Unipile API error: {details} | Retry or contact support |
| `APOLLO_QUOTA_EXCEEDED` | 402 | Apollo.io monthly credits exhausted | Upgrade plan or wait |
| `OPENAI_ERROR` | 502 | OpenAI API error: {details} | Retry or contact support |
| `MEM0_ERROR` | 502 | Mem0 API error: {details} | Retry or contact support |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable | Retry in a few minutes |

---

### 8.5 Rate Limiting Errors (429)

| Code | HTTP Status | Message | Action |
|------|-------------|---------|--------|
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded: {limit} requests per {period} | Wait {retry_after} seconds |
| `DM_HOURLY_LIMIT` | 429 | LinkedIn DM hourly limit reached (50/hour) | Wait until next hour |
| `OPENAI_QUOTA_EXCEEDED` | 429 | OpenAI quota exceeded | Wait or upgrade plan |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1730000000
Retry-After: 3600
```

---

### 8.6 System Errors (500)

| Code | HTTP Status | Message | Action |
|------|-------------|---------|--------|
| `INTERNAL_SERVER_ERROR` | 500 | An unexpected error occurred | Contact support with error ID |
| `DATABASE_ERROR` | 500 | Database operation failed | Retry or contact support |
| `AGENTKIT_ERROR` | 500 | AgentKit orchestration failed | Retry or contact support |

**Error ID Format:** `err_20251027_abc123`

---

## 9. Authentication & Authorization

### 9.1 Supabase Auth

**Authentication Method:** Supabase Auth (email/password)  
**Session Storage:** JWT tokens (access + refresh)  
**Token Lifetime:** 1 hour (access), 30 days (refresh)  

**Login Flow:**
1. User submits email/password to `/auth/login`
2. Supabase validates credentials
3. Returns `access_token` (JWT) and `refresh_token`
4. Client stores tokens in secure storage
5. Client includes `Authorization: Bearer {access_token}` in all API requests

**Token Refresh Flow:**
1. When `access_token` expires (401 error), client calls `/auth/refresh`
2. Client sends `refresh_token` in request body
3. Supabase validates `refresh_token`
4. Returns new `access_token` and `refresh_token`

---

### 9.2 Role-Based Access Control (RBAC)

**Roles:**
- `client` - Regular RevOS client (Rachel, Jake)
- `super_admin` - Chase (full system access)

**Permission Matrix:**

| Action | Client | Super Admin |
|--------|--------|-------------|
| View own campaigns | ✅ | ✅ |
| View all campaigns | ❌ | ✅ |
| Create campaign | ✅ | ✅ |
| Delete own campaign | ✅ | ✅ |
| Delete any campaign | ❌ | ✅ |
| View own leads | ✅ | ✅ |
| View all leads | ❌ | ✅ |
| View system health | ❌ | ✅ |
| Manage clients | ❌ | ✅ |

**RLS Implementation:**
All database queries automatically filtered by `client_id` via Row Level Security policies (see Section 5.2).

---

### 9.3 API Key Authentication (Webhooks)

**Unipile Webhook Verification:**
```javascript
const signature = req.headers['x-unipile-signature'];
const expectedSignature = crypto.createHmac('sha256', UNIPILE_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature !== expectedSignature) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

**Instantly Webhook Verification:**
```javascript
const apiKey = req.query.api_key;

if (apiKey !== INSTANTLY_WEBHOOK_API_KEY) {
  return res.status(401).json({ error: 'Invalid API key' });
}
```

---

## 10. Rate Limiting & Quotas

### 10.1 API Rate Limits (Supabase Edge Functions)

**Default Limits:**
- Anonymous requests: 10/minute per IP
- Authenticated requests: 60/minute per user
- Content generation: 30/hour per user (OpenAI costs)
- Campaign creation: 20/hour per user

**Implementation:** Supabase built-in rate limiting + custom Redis cache

---

### 10.2 LinkedIn DM Rate Limits (Unipile)

**LinkedIn Safety Limits:**
- 50 DMs per hour per account
- 2-minute minimum delay between DMs
- Daily recommendation: 200-300 DMs max

**RevOS Enforcement:**
- BullMQ queue with rate limiting
- Automatic delay calculation (2-5 minutes randomized)
- Alert when hourly limit reached

---

### 10.3 External API Quotas

**Apollo.io:**
- Tier 1 ($2k/mo): 500 credits/month
- Tier 2 ($3.5k/mo): 1000 credits/month
- Tier 3 ($5k/mo): 2000 credits/month
- 1 credit = 1 person enrichment

**OpenAI (AgentKit):**
- GPT-4o: ~$0.30 per DM generation
- DALL-E 3: ~$0.04 per image generation
- No hard quota (pay-as-you-go)

**Unipile:**
- $5/month per LinkedIn account
- No message limits (LinkedIn's limits apply)

---

## Appendix: Quick Reference

### Key Endpoints
- **Auth:** `POST /auth/login`, `POST /auth/logout`
- **Campaigns:** `GET /api/campaigns`, `POST /api/campaigns`, `PATCH /api/campaigns/:id`
- **Leads:** `GET /api/leads`, `PATCH /api/leads/:id`
- **Content:** `POST /api/content/generate-dm`, `POST /api/content/approve`
- **Admin:** `GET /api/admin/clients`, `GET /api/admin/system-health`

### Key AgentKit Tools
- **scrape_linkedin_comments** - Unipile scraping
- **enrich_lead_apollo** - Apollo.io enrichment
- **generate_personalized_dm** - OpenAI content generation
- **load_cartridge_context** - Mem0 retrieval
- **update_cartridge_from_feedback** - Mem0 learning

### Key Webhooks
- **Unipile:** `message.received`, `message.sent`, `account.disconnected`
- **Instantly:** `email.sent`, `email.opened`, `email.replied`
- **Slack:** `new_qualified_lead` (outgoing)

### Key Database Tables
- **users** - Authentication
- **clients** - RevOS customers
- **cartridges** - AI personas
- **campaigns** - Growth campaigns
- **leads** - Scraped prospects
- **lead_magnets** - Pre-built assets
- **dm_queue** - BullMQ jobs
- **content_approvals** - Learning loop

---

**End of Interface Specification Document**