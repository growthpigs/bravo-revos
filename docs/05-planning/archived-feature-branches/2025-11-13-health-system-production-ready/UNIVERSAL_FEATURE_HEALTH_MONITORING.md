# Universal Feature: Real-Time Health Monitoring System

**Version**: 1.0
**Created**: 2025-11-13
**Project**: Bravo revOS
**Reusability**: High - Can be dropped into any Next.js app

---

## 🎯 Feature Overview

A production-ready, real-time health monitoring system that displays service status across your application. Features a persistent top banner with color-coded status indicators and a detailed System Health dashboard.

**Key Capabilities**:
- 12 configurable service health checks
- Real-time polling (30-second intervals)
- Color-coded status visualization (green/orange/red)
- Dual views: Admin (agency-wide) + Client (client-scoped)
- Latency measurement for critical services
- Comprehensive test coverage (98 tests)

**Visual Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ LOGO V0.1  │  ● DATABASE  │  ● API      │  ● MEM0   │  ...  │
│            │  ● SUPABASE  │  ● AGENTKIT │  ● UNIPILE│  ...  │
└──────────────────────────────────────────────────────────────┘
        6 columns × 2 rows = 12 service indicators
```

---

## 📁 File Structure

```
/app/
  api/
    health/
      route.ts              # Core health check API (12 services)
  dashboard/
    layout.tsx              # Client layout with TopBar
    system-health/
      page.tsx              # Server component with client metrics
      client-page.tsx       # Client dashboard UI
  admin/
    layout.tsx              # Admin layout with TopBar
    system-health/
      system-health-client.tsx  # Admin dashboard UI

/components/
  TopBar.tsx                # Universal header with 6×2 status grid

/hooks/
  use-health-status.ts      # React hooks for data fetching + polling

/__tests__/
  health/
    api-health.test.ts                  # 25 API endpoint tests
    use-health-status.test.ts           # 35 hook tests
    TopBar.test.tsx                     # 18 component tests
    system-health-integration.test.tsx  # 20 integration tests
```

---

## 🚀 Quick Start Guide

### 1. Copy Core Files

**Required files** (copy to your project):
```bash
# API endpoint
cp app/api/health/route.ts [YOUR_PROJECT]/app/api/health/

# Components
cp components/TopBar.tsx [YOUR_PROJECT]/components/

# Hooks
cp hooks/use-health-status.ts [YOUR_PROJECT]/hooks/

# Tests (optional but recommended)
cp -r __tests__/health/ [YOUR_PROJECT]/__tests__/
```

### 2. Add TopBar to Layouts

**Client Dashboard** (`/app/dashboard/layout.tsx`):
```tsx
import { TopBar } from '@/components/TopBar'

export default function DashboardLayout({ children }) {
  return (
    <>
      <TopBar />
      <main className="pt-16"> {/* 16 = TopBar height */}
        {children}
      </main>
    </>
  )
}
```

**Admin Dashboard** (`/app/admin/layout.tsx`):
```tsx
import { TopBar } from '@/components/TopBar'

export default function AdminLayout({ children }) {
  return (
    <>
      <TopBar />
      <main className="pt-16">
        {children}
      </main>
    </>
  )
}
```

### 3. Configure Your Services

Edit `/app/api/health/route.ts` to match your app's services:

```typescript
const checks = {
  timestamp: new Date().toISOString(),

  // REQUIRED: Keep these
  database: await checkDatabase(),
  supabase: await checkSupabase(),
  api: { status: 'healthy' },

  // CUSTOMIZE: Replace with your services
  agentkit: { status: 'healthy' },    // → your_service_1
  mem0: { status: 'healthy' },         // → your_service_2
  unipile: { status: 'healthy' },      // → your_service_3
  // ... up to 12 total services
}
```

### 4. Update TopBar Service Names

Edit `/components/TopBar.tsx` to match your service names:

```tsx
{/* Column 1 - Keep database/supabase */}
<div className="flex flex-col gap-0.5">
  <span><span className={getStatusColor(data.checks.database.status)}>●</span> DATABASE</span>
  <span><span className={getStatusColor(data.checks.supabase.status)}>●</span> SUPABASE</span>
</div>

