# CC2 Quick Start Guide - Lead Magnet Library Tab

## 🎯 Your Mission
Add a "Library" tab to `/dashboard/lead-magnets` page showing 98 pre-built lead magnets.

## ⏱️ Time Estimate
3 hours total

---

## Step 1: Create API Route (30 min)

Create file: `app/api/lead-magnet-library/route.ts`

```bash
# Test after creation:
curl http://localhost:3000/api/lead-magnet-library
# Should return 98 magnets
```

---

## Step 2: Install Tabs Component (5 min)

```bash
npx shadcn-ui@latest add tabs
```

---

## Step 3: Refactor Main Page (30 min)

File: `app/dashboard/lead-magnets/page.tsx`

**Before**: Single component with custom magnets
**After**: Tabs with two panels

Wrap existing code in:
```tsx
<Tabs defaultValue="library">
  <TabsList>
    <TabsTrigger value="library">Library</TabsTrigger>
    <TabsTrigger value="custom">My Custom</TabsTrigger>
  </TabsList>
  
  <TabsContent value="library">
    <LibraryTab />
  </TabsContent>
  
  <TabsContent value="custom">
    {/* Move existing code here */}
  </TabsContent>
</Tabs>
```

---

## Step 4: Build Library Tab (1.5 hours)

Create file: `components/dashboard/lead-magnet-library-tab.tsx`

**Features needed**:
- Fetch from `/api/lead-magnet-library`
- Search input
- Category filter pills
- Grid of magnet cards
- Actions: Preview URL, Use in Campaign

**Copy structure from**: Existing custom magnets grid

---

## Step 5: Test (30 min)

```bash
# Start dev server
npm run dev

# Check:
1. Both tabs render
2. Library shows 98 magnets
3. Search filters correctly
4. Category pills work
5. Custom tab still works
```

---

## 📋 Quick Checklist

- [ ] API route created and tested
- [ ] Tabs component added
- [ ] Main page refactored with tabs
- [ ] Library tab component created
- [ ] Search works
- [ ] Category filter works
- [ ] Preview button opens URL
- [ ] Use in Campaign navigates correctly
- [ ] Custom tab still functional
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] No console errors

---

## 🆘 If Stuck

**Problem**: Can't find existing library modal logic
**Solution**: Check `components/dashboard/lead-magnet-library-modal.tsx` for reference

**Problem**: Categories unclear
**Solution**: Use these 8 categories:
```
All, AI & Automation, LinkedIn & Growth, Sales & Outreach, 
Email & Nurturing, Tools & Systems, General, Content Creation
```

**Problem**: TypeScript errors
**Solution**: Run `npx tsc --noEmit` to see specific errors

---

## 📖 Full Documentation

See complete implementation plan:
`docs/projects/bravo-revos/LEAD_MAGNET_LIBRARY_TAB_IMPLEMENTATION.md`

---

## ✅ Done Criteria

User can:
1. See two tabs: "Library" and "My Custom Magnets"
2. Browse 98 library magnets in Library tab
3. Search and filter library magnets
4. Preview magnet URLs
5. Use magnets in campaigns
6. Still manage custom uploads in Custom tab

---

**Ready to start?** Begin with Step 1: Create the API route!
