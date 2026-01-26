# Lead Magnet Library Tab - Implementation Plan

**Task ID:** TBD (Create in Archon)
**Epic:** Lead Magnet System Completion  
**Branch:** v1-lead-magnet  
**Story Points:** 3  
**Status:** todo → doing  
**Priority:** HIGH

---

## 📋 Context

### Current State
- ✅ **Custom Magnets Tab**: Fully functional CRUD for client uploads
- ✅ **Library Modal**: Exists in campaign wizard, showing 98 magnets
- ❌ **Lead Magnets Page**: Only shows custom uploads (incomplete)

### Problem
Users cannot browse the 98-magnet library from the main Lead Magnets dashboard. They can only access it through the campaign wizard modal.

### Solution
Add a two-tab interface to `/dashboard/lead-magnets/page.tsx`:
- **Tab 1: Library** - Browse 98 pre-built magnets
- **Tab 2: My Custom Magnets** - Existing functionality

---

## 📚 Architecture Context

### Tables

#### `lead_magnet_library` (98 rows - Global/Shared)
```sql
CREATE TABLE lead_magnet_library (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,          -- External link (not file upload)
  category TEXT,              -- 8 categories
  is_active BOOLEAN DEFAULT true,
  client_id UUID,             -- NULL = global, non-null = client-specific
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### `lead_magnets` (Client Uploads)
```sql
CREATE TABLE lead_magnets (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,    -- Supabase Storage path
  file_size INTEGER,
  file_type TEXT,
  tags TEXT[],
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### API Endpoints

#### `/api/lead-magnets` (Existing - Custom Magnets)
```typescript
GET /api/lead-magnets  // Returns client's custom uploads
POST /api/lead-magnets // Create new custom magnet
```

#### `/api/lead-magnet-library` (To be created)
```typescript
GET /api/lead-magnet-library?search=...&category=...
// Returns global + client-specific library magnets
```

### Existing Components

#### `LeadMagnetLibraryModal` 
Location: `components/dashboard/lead-magnet-library-modal.tsx`
- Already fetches from `lead_magnet_library`
- Has search & category filtering
- Returns selected magnet via callback

**Strategy**: Extract the core UI/logic and reuse in the Library tab

---

## 🎯 Implementation Plan (3 hours)

### Phase 1: Add Library API Route (30 min)

**File**: `app/api/lead-magnet-library/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get client_id
  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (!userData?.client_id) {
    return new Response('No client found', { status: 400 })
  }

  // Get query params
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''

  // Build query: global (client_id IS NULL) OR client-specific
  let query = supabase
    .from('lead_magnet_library')
    .select('*')
    .eq('is_active', true)
    .or(`client_id.is.null,client_id.eq.${userData.client_id}`)

  // Apply filters
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }
  if (category && category !== 'All') {
    query = query.eq('category', category)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ 
    success: true, 
    data: data || [],
    count: data?.length || 0
  })
}
```

**Validation**:
- Test: `curl http://localhost:3000/api/lead-magnet-library`
- Should return 98 magnets (or global + client-specific)

---

### Phase 2: Refactor Page to Tabs (1 hour)

**File**: `app/dashboard/lead-magnets/page.tsx`

**Changes**:

1. Add Tabs component from shadcn/ui
2. Create two tab panels:
   - Library (new)
   - My Custom Magnets (move existing code here)

**Structure**:
```typescript
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function LeadMagnetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader />
      
      <Tabs defaultValue="library" className="space-y-6">
        <TabsList>
          <TabsTrigger value="library">
            Library (98 templates)
          </TabsTrigger>
          <TabsTrigger value="custom">
            My Custom Magnets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <LibraryTab />
        </TabsContent>

        <TabsContent value="custom">
          <CustomMagnetsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

### Phase 3: Build Library Tab Component (1 hour)

**File**: `components/dashboard/lead-magnet-library-tab.tsx`

**Features**:
- Fetch from `/api/lead-magnet-library`
- Search input
- Category filter pills (8 categories)
- Grid layout (same as custom tab)
- Actions per magnet:
  - **Preview URL** (open in new tab)
  - **Use in Campaign** (navigate to wizard)
  - **Copy to Custom** (optional - future)

**Categories** (from existing data):
```typescript
const CATEGORIES = [
  'All',
  'AI & Automation',
  'LinkedIn & Growth',
  'Sales & Outreach',
  'Email & Nurturing',
  'Tools & Systems',
  'General'
]
```

**Code Skeleton**:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ExternalLink, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface LibraryMagnet {
  id: string
  title: string
  description: string | null
  url: string
  category: string | null
}

export function LibraryTab() {
  const router = useRouter()
  const [magnets, setMagnets] = useState<LibraryMagnet[]>([])
  const [filteredMagnets, setFilteredMagnets] = useState<LibraryMagnet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  useEffect(() => {
    loadMagnets()
  }, [])

  useEffect(() => {
    filterMagnets()
  }, [magnets, searchTerm, selectedCategory])

  const loadMagnets = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/lead-magnet-library')
      if (!response.ok) throw new Error('Failed to load library')
      
      const { data } = await response.json()
      setMagnets(data || [])
    } catch (error) {
      console.error('Error loading library:', error)
      toast.error('Failed to load lead magnet library')
    } finally {
      setIsLoading(false)
    }
  }

  const filterMagnets = () => {
    let filtered = magnets

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(m => m.category === selectedCategory)
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search)
      )
    }

    setFilteredMagnets(filtered)
  }

  const handlePreview = (url: string) => {
    window.open(url, '_blank')
  }

  const handleUseInCampaign = (magnet: LibraryMagnet) => {
    // Navigate to campaign wizard with magnet pre-selected
    router.push(`/dashboard/campaigns/new?library_magnet_id=${magnet.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <Input
            placeholder="Search library..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredMagnets.length} of {magnets.length} magnets
      </div>

      {/* Grid */}
      {isLoading ? (
        <Card><CardContent className="p-12 text-center">Loading...</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMagnets.map(magnet => (
            <Card key={magnet.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{magnet.title}</h3>
                    {magnet.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {magnet.description}
                      </p>
                    )}
                    {magnet.category && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {magnet.category}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(magnet.url)}
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUseInCampaign(magnet)}
                      className="flex-1"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Use
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### Phase 4: Analytics (Optional - 1 hour)

**Can be deferred to Phase 2**

Add tracking for:
- Which library magnets are most viewed
- Which are used in campaigns
- Download stats for custom magnets

**Implementation**:
```sql
ALTER TABLE lead_magnet_library
ADD COLUMN view_count INTEGER DEFAULT 0,
ADD COLUMN selection_count INTEGER DEFAULT 0;

-- Track in campaign_lead_magnets when library magnet used
ALTER TABLE campaign_lead_magnets
ADD COLUMN library_magnet_id UUID REFERENCES lead_magnet_library(id);
```

---

## 🔬 Testing Checklist

### API Tests
- [ ] GET `/api/lead-magnet-library` returns 98 magnets
- [ ] Search parameter filters correctly
- [ ] Category parameter filters correctly
- [ ] Auth check works (401 if not logged in)

### UI Tests
- [ ] Tabs render correctly
- [ ] Library tab shows 98 magnets
- [ ] Custom tab shows user's uploads
- [ ] Search filters work in both tabs
- [ ] Category pills filter correctly
- [ ] "Preview" opens URL in new tab
- [ ] "Use in Campaign" navigates correctly
- [ ] Mobile responsive

### Integration Tests
- [ ] Can switch between tabs without losing state
- [ ] Creating custom magnet works from Custom tab
- [ ] Library remains accessible after custom CRUD operations

---

## 📁 Files Changed

### New Files
- [ ] `app/api/lead-magnet-library/route.ts` (API endpoint)
- [ ] `components/dashboard/lead-magnet-library-tab.tsx` (Library UI)
- [ ] `components/dashboard/lead-magnet-custom-tab.tsx` (Extracted custom UI)

### Modified Files
- [ ] `app/dashboard/lead-magnets/page.tsx` (Add tabs)

### Documentation
- [ ] This implementation plan
- [ ] Task SITREP (on completion)

---

## ⚠️ Known Issues & Considerations

### Issue 1: Campaign Wizard Integration
**Problem**: Campaign wizard expects `onSelect` callback from modal, not navigation
**Solution**: Either:
- A) Keep modal for campaign wizard (current)
- B) Update wizard to check URL params for `library_magnet_id`
**Recommendation**: A (no changes needed)

### Issue 2: Copy to Custom Feature
**Decision**: Defer to future phase
**Reason**: Requires file download from URL + re-upload to Storage
**Complexity**: Medium (would add 1 hour)

### Issue 3: Category Naming
**Current Categories**: Auto-generated during import
**Validation Needed**: Check if categories are correct
**Action**: Review with stakeholder before implementing filter

---

## 🚀 Deployment

**Git Branch**: `v1-lead-magnet`
**Deployment Path**: 
1. Test locally (`npm run dev`)
2. Push to branch
3. Deploy to staging (Netlify preview)
4. User acceptance testing
5. Merge to main
6. Production deployment

**Environment Variables**: None required (uses existing Supabase config)

---

## 📊 Success Metrics

### User Experience
- [ ] Users can browse 98 library magnets
- [ ] Search finds magnets within 500ms
- [ ] Category filtering is intuitive
- [ ] Preview URLs open correctly

### Technical
- [ ] Zero TypeScript errors
- [ ] Response time < 1 second for library load
- [ ] Mobile responsive (tested on 375px width)
- [ ] Accessibility compliant (WCAG 2.1 Level AA)

---

## 📝 Notes

### Context from CC2
- CC2 built the custom magnets CRUD today
- Library was only accessible via campaign wizard modal
- This task completes the Lead Magnet system by making library browsable

### References
- Lead Magnet Completion Summary: `LEAD_MAGNET_COMPLETION_SUMMARY.md`
- Lead Magnet Library Modal: `components/dashboard/lead-magnet-library-modal.tsx`
- Campaign Wizard Integration: `components/dashboard/wizard-steps/lead-magnet-select.tsx`

---

**Document Status**: Ready for implementation
**Next Action**: 
1. Upload to Archon via `manage_document()`
2. Create task in Archon
3. Assign to CC2
4. Begin implementation