{/* Column 2 - Customize */}
<div className="flex flex-col gap-0.5">
  <span><span className={getStatusColor(data.checks.your_service_1.status)}>●</span> SERVICE 1</span>
  <span><span className={getStatusColor(data.checks.your_service_2.status)}>●</span> SERVICE 2</span>
</div>
```

### 5. Deploy and Test

```bash
npm run dev
# Open: http://localhost:3000/dashboard
# Banner should show at top with colored status dots
```

---

## 🔧 Customization Guide

### Adding a New Service Check

**Step 1**: Add health check function to `/app/api/health/route.ts`:

```typescript
async function checkYourService() {
  const startTime = Date.now()

  try {
    // Your service health check logic
    const response = await fetch('https://your-service.com/health')

    if (!response.ok) {
      return { status: 'unhealthy' as const, latency: Date.now() - startTime }
    }

    return { status: 'healthy' as const, latency: Date.now() - startTime }
  } catch (error) {
    console.error('[Health] Your Service check failed:', error)
    return { status: 'unhealthy' as const }
  }
}
```

**Step 2**: Add to checks object:

```typescript
const checks = {
  // ... existing services
  yourService: await checkYourService(),
}
```

**Step 3**: Update TypeScript interface in `/hooks/use-health-status.ts`:

```typescript
interface HealthData {
  status: string;
  checks: {
    // ... existing services
    yourService: HealthCheck;
    timestamp: string;
  };
}
```

**Step 4**: Add to TopBar display in `/components/TopBar.tsx`:

```tsx
<div className="flex flex-col gap-0.5">
  <span>
    <span className={getStatusColor(data.checks.yourService.status)}>●</span> YOUR SERVICE
  </span>
</div>
```

### Changing Polling Interval

Default is 30 seconds. To customize:

```typescript
// In any component using the hook
const { data } = useHealthStatus(60000) // 60 seconds
```

### Customizing Status Colors

Edit `getStatusColor()` function in `/components/TopBar.tsx`:

```typescript
function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return 'text-emerald-500'      // Change green shade
    case 'degraded':
      return 'text-amber-500'        // Change orange shade
    case 'unhealthy':
      return 'text-rose-600'         // Change red shade
    default:
      return 'text-slate-400'        // Change gray shade
  }
}
```

### Layout Customization

**Reduce to 4 columns** (8 services):

```tsx
{/* Remove last 2 columns from TopBar.tsx */}
<div className="flex items-start gap-3">
  {/* Column 1 */}
  {/* Column 2 */}
  {/* Column 3 */}
  {/* Column 4 */}
  {/* Delete columns 5-6 */}
</div>
```

**Single row** (6 services):

```tsx
{/* Remove second row from each column */}
<div className="flex flex-col gap-0.5">
  <span>SERVICE 1</span>
  {/* Delete second span */}
</div>
```

---

## 🧪 Testing Strategy

### Test Coverage: 98 Tests Total

**API Tests** (`api-health.test.ts` - 25 tests):
- ✅ Response structure validation
- ✅ All 12 services included
- ✅ Status calculation (healthy/degraded)
- ✅ Latency measurement
- ✅ Error handling

**Hook Tests** (`use-health-status.test.ts` - 35 tests):
- ✅ Initial data fetching
- ✅ 30-second polling mechanism
- ✅ Manual refresh function
- ✅ Error recovery
- ✅ Cleanup on unmount

**Component Tests** (`TopBar.test.tsx` - 18 tests):
- ✅ Rendering with data
- ✅ All 12 services display
- ✅ Color coding logic
- ✅ Responsive layout
- ✅ Loading states

**Integration Tests** (`system-health-integration.test.tsx` - 20 tests):
- ✅ Client dashboard flow
- ✅ Admin dashboard flow
- ✅ Metrics display
- ✅ Real-time refresh

### Running Tests

```bash
# All health tests
npm test -- __tests__/health

# Specific test file
npm test -- __tests__/health/api-health.test.ts

# Watch mode
npm test -- --watch __tests__/health
```

### Writing Custom Tests

```typescript
import { render, screen } from '@testing-library/react'
import { TopBar } from '@/components/TopBar'

// Mock the health hook
jest.mock('@/hooks/use-health-status', () => ({
  useHealthStatus: jest.fn(() => ({
    data: {
      status: 'healthy',
      checks: {
        database: { status: 'healthy', latency: 45 },
        // ... your services
      }
    },
    isLoading: false,
  })),
}))

