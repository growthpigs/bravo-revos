# Vercel AI Chatbot Integration Plan

**Repository**: https://github.com/vercel/ai-chatbot (18.6k stars)
**Demo**: https://demo.chat-sdk.dev
**Docs**: https://ai-sdk.dev/docs

---

## Architecture Overview

### Core Dependencies

```json
{
  "ai": "5.0.26",                    // Vercel AI SDK core
  "@ai-sdk/react": "2.0.26",         // React hooks (useChat, etc.)
  "@ai-sdk/openai": "TBD",           // OpenAI provider (we'll add this)
  "drizzle-orm": "0.34.0",           // Database ORM (Postgres)
  "next-auth": "5.0.0-beta.25",      // Authentication
  "next-themes": "0.3.0",            // Dark mode
  "framer-motion": "11.3.19",        // Animations
  "lucide-react": "0.446.0",         // Icons
  "prosemirror-*": "...",            // Rich text editing
  "codemirror": "6.0.1",             // Code editing
  "shiki": "3.12.2"                  // Syntax highlighting
}
```

### Component Structure

```
components/
├── chat.tsx                       // Main chat container (useChat hook)
├── multimodal-input.tsx           // Input component (attachments, model selector)
├── messages.tsx                   // Message list display
├── message.tsx                    // Individual message
├── app-sidebar.tsx                // Sidebar with chat history
├── artifact.tsx                   // Rich content display (code, docs)
├── elements/
│   ├── prompt-input.tsx           // Input primitives
│   ├── message.tsx                // Message primitives
│   ├── code-block.tsx             // Code rendering
│   └── ...
└── ui/                            // shadcn/ui components (we already have these)
```

### Layout Pattern

```tsx
// app/(chat)/layout.tsx
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    {children}  // Chat pages render here
  </SidebarInset>
</SidebarProvider>
```

---

## Integration Strategy

### Option 1: Adapt Components (Recommended)

**Approach**: Extract and customize components from Vercel AI Chatbot to fit Bravo revOS.

**Advantages:**
- Full control over styling and behavior
- Can match Mem0 design system exactly
- Integrate with existing Supabase auth
- No bloat from unused features

**Steps:**

1. **Install AI SDK:**
   ```bash
   npm install ai @ai-sdk/react @ai-sdk/openai
   ```

2. **Copy Core Components:**
   - `multimodal-input.tsx` → Adapt for floating chat bar
   - `messages.tsx` → Display conversation history
   - `chat.tsx` → Main chat logic
   - `elements/prompt-input.tsx` → Input primitives

3. **Create API Route:**
   ```typescript
   // app/api/chat/route.ts
   import { openai } from '@ai-sdk/openai';
   import { streamText } from 'ai';

   export async function POST(req: Request) {
     const { messages } = await req.json();

     const result = await streamText({
       model: openai('gpt-4-turbo'),
       messages,
       system: 'You are a helpful assistant for Bravo revOS...',
     });

     return result.toDataStreamResponse();
   }
   ```

4. **Customize for Floating Pattern:**
   - Default: Floating bar at bottom (2/3 width, centered)
   - Expanded: Left sidebar (400px wide)
   - Use state to toggle between modes

**Estimated Time**: 6-8 hours

---

### Option 2: Fork and Customize (Not Recommended)

**Approach**: Fork entire ai-chatbot repo and customize.

**Disadvantages:**
- Brings in Drizzle ORM (we use Supabase)
- NextAuth setup (we use Supabase Auth)
- Postgres dependency
- Lots of features we don't need (artifacts, document editing, etc.)
- Harder to maintain

**Not recommended due to conflicts with existing architecture.**

---

## Proposed Implementation: Floating Chat Bar

### Architecture

**Two Modes:**

1. **Floating Mode (Default)**:
   - Fixed position bottom-5 (20px from bottom)
   - Width: 2/3 viewport (max 768px)
   - Horizontally centered
   - Contains: Input + attachments + model selector + send button
   - No message history visible

2. **Expanded Mode (Sidebar)**:
   - Left sidebar: 400px wide
   - Full conversation history
   - Rich message display
   - Input at bottom of sidebar
   - Main content shifts right

### Component Structure

```
components/chat/
├── FloatingChatBar.tsx          // Main component (state management)
├── ChatSidebar.tsx              // Expanded sidebar view
├── ChatInput.tsx                // Shared input component
├── ChatMessages.tsx             // Message list
├── ChatMessage.tsx              // Individual message
└── ChatAttachment.tsx           // File attachments
```

### State Management

```typescript
// lib/stores/chat-store.ts
import { create } from 'zustand';

interface ChatStore {
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
  // ... other chat state
}

export const useChatStore = create<ChatStore>((set) => ({
  isExpanded: false,
  setIsExpanded: (value) => set({ isExpanded: value }),
  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
}));
```

### Implementation Plan

#### **Session 1: Core Setup (2-3 hours)**

1. Install AI SDK packages
2. Create `/app/api/chat/route.ts`
3. Copy and adapt `multimodal-input.tsx`
4. Create basic `FloatingChatBar` component
5. Test basic chat flow (send message → receive response)

**Deliverable**: Working floating chat bar with basic chat functionality

#### **Session 2: Sidebar Expansion (2-3 hours)**

1. Create `ChatSidebar` component
2. Implement expand/collapse logic
3. Add message history display
4. Ensure state persists between modes
5. Add animations (framer-motion)

**Deliverable**: Full floating → sidebar expansion pattern

