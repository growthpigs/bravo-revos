# Chat-Driven UI Orchestration - Specification

**Feature:** HGC guides users through UI with real-time visible updates
**Branch:** `feat/2025-11-14-chat-driven-ui-orchestration`
**Timeline:** 2-3 days
**Priority:** CRITICAL - This IS the core value proposition

## The Paradigm Shift

**OLD:** AI does things in background, tells you later
**NEW:** AI guides you through UI, you watch it happen

## Core Concept

HGC is your co-pilot who:
1. Navigates to the right page
2. Fills in forms while you watch
3. Clicks buttons for you
4. Shows you what's happening
5. Builds confidence through visibility

## Three-Layer Architecture

### Layer 1: Navigation Control
```typescript
// HGC can programmatically navigate
navigateTo('/dashboard/campaigns/new')
// User sees: "Opening campaign builder..."
```

### Layer 2: Form Control
```typescript
// HGC fills forms user is watching
fillField('campaign_name', 'AI Leadership for CTOs')
// User watches value appear in real-time
```

### Layer 3: Background Automation
- ONLY after visible creation completes
- Monitor comments, auto-DM, extract emails
- User already saw the campaign get built

## LinkedIn Campaign Flow (Complete UX)

```
User: "Create LinkedIn campaign"
AI: [Navigates to /dashboard/campaigns/new]
AI: "What's it about?"
User: "AI for CTOs"
AI: [Fills campaign name field]
AI: [Fills target audience field]
AI: "Need a lead magnet?" [BUTTONS]
User: [YES - AI CREATE]
AI: [Navigates to /dashboard/offers/new]
AI: [Generates PDF]
AI: [Shows progress bar]
AI: [Attaches to campaign]
AI: "Ready to write post?" [BUTTONS]
User: [AI WRITE POST]
AI: [Types post in editor]
AI: "Edit or post now?" [BUTTONS]
User: [POST TO LINKEDIN]
AI: [Posts, shows success]
AI: "Alert pod?" [BUTTONS]
User: [ALERT POD]
AI: [Sends to 12 members]
AI: "Done! Monitoring comments for leads."
```

## Implementation Components

### 1. Navigation API
```typescript
interface NavigationAPI {
  navigateTo(path: string): void
  getCurrentPath(): string
  showNavigationToast(message: string): void
}
```

### 2. Form Control API
```typescript
interface FormControlAPI {
  fillField(fieldId: string, value: any): void
  clickButton(buttonId: string): void
  selectOption(selectId: string, value: string): void
  triggerSubmit(formId: string): void
}
```

### 3. Inline Button System
```typescript
interface InlineButton {
  label: string
  action: () => void
  navigateTo?: string
  executeTools?: string[]
}
```

### 4. Progress Indicators
- Show what HGC is doing
- Progress bars for generation
- Success/error states
- "AI is typing..." indicators

## Why This Works

1. **Trust Through Transparency:** User sees everything
2. **Control Maintained:** User can intervene anytime
3. **Learning by Watching:** User learns the UI
4. **Confidence Building:** No mystery black box
5. **Faster Than Manual:** But still visible

## Success Criteria

✅ User says "create campaign" and watches it build
✅ Every form fill is visible in real-time
✅ Navigation changes are smooth and announced
✅ Progress indicators for all async operations
✅ User feels in control throughout
✅ Background automation only after visible completion

## Technical Requirements

- Next.js app router navigation
- React form control with proper event triggering
- WebSocket for real-time updates
- Toast notifications for status
- Smooth animations for field updates
- Accessibility maintained throughout

## Risk Mitigation

**Risk:** Form validation might block programmatic filling
**Solution:** Trigger proper React events (onChange, onBlur)

**Risk:** Navigation might feel jarring
**Solution:** Smooth transitions with loading states

**Risk:** User loses context during navigation
**Solution:** Breadcrumbs and status messages

## Non-Negotiables

- User must see every action
- No hidden background magic during creation
- Clear status messages throughout
- Ability to stop/intervene anytime
- Maintain AgentKit for tool execution