test('displays your custom service', () => {
  render(<TopBar />)
  expect(screen.getByText('YOUR SERVICE')).toBeInTheDocument()
})
```

---

## 🏗️ Architecture Deep Dive

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. API Endpoint (/app/api/health/route.ts)             │
│    - Runs health checks for all 12 services            │
│    - Returns JSON with status + latency                │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTP GET /api/health
                  ↓
┌─────────────────────────────────────────────────────────┐
│ 2. React Hook (hooks/use-health-status.ts)             │
│    - Fetches data on mount                             │
│    - Polls every 30 seconds                            │
│    - Provides data to components                       │
└─────────────────┬───────────────────────────────────────┘
                  │ { data, isLoading, refresh }
                  ↓
┌─────────────────────────────────────────────────────────┐
│ 3. UI Components                                        │
│    - TopBar: 6×2 grid banner                           │
│    - System Health: Detailed dashboard                 │
└─────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App Root
├── Dashboard Layout
│   ├── TopBar (client component)
│   │   └── useHealthStatus() → /api/health
│   └── System Health Page (server component)
│       └── System Health Client (client component)
│           └── useHealthStatus() → /api/health
│
└── Admin Layout
    ├── TopBar (client component)
    │   └── useHealthStatus() → /api/health
    └── Admin System Health (client component)
        └── useHealthStatus() → /api/health
```

### State Management

**Client-side state** (React hooks):
```typescript
// Health data state
const [data, setData] = useState<HealthData | null>(null)

// Loading state
const [isLoading, setIsLoading] = useState(true)

// Polling mechanism
useEffect(() => {
  fetchHealth()
  const interval = setInterval(fetchHealth, 30000)
  return () => clearInterval(interval)
}, [])
```

**Server-side state** (Next.js Server Components):
- Page-level data fetching for metrics (campaigns, leads, etc.)
- No state on server - fetch fresh on each request

### Database Integration

**Health check implementation**:
```typescript
async function checkDatabase() {
  const startTime = Date.now()
  const supabase = await createClient({ isServiceRole: true })

  try {
    const { error } = await supabase.from('users').select('id').limit(1)
    const latency = Date.now() - startTime

    if (error) throw error

    return {
      status: latency > 1000 ? 'degraded' : 'healthy',
      latency
    }
  } catch (error) {
    return { status: 'unhealthy' }
  }
}
```

**Key points**:
- Uses service role key (bypasses RLS)
- Measures latency for performance monitoring
- Degrades gracefully (unhealthy → degraded → healthy)

---

## 🔒 Security Considerations

### 1. Authentication (TODO)

**Current state**: `/api/health` endpoint is public (no auth required)

**Recommended for production**:

```typescript
// app/api/health/route.ts
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // Option A: Require any authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Option B: Require admin role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Proceed with health checks...
}
```

### 2. Rate Limiting (TODO)

**Problem**: Public endpoint can be hammered

**Solution using Upstash Redis**:

```typescript
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const redis = Redis.fromEnv()
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
})

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  // Proceed with health checks...
}
```

### 3. Sensitive Data Exposure

**What NOT to return**:
- Database connection strings
- API keys
- Internal IP addresses
- Detailed error stack traces

**Safe response format**:
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy',  // ✅ Safe
  latency: 45,                                    // ✅ Safe
  lastCheck: '2025-11-13T10:30:00Z',             // ✅ Safe

  // ❌ DO NOT INCLUDE:
  connectionString: 'postgresql://...',
  internalIP: '10.0.1.5',
  errorStack: 'Error at line 42...'
}
```

### 4. CORS Configuration

If health endpoint needs external access:

```typescript
export async function GET(request: Request) {
  const response = NextResponse.json({ /* health data */ })

  // Restrict to specific origins
  response.headers.set('Access-Control-Allow-Origin', 'https://status.yourdomain.com')
  response.headers.set('Access-Control-Allow-Methods', 'GET')

  return response
}
```

---

## 🚀 Production Deployment

### Environment Variables

**Required**:
```bash
# .env.local (Next.js convention)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Backend only
```

**Optional (for external services)**:
```bash
AGENTKIT_API_KEY=...
MEM0_API_KEY=...
UNIPILE_API_KEY=...
```

### Build Verification

```bash
# TypeScript check
npx tsc --noEmit

