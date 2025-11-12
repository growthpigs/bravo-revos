# Chat Inline UI Feature Specification

**Feature Name**: Chat Inline UI
**Version**: 1.0
**Status**: Design Phase
**Created**: 2025-11-12
**Owner**: CC1

---

## 🎯 Vision Statement

**"Your entire marketing workflow, driven by conversation."**

Users should be able to accomplish everything through chat without ever leaving the conversation. The chat becomes an AI co-pilot that orchestrates the entire SaaS interface - navigating pages, filling forms, triggering workflows - while the user watches, verifies, and guides through natural conversation.

---

## 🌟 Core Concept

### The Problem
Current SaaS tools require users to:
- Navigate multiple pages manually
- Fill out forms repeatedly
- Remember where features are located
- Context-switch between chat and UI
- Learn complex interfaces

### The Solution
**Chat-Driven Everything:**
- User: "Create a new campaign for Q1 product launch"
- AI navigates to campaigns page automatically
- AI fills form fields step-by-step
- User sees it happening in real-time on the page
- All action buttons appear inline in chat
- User can interact via chat or page (synchronized)
- Chat maintains conversation continuity throughout

---

## 🏗️ Architecture

### Two UI Patterns

#### 1. **Inside Bubble** (Slack-style)
```
┌─────────────────────────────────────┐
│ AI: I've found 3 templates for you: │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Template A] [Template B] [C]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Campaign Name: [__________]     │ │
│ │ [Continue] [Skip]               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Use Cases:**
- Forms and data entry
- Multi-step workflows
- Progress indicators
- Configuration panels

#### 2. **Outside Bubble** (WhatsApp-style)
```
┌─────────────────────────────────────┐
│ AI: Campaign created successfully!  │
└─────────────────────────────────────┘
    [View Campaign] [Edit] [Share]
