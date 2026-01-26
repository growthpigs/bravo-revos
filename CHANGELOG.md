# Changelog

All notable changes to RevOS are documented here.

## [Unreleased]

## [2026-01-26] - Platform Stabilization Complete

### Fixed
- **Build failure** - Lazy OpenAI initialization in `lead-magnet-email.ts`
- **Health check** - Connection-based check instead of table query
- **Redis session storage** - Provisioned Upstash Redis for auth sessions

### Added
- REDIS_URL environment variable in Vercel (`ra-revos` project)
- Upstash Redis instance: `enhanced-barnacle-6920.upstash.io`

### Infrastructure
- Confirmed deployment platform is **Vercel** (not Netlify)
- Vercel project name: `ra-revos`
- Production URL: `https://ra-revos.vercel.app`

## [2026-01-22] - Unified Platform Phase 2

### Added
- basePath configuration for unified platform deployment (`next.config.js`)
- Dynamic basePath detection in Supabase auth callbacks
- Monorepo integration in `hgc-monorepo/packages/revos`

### Changed
- Upgraded React 18.3.1 → 19.2.0
- Upgraded Next.js 14.2.35 → 16.1.4
- Upgraded Tailwind 3.4.18 → 4.1.18
- Migrated `postcss.config.js` → `postcss.config.mjs` (Tailwind v4)
- Migrated `globals.css` from `@tailwind` directives to `@import "tailwindcss"`
- Moved webpack externals → `serverExternalPackages` (Turbopack)

### Fixed
- basePath compatibility: replaced `window.location.href` with `router.push()` for auth redirects
- Files fixed: `products-services/page.tsx`, `pod-activity/page.tsx`, `auth/login/page.tsx`

### Removed
- `tailwind.config.ts` (not needed in Tailwind v4)
- `postcss.config.js` (replaced with .mjs)

### Disabled
- GoLogin routes (ES module import assertions incompatible with Turbopack)
  - `app/api/gologin/create-profile/route.ts.disabled`
  - `app/api/gologin/verify-session/route.ts.disabled`

## [2026-01-21] - AudienceOS Tables Migration

### Added
- AudienceOS database tables for future unified platform integration
- New tables: `unified_audience_*` schema

## [2026-01-03] - Initial Release

### Added
- Core marketing automation features
- LinkedIn integration via Unipile
- AgentKit-powered content generation
- Campaign management system
- Cartridge system for client-specific data

---

*Maintained by Chi CTO*