# Run tests
npm test -- __tests__/health

# Build check
npm run build

# Production test
npm run start
curl http://localhost:3000/api/health
```

### Deployment Checklist

- [ ] All environment variables set in hosting platform
- [ ] Health checks return 200 status
- [ ] TopBar displays on all protected routes
- [ ] Status dots show correct colors (not all gray)
- [ ] Polling works without memory leaks
- [ ] Tests pass in CI/CD pipeline
- [ ] TypeScript compilation succeeds
- [ ] No console errors in browser
- [ ] Mobile responsive (test on phone)
- [ ] Authentication added (if required)
- [ ] Rate limiting configured (if public)

### Platform-Specific Notes

**Vercel**:
- API routes have 10-second timeout (default)
- Increase if health checks are slow: `export const maxDuration = 30`

**Netlify**:
- Use Netlify Functions for API routes
- Configure function timeout in `netlify.toml`

**Render**:
- Health endpoint perfect for Render's built-in health checks
- Configure in `render.yaml`:
  ```yaml
  services:
    - type: web
      healthCheckPath: /api/health
  ```

---

## 🐛 Troubleshooting

### Issue: Banner Not Showing

**Symptoms**: TopBar renders but no health status dots visible

**Diagnosis**:
1. Check browser console: `fetch('/api/health')` succeeds?
2. Check API response: `curl http://localhost:3000/api/health`
3. Check React DevTools: `useHealthStatus` hook has data?

**Common causes**:
- ❌ Conditional rendering hiding banner: `{data && isVisible && (...)}`
- ❌ API returning 500 error
- ❌ CORS blocking request (if separate frontend domain)
- ❌ Webpack cache corruption (clear with `rm -rf .next`)

**Solution**:
```tsx
// TopBar.tsx - Remove unnecessary conditions
{data && (  // Only check data exists
  <div>
    {/* Status dots */}
  </div>
)}
```

### Issue: All Dots Are Gray

**Symptoms**: Status dots display but all are gray instead of colored

**Diagnosis**:
1. Inspect `data.checks.database.status` in browser console
2. Check if API returns status values or undefined

**Common causes**:
- ❌ API not returning status field for services
- ❌ Service check functions returning wrong format
- ❌ TypeScript interface mismatch

**Solution**:
```typescript
// Ensure all checks return proper format
const checks = {
  database: { status: 'healthy', latency: 45 },  // ✅ Correct
  api: 'healthy',                                 // ❌ Wrong - needs object
}
```

### Issue: TypeScript Errors

**Symptoms**: `Property 'agentkit' does not exist on type 'HealthData'`

**Diagnosis**: Interface in `use-health-status.ts` doesn't match API response

**Solution**:
```typescript
// hooks/use-health-status.ts
interface HealthData {
  checks: {
    database: HealthCheck;
    supabase: HealthCheck;
    agentkit: HealthCheck;  // ✅ Add missing service
    // ... all 12 services
  };
}
```

### Issue: Memory Leak / Performance

**Symptoms**: Browser slows down over time, memory usage increases

**Diagnosis**: Polling interval not cleaned up on component unmount

**Solution**:
```typescript
// Hook already has proper cleanup
useEffect(() => {
  fetchHealth()
  const interval = setInterval(fetchHealth, refreshInterval)
  return () => clearInterval(interval)  // ✅ Cleanup function
}, [refreshInterval])
```

**Additional check**:
```typescript
// Make sure components using hook are properly memoized
const MemoizedTopBar = React.memo(TopBar)
```

### Issue: Stale Data

**Symptoms**: Status dots don't update even when services change

**Diagnosis**:
1. Check polling is working: Add `console.log` to `fetchHealth()`
2. Check interval timer: Use `setInterval` not `setTimeout`
3. Check server caching: API might be returning cached response

**Solution**:
```typescript
// Add cache-control header to API
export async function GET() {
  const data = { /* health checks */ }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
```

---

## 📊 Monitoring & Observability

### Logging Strategy

**API endpoint logging**:
```typescript
// app/api/health/route.ts
export async function GET() {
  const startTime = Date.now()

  try {
    const checks = await runAllHealthChecks()
    const duration = Date.now() - startTime

    console.log(`[Health] Check completed in ${duration}ms`, {
      overall: checks.status,
      services: Object.keys(checks.checks).length,
    })

    return NextResponse.json({ status: checks.status, checks })
  } catch (error) {
    console.error('[Health] Fatal error:', error)
    return NextResponse.json(
      { status: 'unhealthy', error: 'System error' },
      { status: 500 }
    )
  }
}
```