```

**Use Cases:**
- Quick actions
- Primary/secondary choices
- Navigation shortcuts
- Approval/rejection flows

---

## 🎨 UI Component Library

### InlineUIBlock (Base Component)
```typescript
interface InlineUIBlock {
  id: string;
  type: 'button_group' | 'form' | 'stepper' | 'card' | 'picker';
  position: 'inside' | 'outside';
  persistent: boolean; // Stay in history after interaction
  message_id: string;
  data: any; // Component-specific data
}
```

### Component Types

#### 1. ButtonGroup
```typescript
{
  type: 'button_group',
  buttons: [
    { label: 'Continue', variant: 'primary', action: '...' },
    { label: 'Skip', variant: 'secondary', action: '...' }
  ],
  layout: 'horizontal' | 'vertical'
}
```

**Visual:**
- Height: 36px (not too tall)
- Spacing: 8px between buttons
- Max 3 buttons horizontally, then wrap

#### 2. InlineForm
```typescript
{
  type: 'form',
  fields: [
    { name: 'campaign_name', type: 'text', label: '...' },
    { name: 'target_audience', type: 'select', options: [...] }
  ],
  onSubmit: '...'
}
```

#### 3. ProgressStepper
```typescript
{
  type: 'stepper',
  steps: [
    { label: 'Basic Info', status: 'complete' },
    { label: 'Target Audience', status: 'current' },
    { label: 'Content', status: 'pending' }
  ]
}
```

#### 4. CardSelector
```typescript
{
  type: 'card',
  cards: [
    { title: 'Template A', description: '...', preview_url: '...' }
  ]
}
```

---

## 🔄 Navigation & State Management

### Context-Aware Navigation

**Operational Tasks** (Floating Chat Mode):
```
User: "Create new campaign"
→ Chat minimizes to floating button
→ App navigates to /campaigns/new
→ Page shows form being filled automatically
→ Chat sends updates: "Setting campaign name...", "Adding audience..."
→ Inline buttons appear in chat for [Continue] [Edit] [Cancel]
→ User can interact via page OR chat (synchronized)
```

**Creative Tasks** (Fullscreen Document Mode):
```
User: "Write a blog post about AI marketing"
→ Chat expands to fullscreen
→ Working document opens in right pane
→ AI writes content live
→ User edits in document while chatting
→ Document and chat stay synchronized
```

**Decision Matrix:**

| Task Type | Chat State | Page Navigation | Example |
|-----------|-----------|-----------------|---------|
| Campaign creation | Floating | Yes → /campaigns/new | "New campaign" |
| Lead magnet setup | Floating | Yes → /offers/new | "Create lead magnet" |
| Writing content | Fullscreen + Doc | No | "Write blog post" |
| Editing workflow | Fullscreen + Doc | No | "Edit this feature spec" |
| Data analysis | Floating | Yes → /analytics | "Show campaign stats" |
| Settings | Sidebar | Yes → /settings | "Update my profile" |

---

## 🛠️ Technical Implementation

### Phase 1: Foundation (Current Sprint)
1. **Create InlineUIBlock component system**
   - Base component architecture
   - ButtonGroup component
   - Outside-bubble positioning

2. **Extend FloatingChatBar**
   - Detect UI block instructions from AI
   - Render inline components
   - Handle user interactions

3. **Navigation Integration**
   - Detect operational vs creative tasks
   - Auto-minimize to floating for operational
   - Auto-expand to fullscreen for creative

### Phase 2: Rich Components (Next Sprint)
4. **InlineForm component**
5. **ProgressStepper component**
6. **CardSelector component**
7. **State synchronization** (chat ↔ page)

### Phase 3: Advanced Features (Future)
8. **Workflow/Cartridge Builder** (menu item)
9. **Multi-step wizards**
10. **Real-time collaboration** (multiple users in same chat)

---

## 📐 Technical Design

### AI Response Format

```typescript
// AI returns structured data for inline UI
{
  type: 'message',
  content: 'I\'ve created your campaign. What would you like to do next?',
  inline_ui: {
    type: 'button_group',
    position: 'outside',
    buttons: [
      {
        label: 'View Campaign',
        action: 'navigate',
        params: { url: '/campaigns/123' }
      },
      {
        label: 'Add Content',
        action: 'workflow',
        params: { workflow_id: 'add_content' }
      }
    ]
  }
}
```

### Component Rendering

```typescript
// FloatingChatBar.tsx (extended)
const renderInlineUI = (block: InlineUIBlock) => {
  switch (block.type) {
    case 'button_group':
      return <InlineButtonGroup {...block.data} position={block.position} />;
    case 'form':
      return <InlineForm {...block.data} />;
    case 'stepper':
      return <ProgressStepper {...block.data} />;
    // ...
  }
};

// In message rendering
{message.inline_ui && renderInlineUI(message.inline_ui)}
```

### State Synchronization

```typescript
// Sync engine (new)
class ChatPageSync {
  // When chat triggers action
  onChatAction(action: string, params: any) {
    // 1. Update page state
    router.push(params.url);

    // 2. Trigger page automation
    automationEngine.execute(action, params);

    // 3. Send progress updates to chat
    chatStream.send({ type: 'progress', message: '...' });
  }

  // When page changes
  onPageAction(action: string, data: any) {
    // 1. Reflect in chat
    chatStream.send({
      type: 'page_action',
      message: `You clicked ${action}`,
      inline_ui: { ... } // Show next steps
    });
  }
}
```

---

## 🎬 User Flows

### Flow 1: Create Campaign (Operational)

```
1. User: "Create a new Q1 campaign"

2. AI Response:
   "I'll create a Q1 campaign for you. Let me guide you through the setup."
   [Chat minimizes to floating]
   [App navigates to /campaigns/new]

3. AI fills form fields (user watches):
   Chat: "Setting campaign name to 'Q1 2025 Launch'..."
   [Progress bar in chat: 1/5 steps complete]

4. AI asks for input (inline UI):
   Chat: "Which target audience?"
   ┌─────────────────────────┐
   │ [Existing Customers]    │
   │ [New Prospects]         │
   │ [All Contacts]          │
   └─────────────────────────┘

5. User clicks button in chat OR on page (synchronized)

6. AI continues automation:
   Chat: "Great! Adding audience segments..."
   [Progress bar: 2/5 steps complete]

