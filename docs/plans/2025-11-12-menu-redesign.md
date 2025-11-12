# RevOS Menu Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the dashboard sidebar menu with grouped sections, collapsible submenus, header sandbox toggle, credit display, and quick actions bar.

**Architecture:** Update existing `dashboard-sidebar.tsx` component to support multi-level menu structure with section groups, collapsible submenus, and a fixed header/footer layout. Add route redirects for consolidated pages.

**Tech Stack:**
- Next.js 14 App Router
- React (useState for menu state)
- TypeScript
- Tailwind CSS
- Lucide React icons
- shadcn/ui components

**Current State:**
- Sidebar: `components/dashboard/dashboard-sidebar.tsx` (flat menu, sandbox toggle at bottom)
- Routes: All exist in `app/dashboard/*` directory
- No redirects configured

**New Structure:**
- Grouped menu sections (OUTREACH, AI TRAINING, FIND & MANAGE, DEVELOPER, PLATFORM)
- Collapsible submenus (Cartridges, Settings)
- Sandbox toggle + credits in header
- Quick actions bar at footer
- Route redirects for legacy paths

---

## Task 1: Add Route Redirects Configuration

**Files:**
- Modify: `next.config.js`

**Step 1: Add redirects configuration**

Replace the entire `next.config.js` with:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/dashboard/scheduled-actions',
        destination: '/dashboard/campaigns',
        permanent: true,
      },
      {
        source: '/dashboard/scheduled',
        destination: '/dashboard/campaigns',
        permanent: true,
      },
      {
        source: '/dashboard/linkedin-posts',
        destination: '/dashboard/campaigns',
        permanent: true,
      },
      {
        source: '/dashboard/posts',
        destination: '/dashboard/campaigns',
        permanent: true,
      },
      {
        source: '/dashboard/dm-sequences',
        destination: '/dashboard/campaigns',
        permanent: true,
      },
      {
        source: '/dashboard/linkedin-accounts',
        destination: '/dashboard/settings',
        permanent: true,
      },
      {
        source: '/dashboard/linkedin',
        destination: '/dashboard/settings',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
```

**Step 2: Verify configuration syntax**

Run: `npx next build --dry-run 2>&1 | head -20`

Expected: No syntax errors, redirects listed in build output

**Step 3: Test redirects (after dev server restart)**

Note: Redirects require dev server restart. Will test in Task 5.

**Step 4: Commit**

```bash
git add next.config.js
git commit -m "feat(menu): add route redirects for consolidated menu"
```

---

## Task 2: Update Dashboard Sidebar - Part 1 (Menu Data Structure)

**Files:**
- Modify: `components/dashboard/dashboard-sidebar.tsx`

**Step 1: Add new icon imports**

At the top of the file, update the imports from 'lucide-react':

```typescript
import {
  LayoutDashboard,
  Megaphone,
  Users2,
  Settings,
  Linkedin,
  Webhook,
  Upload,
  MessageSquare,
  LogOut,
  Zap,
  BookOpen,
  Calendar,
  FlaskConical,
  Rocket,
  Activity,
  Package2,
  Brain,
  Layers,
  Search,
  FileText,
  BarChart,
  Key,
  Database,
  Plus,
  MessageCircle,
  TrendingUp,
  CreditCard,
  ChevronDown,
  Mail
} from 'lucide-react'
```

**Step 2: Define menu sections data structure**

After the imports and before the component, replace the existing `navigation` constant with:

```typescript
interface MenuItem {
  icon: any
  label: string
  href: string
  badge?: string
  description?: string
  submenu?: Array<{
    label: string
    href: string
    badge?: string
    active?: boolean
  }>
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

const menuSections: MenuSection[] = [
  {
    title: "OUTREACH",
    items: [
      {
        icon: Rocket,
        label: "Campaigns",
        href: "/dashboard/campaigns",
        description: "Active campaigns & performance"
      },
      {
        icon: MessageSquare,
        label: "Inbox",
        href: "/dashboard/inbox",
        description: "Unified conversation center",
        badge: "Soon"
      },
      {
        icon: Activity,
        label: "Live Activity",
        href: "/dashboard/activity",
        description: "Real-time automation status",
        badge: "Soon"
      }
    ]
  },
  {
    title: "AI TRAINING",
    items: [
      {
        icon: Package2,
        label: "Offerings",
        href: "/dashboard/offerings",
        badge: "NEW",
        description: "What you sell & how to sell it"
      },
      {
        icon: Brain,
        label: "Prompts",
        href: "/dashboard/prompts",
        description: "System prompts & templates",
        badge: "Soon"
      },
      {
        icon: Layers,
        label: "Cartridges",
        href: "/dashboard/cartridges",
        description: "LinkedIn, Email, Pod capabilities",
        submenu: [
          { label: "Voice", href: "/dashboard/voice", active: true },
          { label: "LinkedIn", href: "/dashboard/cartridges", active: true },
          { label: "Email", href: "/dashboard/cartridges/email", badge: "Soon" },
          { label: "Pod", href: "/dashboard/cartridges/pod", badge: "Soon" }
        ]
      }
    ]
  },
  {
    title: "FIND & MANAGE",
    items: [
      {
        icon: Search,
        label: "Lead Finder",
        href: "/dashboard/leads/finder",
        badge: "Soon",
        description: "Discover prospects"
      },
      {
        icon: Users2,
        label: "Prospects",
        href: "/dashboard/leads",
        description: "Manage your pipeline"
      },
      {
        icon: FileText,
        label: "Lead Magnets",
        href: "/dashboard/lead-magnets",
        description: "Content & offers"
      },
      {
        icon: BarChart,
        label: "Analytics",
        href: "/dashboard/analytics",
        badge: "Soon",
        description: "Performance insights"
      }
    ]
  },
  {
    title: "DEVELOPER",
    items: [
      {
        icon: Key,
        label: "API Keys",
        href: "/dashboard/api-keys",
        badge: "Soon",
        description: "API access management"
      },
      {
        icon: Webhook,
        label: "Webhooks",
        href: "/dashboard/webhooks",
        description: "Event subscriptions"
      },
      {
        icon: Database,
        label: "Knowledge Base",
        href: "/dashboard/knowledge-base",
        description: "Training data"
      }
    ]
  },
  {
    title: "PLATFORM",
    items: [
      {
        icon: Settings,
        label: "Settings",
        href: "/dashboard/settings",
        submenu: [
          { label: "Account", href: "/dashboard/settings/account" },
          { label: "LinkedIn Accounts", href: "/dashboard/settings/linkedin" },
          { label: "Email Accounts", href: "/dashboard/settings/email", badge: "Soon" },
          { label: "Team", href: "/dashboard/settings/team", badge: "Soon" },
          { label: "Billing", href: "/dashboard/settings/billing", badge: "Soon" }
        ]
      }
    ]
  }
]
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit 2>&1 | grep -A 3 "dashboard-sidebar"`

Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add components/dashboard/dashboard-sidebar.tsx
git commit -m "feat(menu): add new menu data structure with sections"
```

---

## Task 3: Update Dashboard Sidebar - Part 2 (Component State and Logic)

**Files:**
- Modify: `components/dashboard/dashboard-sidebar.tsx:49-70`

**Step 1: Add component state for expanded menus and credits**

In the `DashboardSidebar` component function, after the existing state declarations, add:

```typescript
export default function DashboardSidebar({ user, client }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sandboxEnabled, setSandboxEnabled] = useState(false)

  // NEW STATE - Add these lines
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [credits, setCredits] = useState<number>(0)
  const [showChat, setShowChat] = useState(false)
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    setSandboxEnabled(isSandboxMode())
    // TODO: Fetch actual credits from API/database
    setCredits(1250) // Placeholder
  }, [])

  const handleToggleSandbox = () => {
    const newMode = toggleSandboxMode()
    setSandboxEnabled(newMode)
    window.location.reload()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  // NEW FUNCTION - Add this
  const toggleSubmenu = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }

  // ... rest of component
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit 2>&1 | grep -A 3 "dashboard-sidebar"`

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add components/dashboard/dashboard-sidebar.tsx
git commit -m "feat(menu): add state management for expandable menus and credits"
```

---

## Task 4: Update Dashboard Sidebar - Part 3 (JSX Rendering)

**Files:**
- Modify: `components/dashboard/dashboard-sidebar.tsx:72-152` (return statement)

**Step 1: Replace entire return statement**

Replace the entire return statement with this complete structure:

```typescript
  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 pt-16">
      {/* Header: Sandbox Toggle + Credits */}
      <div className="px-3 pt-4 pb-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-900">RevOS</h1>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <CreditCard className="h-4 w-4" />
            <span className="font-medium">{credits}</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleSandbox}
          className={cn(
            'w-full justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
            sandboxEnabled
              ? 'bg-yellow-500 text-black hover:bg-yellow-400'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <FlaskConical className="h-4 w-4" />
          {sandboxEnabled ? 'SANDBOX MODE' : 'Live Mode'}
        </Button>
      </div>

      {/* Menu Sections */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {menuSections.map((section) => (
            <div key={section.title}>
              {/* Section Title */}
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>

              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                  const hasSubmenu = item.submenu && item.submenu.length > 0
                  const isExpanded = expandedItems.includes(item.label)

                  return (
                    <div key={item.label}>
                      {/* Main Item */}
                      <div
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                          isActive
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                          hasSubmenu ? 'cursor-pointer' : ''
                        )}
                        onClick={() => {
                          if (hasSubmenu) {
                            toggleSubmenu(item.label)
                          } else {
                            router.push(item.href)
                          }
                        }}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>

                        {item.badge && (
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded font-semibold",
                            item.badge === "NEW"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-200 text-gray-600"
                          )}>
                            {item.badge}
                          </span>
                        )}

                        {hasSubmenu && (
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                        )}
                      </div>

                      {/* Submenu */}
                      {hasSubmenu && isExpanded && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.submenu!.map(subitem => {
                            const isSubActive = pathname === subitem.href || pathname?.startsWith(subitem.href + '/')

                            return (
                              <div
                                key={subitem.href}
                                onClick={() => router.push(subitem.href)}
                                className={cn(
                                  "flex items-center justify-between py-1.5 px-3 text-sm rounded cursor-pointer transition-colors",
                                  isSubActive
                                    ? "text-gray-900 bg-gray-50 font-medium"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                )}
                              >
                                <span>{subitem.label}</span>
                                {subitem.badge && (
                                  <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-semibold">
                                    {subitem.badge}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer: Quick Actions + User Profile */}
      <div className="border-t border-gray-200 px-3 py-4 space-y-4">
        {/* Quick Actions Bar */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-2 text-xs h-9"
            onClick={() => setShowChat(true)}
            title="Chat with your AI co-founder"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Ask AI</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-2 text-xs h-9"
            onClick={() => router.push('/dashboard/campaigns/new')}
            title="Create campaign with AI"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Campaign</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-2 text-xs h-9"
            onClick={() => setShowStats(true)}
            title="Performance snapshot"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Stats</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-2 text-xs h-9"
            onClick={() => router.push('/dashboard/settings/billing')}
            title="Credit balance"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>{credits}</span>
          </Button>
        </div>

        {/* User Profile Section */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex flex-col gap-2 mb-3">
            <p className="text-xs font-medium text-gray-500 truncate">
              {user?.full_name || user?.email}
            </p>
            <p className="text-xs text-gray-400 capitalize">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-auto text-gray-500 hover:text-gray-600 hover:bg-gray-100 h-8 px-3"
            onClick={handleSignOut}
          >
            <LogOut className="h-3 w-3 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit 2>&1 | grep -A 5 "dashboard-sidebar"`

Expected: No TypeScript errors

**Step 3: Verify dev server compiles**

Run: `curl -s http://localhost:3000/dashboard 2>&1 | head -5`

Expected: HTTP 200 response (or redirect to login)

**Step 4: Commit**

```bash
git add components/dashboard/dashboard-sidebar.tsx
git commit -m "feat(menu): implement new menu UI with grouped sections, submenus, and quick actions"
```

---

## Task 5: Restart Dev Server and Manual Testing

**Files:**
- None (testing only)

**Step 1: Kill existing dev server**

Run: `pkill -f "next dev" && sleep 2`

Expected: All Next.js processes terminated

**Step 2: Start dev server**

Run: `npm run dev &`

Expected: Server starts on port 3000

**Step 3: Wait for compilation**

Run: `sleep 10 && curl -s http://localhost:3000/dashboard 2>&1 | head -3`

Expected: Page loads or redirects to login

**Step 4: Test redirects manually**

Navigate to these URLs and verify they redirect:
- `/dashboard/scheduled` → `/dashboard/campaigns`
- `/dashboard/posts` → `/dashboard/campaigns`
- `/dashboard/linkedin` → `/dashboard/settings`

**Step 5: Test submenu expansion**

Click on "Cartridges" and "Settings" items to verify submenu opens/closes.

**Step 6: Test sandbox toggle**

Click sandbox toggle in header and verify:
- Visual state changes (yellow = ON, gray = OFF)
- Page reloads
- Yellow border appears/disappears

**Step 7: Test quick actions**

Click each of the 4 quick action buttons at bottom:
- Ask AI (should trigger chat - currently placeholder)
- Campaign (should navigate to campaigns)
- Stats (should trigger stats modal - currently placeholder)
- Credits (should navigate to billing - currently placeholder route)

**Step 8: Document test results**

Create file: `docs/testing/2025-11-12-menu-redesign-results.md`

```markdown
# Menu Redesign Testing Results

**Date**: 2025-11-12
**Tested By**: [Your Name]
**Browser**: [Browser + Version]

## Redirects
- [ ] `/dashboard/scheduled` → `/dashboard/campaigns`
- [ ] `/dashboard/posts` → `/dashboard/campaigns`
- [ ] `/dashboard/linkedin` → `/dashboard/settings`

## UI Components
- [ ] Menu sections render correctly
- [ ] Cartridges submenu expands/collapses
- [ ] Settings submenu expands/collapses
- [ ] Sandbox toggle works (header)
- [ ] Credits display in header
- [ ] Quick actions bar visible at bottom

## Navigation
- [ ] All menu items clickable
- [ ] Active state highlights correctly
- [ ] Submenu items navigate properly
- [ ] Quick action buttons trigger expected behavior

## Issues Found
[List any bugs or unexpected behavior]

## Screenshots
[Attach screenshot showing new menu structure]
```

**Step 9: No commit (manual testing only)**

---

## Task 6: Create Placeholder Pages for "Soon" Routes

**Files:**
- Create: `app/dashboard/inbox/page.tsx`
- Create: `app/dashboard/activity/page.tsx`
- Create: `app/dashboard/prompts/page.tsx`
- Create: `app/dashboard/leads/finder/page.tsx`
- Create: `app/dashboard/analytics/page.tsx`
- Create: `app/dashboard/api-keys/page.tsx`

**Step 1: Create Inbox placeholder**

```typescript
// app/dashboard/inbox/page.tsx
export default function InboxPage() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Inbox</h1>
        <p className="text-gray-600 mb-4">Unified conversation center</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-900 font-semibold">Coming Soon</p>
          <p className="text-blue-700 text-sm mt-2">
            Unified inbox for all LinkedIn conversations, DMs, and email replies.
          </p>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Create Activity placeholder**

```typescript
// app/dashboard/activity/page.tsx
export default function ActivityPage() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Live Activity</h1>
        <p className="text-gray-600 mb-4">Real-time automation status</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-900 font-semibold">Coming Soon</p>
          <p className="text-blue-700 text-sm mt-2">
            Monitor your campaigns, posts, and outreach in real-time.
          </p>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Create Prompts placeholder**

```typescript
// app/dashboard/prompts/page.tsx
export default function PromptsPage() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Prompts</h1>
        <p className="text-gray-600 mb-4">System prompts & templates</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-900 font-semibold">Coming Soon</p>
          <p className="text-blue-700 text-sm mt-2">
            Customize system prompts and conversation templates.
          </p>
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Create Lead Finder placeholder**

```typescript
// app/dashboard/leads/finder/page.tsx
export default function LeadFinderPage() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Lead Finder</h1>
        <p className="text-gray-600 mb-4">Discover prospects</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-900 font-semibold">Coming Soon</p>
          <p className="text-blue-700 text-sm mt-2">
            AI-powered lead discovery and qualification.
          </p>
        </div>
      </div>
    </div>
  )
}
```

**Step 5: Create Analytics placeholder**

```typescript
// app/dashboard/analytics/page.tsx
export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Analytics</h1>
        <p className="text-gray-600 mb-4">Performance insights</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-900 font-semibold">Coming Soon</p>
          <p className="text-blue-700 text-sm mt-2">
            Comprehensive analytics and reporting dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}
```

**Step 6: Create API Keys placeholder**

```typescript
// app/dashboard/api-keys/page.tsx
export default function APIKeysPage() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">API Keys</h1>
        <p className="text-gray-600 mb-4">API access management</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-900 font-semibold">Coming Soon</p>
          <p className="text-blue-700 text-sm mt-2">
            Generate and manage API keys for programmatic access.
          </p>
        </div>
      </div>
    </div>
  )
}
```

**Step 7: Verify TypeScript compilation**

Run: `npx tsc --noEmit 2>&1 | grep -E "(inbox|activity|prompts|finder|analytics|api-keys)"`

Expected: No TypeScript errors

**Step 8: Test placeholder pages load**

Run: `curl -s http://localhost:3000/dashboard/inbox | grep "Coming Soon"`

Expected: "Coming Soon" text appears

**Step 9: Commit**

```bash
git add app/dashboard/inbox/ app/dashboard/activity/ app/dashboard/prompts/ app/dashboard/leads/finder/ app/dashboard/analytics/ app/dashboard/api-keys/
git commit -m "feat(menu): add placeholder pages for upcoming features"
```

---

## Task 7: Final Validation and Documentation

**Files:**
- Update: `docs/testing/2025-11-12-menu-redesign-results.md`
- Create: `docs/features/menu-redesign-overview.md`

**Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`

Expected: No errors

**Step 2: Test all menu sections**

Manually click through:
- OUTREACH section (3 items)
- AI TRAINING section (3 items + submenus)
- FIND & MANAGE section (4 items)
- DEVELOPER section (3 items)
- PLATFORM section (1 item + submenu)

**Step 3: Capture screenshot**

Take screenshot showing:
- New grouped menu structure
- Sandbox toggle in header
- Credits display
- Quick actions bar at bottom
- One expanded submenu

Save to: `docs/screenshots/2025-11-12-menu-redesign.png`

**Step 4: Create feature documentation**

```markdown
# Menu Redesign Overview

**Date**: 2025-11-12
**Status**: Complete

## Changes Made

### 1. Menu Structure
- **OUTREACH**: Campaigns, Inbox (soon), Live Activity (soon)
- **AI TRAINING**: Offerings (NEW), Prompts (soon), Cartridges (submenu)
- **FIND & MANAGE**: Lead Finder (soon), Prospects, Lead Magnets, Analytics (soon)
- **DEVELOPER**: API Keys (soon), Webhooks, Knowledge Base
- **PLATFORM**: Settings (submenu)

### 2. UI Improvements
- Sandbox toggle moved to header (was at bottom)
- Credit display in header
- Quick actions bar at footer (Ask AI, Campaign, Stats, Credits)
- Collapsible submenus for Cartridges and Settings

### 3. Route Consolidation
Redirects configured:
- `/dashboard/scheduled` → `/dashboard/campaigns`
- `/dashboard/posts` → `/dashboard/campaigns`
- `/dashboard/dm-sequences` → `/dashboard/campaigns`
- `/dashboard/linkedin` → `/dashboard/settings`

### 4. New Pages
Placeholder pages created for "Soon" features:
- Inbox, Activity, Prompts, Lead Finder, Analytics, API Keys

## Technical Details

**Files Modified:**
- `next.config.js` - Added 7 route redirects
- `components/dashboard/dashboard-sidebar.tsx` - Complete redesign

**Files Created:**
- `app/dashboard/inbox/page.tsx`
- `app/dashboard/activity/page.tsx`
- `app/dashboard/prompts/page.tsx`
- `app/dashboard/leads/finder/page.tsx`
- `app/dashboard/analytics/page.tsx`
- `app/dashboard/api-keys/page.tsx`

## Testing Checklist
- [x] All menu sections render
- [x] Submenus expand/collapse
- [x] Redirects work
- [x] Sandbox toggle functional
- [x] Quick actions visible
- [x] Placeholder pages accessible

## Screenshots
See: `docs/screenshots/2025-11-12-menu-redesign.png`
```

**Step 5: Update testing results document**

Fill in all checkboxes and add screenshot link.

**Step 6: Commit documentation**

```bash
git add docs/testing/2025-11-12-menu-redesign-results.md docs/features/menu-redesign-overview.md docs/screenshots/2025-11-12-menu-redesign.png
git commit -m "docs(menu): add testing results and feature overview"
```

**Step 7: Create summary report**

Print to console:

```bash
echo "====================================="
echo "Menu Redesign Implementation Complete"
echo "====================================="
echo ""
echo "Commits: 7"
echo "Files Modified: 2"
echo "Files Created: 8"
echo ""
echo "Key Changes:"
echo "- Grouped menu structure (5 sections)"
echo "- Collapsible submenus (2 items)"
echo "- Sandbox toggle in header"
echo "- Quick actions bar (4 buttons)"
echo "- Route redirects (7 redirects)"
echo "- Placeholder pages (6 pages)"
echo ""
echo "Next Steps:"
echo "1. User review and feedback"
echo "2. Implement 'Soon' features"
echo "3. Connect quick actions to real functionality"
echo ""
```

---

## Success Criteria

**All tasks complete when:**

1. ✅ Menu displays 5 grouped sections
2. ✅ Cartridges and Settings have working submenus
3. ✅ Sandbox toggle visible in header
4. ✅ Credits display in header
5. ✅ Quick actions bar at bottom with 4 buttons
6. ✅ All redirects functional
7. ✅ Placeholder pages accessible
8. ✅ No TypeScript errors
9. ✅ All navigation working
10. ✅ Screenshot captured
11. ✅ Documentation complete

---

## Rollback Plan

If issues occur:

```bash
# Revert all commits
git log --oneline | head -7  # Identify commit hashes
git revert <commit-hash> --no-edit  # Repeat for each commit

# Or reset to before this work
git reset --hard HEAD~7
```

---

## Notes

- **Credits**: Currently hardcoded to 1250. TODO: Fetch from API
- **Quick Actions**: "Ask AI" and "Stats" are placeholders (setShow* state)
- **Submenu State**: Not persisted - resets on page reload
- **Active Routes**: Uses pathname matching (may need refinement)
- **Offerings Page**: Already exists, marked as NEW in menu
- **Legacy Routes**: Old dashboard routes still exist but hidden from menu

---

## Related Documentation

- Previous menu structure: `components/dashboard/dashboard-sidebar.tsx` (git history)
- Sandbox mode implementation: `lib/sandbox/sandbox-wrapper.ts`
- Dashboard layout: `app/dashboard/layout.tsx`
- Redirects config: `next.config.js`