**Client-side logging**:
```typescript
// hooks/use-health-status.ts
const fetchHealth = async () => {
  try {
    const response = await fetch('/api/health')
    if (response.ok) {
      const result = await response.json()
      setData(result)

      // Log degraded/unhealthy states only
      if (result.status !== 'healthy') {
        console.warn('[Health] System degraded:', result.checks)
      }
    }
  } catch (error) {
    console.error('[Health] Failed to fetch:', error)
  }
}
```

### Alerting Integration

**Sentry example**:
```typescript
import * as Sentry from '@sentry/nextjs'

async function checkDatabase() {
  try {
    // ... health check logic
  } catch (error) {
    Sentry.captureException(error, {
      tags: { service: 'database' },
      level: 'error',
    })
    return { status: 'unhealthy' }
  }
}
```

**Custom webhook example**:
```typescript
async function notifyIfUnhealthy(checks: HealthChecks) {
  const unhealthyServices = Object.entries(checks)
    .filter(([_, check]) => check.status === 'unhealthy')
    .map(([name]) => name)

  if (unhealthyServices.length > 0) {
    await fetch('https://your-alerting-webhook.com', {
      method: 'POST',
      body: JSON.stringify({
        alert: 'Services unhealthy',
        services: unhealthyServices,
        timestamp: new Date().toISOString(),
      }),
    })
  }
}
```

### Metrics Collection

**Track health check performance**:
```typescript
// Store metrics in database
async function recordHealthMetrics(checks: HealthChecks) {
  const supabase = await createClient({ isServiceRole: true })

  await supabase.from('health_metrics').insert({
    timestamp: new Date().toISOString(),
    database_latency: checks.database.latency,
    overall_status: checks.status,
    unhealthy_count: Object.values(checks)
      .filter(c => c.status === 'unhealthy')
      .length,
  })
}
```

---

## 🔄 Migration from Other Systems

### From Manual Health Checks

**Before** (manual status page):
```typescript
// Old approach: Static status page
export default function StatusPage() {
  return (
    <div>
      <p>Database: ✅ Operational</p>
      <p>API: ✅ Operational</p>
    </div>
  )
}
```

**After** (this system):
1. Copy files from Quick Start Guide
2. Add TopBar to layout
3. Replace static page with System Health component
4. Deploy - now updates every 30 seconds automatically

### From External Status Services (StatusPage.io, etc.)

**Migration steps**:
1. Keep external service as backup (recommended)
2. Implement this system for internal dashboards
3. Optionally sync data: External service ← API endpoint
4. Configure external service to poll `/api/health`

### From Custom Solutions

**If you have existing health checks**:
1. Port check functions to `/app/api/health/route.ts` format
2. Update return format to `{ status, latency }`
3. Map your status values: operational → healthy, partial → degraded, down → unhealthy
4. Preserve your alerting logic (can run alongside this system)

---

## 📈 Performance Considerations

### API Response Time

**Target**: < 500ms for all checks

**Optimization strategies**:
1. **Parallel checks**: Run all service checks concurrently
   ```typescript
   const checks = await Promise.all([
     checkDatabase(),
     checkSupabase(),
     checkAgentKit(),
     // ... all services
   ])
   ```

2. **Timeout limits**: Don't let slow services block response
   ```typescript
   const timeoutPromise = new Promise((resolve) =>
     setTimeout(() => resolve({ status: 'unhealthy' }), 5000)
   )

   const result = await Promise.race([
     checkYourService(),
     timeoutPromise
   ])
   ```

3. **Caching** (optional): Cache for 5 minutes on server
   ```typescript
   let cachedChecks = null
   let cacheTime = 0

   export async function GET() {
     const now = Date.now()
     if (cachedChecks && now - cacheTime < 300000) {
       return NextResponse.json(cachedChecks)
     }

     cachedChecks = await runHealthChecks()
     cacheTime = now
     return NextResponse.json(cachedChecks)
   }
   ```

### Client-Side Performance

