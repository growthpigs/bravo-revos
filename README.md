# Bravo revOS - AI-Powered LinkedIn Lead Generation System

Transform LinkedIn connections into qualified leads automatically with AI-powered content creation and multi-channel delivery.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (https://supabase.com)

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

1. The project is already configured with Supabase
2. Run the SQL migration in your Supabase SQL Editor:
   - Open `/supabase/migrations/001_initial_schema.sql`
   - Copy and paste into Supabase SQL Editor
   - Execute

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Charts**: Recharts

## 📁 Project Structure

```
bravo-revos/
├── app/                    # Next.js 14 App Router
│   ├── admin/             # Agency admin portal
│   ├── dashboard/         # Client dashboard
│   └── api/               # API routes
├── lib/
│   └── supabase/          # Supabase clients
├── supabase/
│   └── migrations/        # SQL migrations
└── docs/                  # Documentation
```

## 🎯 Core Features

### Admin Portal (`/admin`)
- Client management, system analytics, pod monitoring

### Client Dashboard (`/dashboard`)
- Campaign wizard, lead management, webhook configuration

## 📊 Database Schema

Multi-tenant architecture: `agencies → clients → users → campaigns → leads`

**Key tables:** agencies, clients, users, campaigns, leads, pods (min 3 members), linkedin_accounts, webhook_configs

See `/supabase/migrations/001_initial_schema.sql` for complete schema.

## 📚 Documentation

- **Master Spec**: `/docs/projects/bravo-revos/spec.md`
- **Data Model**: `/docs/projects/bravo-revos/data-model.md`
- **Archon Tasks**: 20 tasks (A-00 through G-02)

## 🗺️ Implementation Roadmap

### MVP (Current)
- ✅ Next.js 14 scaffold
- ✅ Database schema
- ⏳ LinkedIn integration (Unipile)
- ⏳ Lead capture & webhooks
- ⏳ Engagement pods

---

**Managed via Archon MCP Server | Project ID: de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531**