#### **Session 3: Styling & Polish (2-3 hours)**

1. Apply Mem0 design system:
   - Gray color palette
   - Border-radius: 12px (rounded-xl)
   - Shadows: shadow-lg for floating bar
   - Typography: Inter font, proper sizing
2. Responsive behavior (mobile, tablet, desktop)
3. Dark mode support
4. Accessibility (keyboard navigation, ARIA)

**Deliverable**: Pixel-perfect Mem0-styled chat interface

#### **Session 4: Features & Integration (2-3 hours)**

1. File attachments (upload + preview)
2. Voice button integration (mic icon, future feature)
3. Model selector dropdown
4. Conversation persistence (save to Supabase)
5. User authentication integration

**Deliverable**: Feature-complete chat system

---

## File Uploads

### Vercel Blob Storage (Recommended)

```bash
npm install @vercel/blob
```

```typescript
// app/api/files/upload/route.ts
import { put } from '@vercel/blob';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  const blob = await put(file.name, file, {
    access: 'public',
  });

  return Response.json({
    url: blob.url,
    pathname: blob.pathname,
    contentType: file.type,
  });
}
```

### Alternative: Supabase Storage

```typescript
// app/api/files/upload/route.ts
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient({ isServiceRole: true });
  const formData = await req.formData();
  const file = formData.get('file') as File;

  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .upload(`${Date.now()}-${file.name}`, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(data.path);

  return Response.json({
    url: publicUrl,
    pathname: data.path,
    contentType: file.type,
  });
}
```

---

## Database Schema

### Chat Messages Table

```sql
-- Create chat_sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chat sessions
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  USING (user_id = auth.uid());

-- Users can create chat sessions
CREATE POLICY "Users can create chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can view messages in their sessions
CREATE POLICY "Users can view own messages"
  ON chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Users can create messages in their sessions
CREATE POLICY "Users can create messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );
```

---

## Features NOT Needed from ai-chatbot

These features from Vercel AI Chatbot can be omitted:

- ❌ **Artifacts** - Code/document generation with preview
- ❌ **Document Editing** - ProseMirror rich text editing
- ❌ **Spreadsheet Editing** - React Data Grid
- ❌ **Image Editing** - Canvas-based image editor
- ❌ **Reasoning Display** - Chain-of-thought visualization
- ❌ **Multi-Model Switching** - We use OpenAI only
- ❌ **Voting System** - Thumbs up/down on messages
- ❌ **Credit Card Alerts** - Not using AI Gateway
- ❌ **Share Functionality** - Public/private chat sharing

**Keep Only:**
- ✅ Chat input with attachments
- ✅ Message display
- ✅ File uploads
- ✅ Streaming responses
- ✅ Code syntax highlighting (for code in messages)
- ✅ Markdown rendering

---

## Styling Guidelines (Mem0 Match)

### Floating Chat Bar

```tsx
<div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-2/3 max-w-3xl z-50">
  <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4">
    {/* Input */}
    <textarea
      className="w-full text-gray-700 text-sm outline-none resize-none"
      placeholder="Ask me anything..."
    />

    {/* Toolbar */}
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
      <div className="flex gap-2">
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <PaperclipIcon className="w-4 h-4 text-gray-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <Maximize2 className="w-4 h-4 text-gray-600" />  {/* Expand */}
        </button>
      </div>

      <div className="flex gap-2">
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <Mic className="w-5 h-5 text-gray-600" />
        </button>
        <button className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800">
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</div>
```

### Sidebar (Expanded)

```tsx
<div className="fixed left-0 top-0 bottom-0 w-96 bg-white border-r border-gray-200 z-40 flex flex-col">
  {/* Header */}
  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
    <h2 className="font-semibold text-lg">Chat</h2>
    <button onClick={onCollapse}>
      <Minimize2 className="w-4 h-4 text-gray-600" />
    </button>
  </div>

  {/* Messages */}
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
    {messages.map((message) => (
      <div key={message.id} className={message.role === 'user' ? 'text-right' : ''}>
        <div className={`inline-block p-3 rounded-xl ${
          message.role === 'user'
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}>
          {message.content}
        </div>
      </div>
    ))}
  </div>

  {/* Input */}
  <div className="p-4 border-t border-gray-200">
    {/* Same input as floating bar */}
  </div>
</div>
```

---

## Next Steps

1. ✅ **Research Complete** - Analyzed Vercel AI Chatbot architecture
2. **Decide**: Option 1 (Adapt Components) vs Option 2 (Fork Repo)
   - **Recommendation**: Option 1
3. **Phase 1**: Install AI SDK + Create basic floating chat bar
4. **Phase 2**: Add sidebar expansion
5. **Phase 3**: Style with Mem0 design
6. **Phase 4**: Add features (attachments, persistence, voice)

**Estimated Total Time**: 8-12 hours (2-3 sessions)

---

## Questions for User

1. **Conversation Persistence**: Should chat history save to Supabase? Per-user or per-client?
2. **Sidebar Width**: 384px (24rem) or 400px?
3. **Voice Feature**: Mic button placeholder for now, or integrate voice-to-text immediately?
4. **File Storage**: Vercel Blob or Supabase Storage for attachments?
5. **Model Selection**: Only GPT-4, or allow model switching (GPT-3.5, GPT-4, GPT-4-turbo)?

---

**Ready to proceed with Phase 1 (AI SDK Installation + Basic Chat Bar)?**