**Bundle size impact**:
- TopBar component: ~3KB gzipped
- Hook: ~1KB gzipped
- Total addition: < 5KB to client bundle

**Runtime impact**:
- Polling: 1 fetch request every 30 seconds (minimal)
- Rendering: Static grid layout (no expensive operations)
- Memory: Negligible (<1MB for polling state)

### Database Load

**With 100 users polling every 30 seconds**:
- 100 * 2 requests/min = 200 requests/min
- 200 * 60 = 12,000 requests/hour
- With 5-minute server cache: ~40 requests/hour to database

**Recommendation**: Implement 5-minute server-side caching for production

---

## 🎨 UI Customization Examples

### Dark Mode Support

```typescript
// components/TopBar.tsx
import { useTheme } from 'next-themes'

export function TopBar() {
  const { theme } = useTheme()

  return (
    <header className={`
      fixed top-0 left-0 right-0 h-16
      ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
      border-b flex items-center justify-between px-6 z-40
    `}>
      {/* ... content */}
    </header>
  )
}
```

### Compact Mode (Single Row)

```tsx
{/* Show only 6 most critical services in 1 row */}
<div className="font-mono text-[8pt] uppercase text-gray-600 flex items-center gap-3">
  <span><span className={getStatusColor(data.checks.database.status)}>●</span> DB</span>
  <span><span className={getStatusColor(data.checks.api.status)}>●</span> API</span>
  <span><span className={getStatusColor(data.checks.agentkit.status)}>●</span> AGENT</span>
  <span><span className={getStatusColor(data.checks.mem0.status)}>●</span> MEM</span>
  <span><span className={getStatusColor(data.checks.unipile.status)}>●</span> SOCIAL</span>
  <span><span className={getStatusColor(data.checks.email.status)}>●</span> EMAIL</span>
</div>
```

### Animated Status Changes

```tsx
import { motion } from 'framer-motion'

<motion.span
  className={getStatusColor(status)}
  animate={{ scale: status === 'unhealthy' ? [1, 1.2, 1] : 1 }}
  transition={{ repeat: Infinity, duration: 1 }}
>
  ●
</motion.span>
```

### Tooltip with Details

```tsx
import * as Tooltip from '@radix-ui/react-tooltip'

<Tooltip.Root>
  <Tooltip.Trigger>
    <span className={getStatusColor(data.checks.database.status)}>●</span>
  </Tooltip.Trigger>
  <Tooltip.Content>
    Database: {data.checks.database.status}
    <br />
    Latency: {data.checks.database.latency}ms
    <br />
    Last check: {data.checks.timestamp}
  </Tooltip.Content>
</Tooltip.Root>
```

---

## 📚 Additional Resources

### Related Documentation
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [React Hooks](https://react.dev/reference/react)
- [Supabase Health Checks](https://supabase.com/docs/guides/platform/health)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Testing Resources
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW (Mock Service Worker)](https://mswjs.io/)

### Example Implementations
- Bravo revOS (this project)
- Reference implementation: `/app/api/health/route.ts`
- Full test suite: `/__tests__/health/`

---

## 🤝 Contributing

When reusing this feature in new projects:

1. **Report issues**: Document any edge cases or bugs discovered
2. **Share improvements**: Submit PRs with enhancements
3. **Update documentation**: Keep this guide current with best practices
4. **Add examples**: Contribute integration examples for other frameworks

---

## 📝 Version History

### v1.0 (2025-11-13)
- ✅ Initial universal feature release
- ✅ 12 configurable service checks
- ✅ Real-time 30-second polling
- ✅ 98 comprehensive tests
- ✅ Client + Admin dashboard views
- ✅ Production-ready architecture
- ⏳ TODO: Authentication + rate limiting
- ⏳ TODO: Server-side caching (5 minutes)

---

## 🎓 Learning Outcomes

By implementing this feature, you'll learn:

1. **Next.js App Router**: Server components, API routes, client components
2. **React Hooks**: Custom hooks, useEffect cleanup, polling patterns
3. **TypeScript**: Interface design, type safety across boundaries
4. **Testing**: Comprehensive test coverage strategy
5. **Performance**: Caching, parallel async operations, bundle optimization
6. **Architecture**: Clean separation of concerns, reusable components

---

**End of Universal Feature Documentation**

*This document can be copied to any Next.js project and customized for that project's specific services and requirements.*