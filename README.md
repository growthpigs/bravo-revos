# Bravo revOS

RevOS V1 V1 V1 - LinkedIn Lead Magnet Automation + Engagement Pod Reshare

## Architecture

- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase PostgreSQL + pgvector
- **Job Queue**: BullMQ + Upstash Redis
- **AI**: OpenAI AgentKit + Mem0
- **LinkedIn API**: Unipile
- **Browser Automation**: Playwright
- **Frontend**: React + Vite + shadcn/ui

## Features

### V1 Core (Days 1-4)
- Lead magnet automation with configurable trigger words
- AI-powered email extraction from DM replies
- Webhook integration for captured emails
- AgentKit conversational interface
- Cartridge system (System, User, Skills, Preferences)
- Mem0 persistent memory

### V1.5 Premium (Days 5-6)
- Engagement pod reshare automation
- AI-generated unique commentary
- Human behavior simulation (typing, mouse, timing)
- Multi-account coordination

## Branch Strategy

- `main` - Production-ready code
- `staging` - Pre-production testing
- `v1-lead-magnet` - Current feature development
- `production` - Deployed to production

## Documentation

See `/specs/001-linkedin-growth-engine/` for complete design docs:
- `spec.md` - Feature specification
- `research.md` - Technology research
- `data-model.md` - Database schema
- `quickstart.md` - Setup and testing guide

## Project Management

This project is managed via [Archon](https://github.com/agro-bros/bravo-revos) with tasks tracked in the AgroArchon UI.