7. Final confirmation (outside bubble):
   Chat: "Campaign created successfully! 🎉"
         [View Campaign] [Add Content] [Edit Settings]
```

### Flow 2: Write Blog Post (Creative)

```
1. User: "Write a blog post about AI in marketing"

2. AI Response:
   [Chat expands to fullscreen]
   [Working document opens on right]
   "I'll draft a blog post for you. Watch the document as I write."

3. AI writes content in document:
   Chat: "Creating outline..."
   [Document shows: # AI in Marketing, ## Introduction, ...]

   Chat: "Writing introduction..."
   [Document fills with content in real-time]

4. User can:
   - Edit document directly while AI writes
   - Ask questions in chat: "Make it more casual"
   - Request changes: "Add a section on ROI"
   - All synchronized automatically

5. Completion:
   Chat: "Draft complete! What would you like me to refine?"
         [Publish] [Save Draft] [Edit More]
```

---

## 📊 Success Metrics

### User Experience
- **Time to complete task**: 50% faster than manual UI navigation
- **Task completion rate**: 90%+ (vs 60% typical SaaS)
- **User satisfaction**: "I never want to use a regular SaaS again"

### Technical
- **Latency**: <500ms from chat action to page update
- **Sync accuracy**: 99%+ (chat ↔ page state match)
- **UI render time**: <100ms for inline components

---

## 🚧 Implementation Roadmap

### Sprint 1: Foundation (Week 1-2)
- [ ] InlineUIBlock base component
- [ ] ButtonGroup (inside + outside positions)
- [ ] AI response parsing for inline_ui
- [ ] FloatingChatBar integration
- [ ] Navigation detection (operational vs creative)

### Sprint 2: Automation (Week 3-4)
- [ ] ChatPageSync engine
- [ ] Form automation (fill fields from chat)
- [ ] Progress indicators
- [ ] State synchronization (chat ↔ page)

### Sprint 3: Rich UI (Week 5-6)
- [ ] InlineForm component
- [ ] ProgressStepper component
- [ ] CardSelector component
- [ ] Multi-step wizard flows

### Sprint 4: Polish (Week 7-8)
- [ ] Animations and transitions
- [ ] Error handling and retries
- [ ] Accessibility (keyboard navigation)
- [ ] Mobile responsiveness

---

## 🔮 Future Enhancements

### Workflow/Cartridge Builder (v2.0)
- Menu item: "Create Workflow"
- Visual flow editor embedded in chat
- Drag-drop skills/tools
- Save as reusable cartridge

### Multi-User Collaboration (v3.0)
- Shared chat sessions
- See what teammate is doing
- Collaborative workflows

### Voice Interface (v4.0)
- Voice commands trigger inline UI
- Hands-free workflow execution

---

## 📚 References

### Inspiration
- **Slack Block Kit**: Interactive message components
- **Vercel AI SDK**: `toolInvocations` and custom UI rendering
- **Discord Components**: Persistent buttons in messages
- **Intercom Tours**: Chat-driven navigation
- **Notion AI**: Inline AI actions

### Technical Docs
- Vercel AI SDK: https://sdk.vercel.ai/docs
- OpenAI Function Calling: https://platform.openai.com/docs/guides/function-calling
- Radix UI Primitives: https://radix-ui.com (for component styling)

---

## 📝 Notes

### Design Principles
1. **Conversation First**: Everything can be done through chat
2. **Transparency**: User sees all automation happen in real-time
3. **Control**: User can intervene at any step (take over manually)
4. **Simplicity**: Complex workflows feel like simple conversations
5. **Speed**: Faster than manual UI navigation

### Key Differentiators
- **Not just a chatbot**: It's an AI co-pilot that drives the SaaS
- **Not just automation**: User watches and verifies every step
- **Not just commands**: Natural conversation with visual feedback
- **Not just UI**: Orchestrated experience across chat + page

---

**Status**: Ready for implementation planning
**Next Steps**:
1. Review with team
2. Create detailed component wireframes
3. Prototype ButtonGroup component
4. Test with 1-2 user flows
