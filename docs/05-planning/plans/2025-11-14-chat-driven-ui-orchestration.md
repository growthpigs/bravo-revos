# Chat-Driven UI Orchestration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a system where HGC (AgentKit) navigates the UI, fills forms, and clicks buttons while the user watches everything happen in real-time.

**Architecture:** Three-layer system: Navigation API (programmatic routing), Form Control API (real-time field filling with React event triggering), and Inline Button System (chat buttons that navigate + execute AgentKit tools). All visible to user, no hidden magic.

**Tech Stack:** Next.js 14 App Router, AgentKit SDK (`@openai/agents`), React 18, TypeScript, Tailwind CSS, shadcn/ui

---

## Task 1: Navigation API with Toast Notifications

**Files:**
- Create: `lib/orchestration/navigation-api.ts`
- Create: `lib/orchestration/__tests__/navigation-api.test.ts`
- Create: `hooks/use-navigation-api.ts`

**Step 1: Write the failing test**

Create `lib/orchestration/__tests__/navigation-api.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { NavigationAPI } from '../navigation-api';
import { toast } from '@/components/ui/use-toast';

vi.mock('@/components/ui/use-toast');

describe('NavigationAPI', () => {
  it('navigates to path with toast message', async () => {
    const mockPush = vi.fn();
    const mockRouter = { push: mockPush };

    const api = new NavigationAPI(mockRouter);

    await api.navigateTo('/dashboard/campaigns/new', 'Opening campaign builder...');

    expect(toast).toHaveBeenCalledWith({
      title: '🤖 Opening campaign builder...',
      duration: 3000
    });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/campaigns/new');
  });

  it('adds delay for user visibility', async () => {
    const mockPush = vi.fn();
    const mockRouter = { push: mockPush };

    const api = new NavigationAPI(mockRouter);
    const startTime = Date.now();

    await api.navigateTo('/test');

    const endTime = Date.now();
    expect(endTime - startTime).toBeGreaterThanOrEqual(500); // Message display delay
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test lib/orchestration/__tests__/navigation-api.test.ts`
Expected: FAIL with "Cannot find module '../navigation-api'"

**Step 3: Write minimal implementation**

Create `lib/orchestration/navigation-api.ts`:

```typescript
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { toast } from '@/components/ui/use-toast';

export class NavigationAPI {
  private router: AppRouterInstance;

  constructor(router: AppRouterInstance) {
    this.router = router;
  }

  async navigateTo(path: string, message?: string): Promise<void> {
    // Show toast about navigation
    if (message) {
      toast({
        title: `🤖 ${message}`,
        duration: 3000
      });
    }

    // Add delay so user sees the message
    await new Promise(resolve => setTimeout(resolve, 500));

    // Navigate
    this.router.push(path);

    // Allow page to load
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  getCurrentPath(): string {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  }
}
```

Create `hooks/use-navigation-api.ts`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { NavigationAPI } from '@/lib/orchestration/navigation-api';
import { useMemo } from 'react';

export function useNavigationAPI() {
  const router = useRouter();

  return useMemo(() => new NavigationAPI(router), [router]);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test lib/orchestration/__tests__/navigation-api.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/orchestration/navigation-api.ts lib/orchestration/__tests__/navigation-api.test.ts hooks/use-navigation-api.ts
git commit -m "feat(orchestration): add Navigation API with toast notifications"
```

---

## Task 2: Form Control API with React Event Triggering

**Files:**
- Create: `lib/orchestration/form-control-api.ts`
- Create: `lib/orchestration/__tests__/form-control-api.test.tsx`
- Create: `styles/orchestration.css`

**Step 1: Write the failing test**

Create `lib/orchestration/__tests__/form-control-api.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormControlAPI } from '../form-control-api';
import { useState } from 'react';

function TestForm() {
  const [value, setValue] = useState('');

  return (
    <input
      id="test-field"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      data-testid="test-input"
    />
  );
}

describe('FormControlAPI', () => {
  it('fills field and triggers React change events', async () => {
    render(<TestForm />);

    const api = new FormControlAPI();
    const input = screen.getByTestId('test-input');

    await api.fillField('test-field', 'Hello World');

    expect(input).toHaveValue('Hello World');
  });

  it('animates typing when animated option is true', async () => {
    vi.useFakeTimers();
    render(<TestForm />);

    const api = new FormControlAPI();
    const input = screen.getByTestId('test-input');

    const promise = api.fillField('test-field', 'Hi', { animated: true });

    // Should type character by character
    vi.advanceTimersByTime(50);
    expect(input).toHaveValue('H');

    vi.advanceTimersByTime(50);
    expect(input).toHaveValue('Hi');

    await promise;
    vi.useRealTimers();
  });

  it('highlights field after filling', async () => {
    render(<TestForm />);

    const api = new FormControlAPI();
    const input = screen.getByTestId('test-input');

    await api.fillField('test-field', 'Test');

    expect(input).toHaveClass('ai-highlight');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test lib/orchestration/__tests__/form-control-api.test.tsx`
Expected: FAIL with "Cannot find module '../form-control-api'"

**Step 3: Write minimal implementation**

Create `lib/orchestration/form-control-api.ts`:

```typescript
export interface FillOptions {
  animated?: boolean;
  delay?: number;
}

export class FormControlAPI {
  async fillField(fieldId: string, value: string, options: FillOptions = {}): Promise<void> {
    const element = document.getElementById(fieldId) as HTMLInputElement;
    if (!element) {
      throw new Error(`Field with id '${fieldId}' not found`);
    }

    // Visual typing effect
    if (options.animated) {
      await this.animateTyping(element, value);
    } else {
      element.value = value;
      this.triggerReactChange(element);
    }

    // Visual highlight
    this.highlightField(element);

    // Optional delay after filling
    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }
  }

  private async animateTyping(element: HTMLInputElement, text: string): Promise<void> {
    element.focus();

    for (let i = 0; i <= text.length; i++) {
      element.value = text.slice(0, i);
      this.triggerReactChange(element);
      await new Promise(r => setTimeout(r, 50)); // Type speed
    }
  }

  private triggerReactChange(element: HTMLInputElement): void {
    // Get React's internal value setter
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, element.value);
    }

    // Trigger input event for React
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);

    // Also trigger change event for completeness
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);
  }

  private highlightField(element: HTMLElement): void {
    element.classList.add('ai-highlight');
    setTimeout(() => {
      element.classList.remove('ai-highlight');
    }, 2000);
  }

  async clickButton(buttonId: string): Promise<void> {
    const button = document.getElementById(buttonId) as HTMLButtonElement;
    if (!button) {
      throw new Error(`Button with id '${buttonId}' not found`);
    }

    // Visual highlight before click
    this.highlightField(button);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Click
    button.click();
  }

  async selectOption(selectId: string, value: string): Promise<void> {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (!select) {
      throw new Error(`Select with id '${selectId}' not found`);
    }

    select.value = value;
    this.triggerReactChange(select as any);
    this.highlightField(select);
  }
}
```

Create `styles/orchestration.css`:

```css
@keyframes ai-highlight {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
    border-color: rgba(59, 130, 246, 0.5);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 1);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
    border-color: initial;
  }
}

.ai-highlight {
  animation: ai-highlight 2s ease-out;
  transition: all 0.3s ease;
}

/* AI typing indicator */
.ai-typing::after {
  content: '|';
  animation: blink 1s infinite;
  color: rgb(59, 130, 246);
  font-weight: bold;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test lib/orchestration/__tests__/form-control-api.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/orchestration/form-control-api.ts lib/orchestration/__tests__/form-control-api.test.tsx styles/orchestration.css
git commit -m "feat(orchestration): add Form Control API with React event triggering"
```

---

## Task 3: Inline Button Component

**Files:**
- Create: `components/chat/inline-button.tsx`
- Create: `components/chat/__tests__/inline-button.test.tsx`
- Modify: `app/api/hgc-v2/route.ts`

**Step 1: Write the failing test**

Create `components/chat/__tests__/inline-button.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineButton } from '../inline-button';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

describe('InlineButton', () => {
  it('renders button with label', () => {
    render(<InlineButton label="CREATE CAMPAIGN" />);

    expect(screen.getByRole('button')).toHaveTextContent('CREATE CAMPAIGN');
  });

  it('navigates when navigateTo is provided', async () => {
    render(
      <InlineButton
        label="Open Dashboard"
        navigateTo="/dashboard"
      />
    );

    await userEvent.click(screen.getByRole('button'));

    // Should call router.push after delay
    await new Promise(r => setTimeout(r, 1600));
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('executes action when provided', async () => {
    const mockAction = vi.fn();

    render(
      <InlineButton
        label="Execute Tool"
        action="create_campaign"
        onAction={mockAction}
      />
    );

    await userEvent.click(screen.getByRole('button'));

    expect(mockAction).toHaveBeenCalledWith('create_campaign');
  });

  it('applies variant styles', () => {
    const { rerender } = render(
      <InlineButton label="Primary" variant="primary" />
    );

    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<InlineButton label="Secondary" variant="secondary" />);

    expect(screen.getByRole('button')).toHaveClass('bg-gray-200');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test components/chat/__tests__/inline-button.test.tsx`
Expected: FAIL with "Cannot find module '../inline-button'"

**Step 3: Write minimal implementation**

Create `components/chat/inline-button.tsx`:

```typescript
'use client';

import { cn } from '@/lib/utils';
import { useNavigationAPI } from '@/hooks/use-navigation-api';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface InlineButtonProps {
  label: string;
  action?: string; // AgentKit tool to execute
  navigateTo?: string; // Path to navigate
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  disabled?: boolean;
  onAction?: (action: string) => void; // Callback for action execution
}

export function InlineButton({
  label,
  action,
  navigateTo,
  variant = 'primary',
  disabled = false,
  onAction
}: InlineButtonProps) {
  const navigationAPI = useNavigationAPI();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // Execute action if specified
      if (action && onAction) {
        await onAction(action);
      }

      // Navigate if specified
      if (navigateTo) {
        await navigationAPI.navigateTo(
          navigateTo,
          `Opening ${label.toLowerCase()}...`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    warning: 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-md',
        'font-medium text-sm',
        'transition-all duration-200 transform',
        'hover:scale-105 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        variantStyles[variant],
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed hover:scale-100'
      )}
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}

// Container for multiple inline buttons
export function InlineButtonGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {children}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test components/chat/__tests__/inline-button.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add components/chat/inline-button.tsx components/chat/__tests__/inline-button.test.tsx
git commit -m "feat(orchestration): add InlineButton component for chat interactions"
```

---

## Task 4: Orchestration Response Handler in HGC-v2

**Files:**
- Modify: `app/api/hgc-v2/route.ts`
- Create: `lib/orchestration/response-builder.ts`
- Create: `lib/orchestration/__tests__/response-builder.test.ts`

**Step 1: Write the failing test**

Create `lib/orchestration/__tests__/response-builder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { OrchestrationResponseBuilder } from '../response-builder';

describe('OrchestrationResponseBuilder', () => {
  it('builds response with navigation instruction', () => {
    const builder = new OrchestrationResponseBuilder();

    const response = builder
      .withMessage("Let's create your campaign. What's it about?")
      .withNavigation('/dashboard/campaigns/new', 'Opening campaign builder...')
      .build();

    expect(response).toEqual({
      response: "Let's create your campaign. What's it about?",
      orchestration: {
        navigate: '/dashboard/campaigns/new',
        message: 'Opening campaign builder...'
      }
    });
  });

  it('builds response with form fill instructions', () => {
    const builder = new OrchestrationResponseBuilder();

    const response = builder
      .withMessage('Setting up your campaign')
      .withFormFills([
        { id: 'campaign_name', value: 'AI Tools for CTOs', animated: true },
        { id: 'target_audience', value: 'CTOs', animated: false }
      ])
      .build();

    expect(response.orchestration?.fillFields).toHaveLength(2);
    expect(response.orchestration?.fillFields[0]).toEqual({
      id: 'campaign_name',
      value: 'AI Tools for CTOs',
      animated: true
    });
  });

  it('builds response with inline buttons', () => {
    const builder = new OrchestrationResponseBuilder();

    const response = builder
      .withMessage('Choose how to proceed')
      .withButton('CREATE LEAD MAGNET', { action: 'create_lead_magnet' })
      .withButton('SKIP', { navigateTo: '/dashboard' })
      .build();

    expect(response.buttons).toHaveLength(2);
    expect(response.buttons[0]).toEqual({
      label: 'CREATE LEAD MAGNET',
      action: 'create_lead_magnet'
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test lib/orchestration/__tests__/response-builder.test.ts`
Expected: FAIL with "Cannot find module '../response-builder'"

**Step 3: Write minimal implementation**

Create `lib/orchestration/response-builder.ts`:

```typescript
export interface OrchestrationInstruction {
  navigate?: string;
  message?: string;
  fillFields?: Array<{
    id: string;
    value: any;
    animated?: boolean;
  }>;
  clickButton?: string;
  wait?: number;
}

export interface InlineButtonConfig {
  label: string;
  action?: string;
  navigateTo?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
}

export interface OrchestrationResponse {
  response: string; // Text message to user
  orchestration?: OrchestrationInstruction;
  buttons?: InlineButtonConfig[];
  sessionId?: string;
  shouldRememberContext?: boolean;
}

export class OrchestrationResponseBuilder {
  private response: OrchestrationResponse = {
    response: ''
  };

  withMessage(message: string): this {
    this.response.response = message;
    return this;
  }

  withNavigation(path: string, message?: string): this {
    if (!this.response.orchestration) {
      this.response.orchestration = {};
    }
    this.response.orchestration.navigate = path;
    if (message) {
      this.response.orchestration.message = message;
    }
    return this;
  }

  withFormFills(fields: Array<{ id: string; value: any; animated?: boolean }>): this {
    if (!this.response.orchestration) {
      this.response.orchestration = {};
    }
    this.response.orchestration.fillFields = fields;
    return this;
  }

  withButton(label: string, config: Partial<Omit<InlineButtonConfig, 'label'>> = {}): this {
    if (!this.response.buttons) {
      this.response.buttons = [];
    }
    this.response.buttons.push({
      label,
      ...config
    });
    return this;
  }

  withWait(milliseconds: number): this {
    if (!this.response.orchestration) {
      this.response.orchestration = {};
    }
    this.response.orchestration.wait = milliseconds;
    return this;
  }

  withSessionId(sessionId: string): this {
    this.response.sessionId = sessionId;
    return this;
  }

  withMemoryContext(remember: boolean = true): this {
    this.response.shouldRememberContext = remember;
    return this;
  }

  build(): OrchestrationResponse {
    return this.response;
  }
}
```

**Step 4: Update HGC-v2 route to use orchestration**

Modify `app/api/hgc-v2/route.ts` (add after imports):

```typescript
import { OrchestrationResponseBuilder } from '@/lib/orchestration/response-builder';

// In the POST handler, add orchestration logic:

// Detect campaign creation intent
if (latestMessage.toLowerCase().includes('create') &&
    latestMessage.toLowerCase().includes('campaign')) {

  const builder = new OrchestrationResponseBuilder()
    .withMessage("Perfect! Let's create your LinkedIn campaign together. What's your campaign about?")
    .withNavigation('/dashboard/campaigns/new', 'Opening campaign builder...')
    .withButton('START CREATING', {
      navigateTo: '/dashboard/campaigns/new',
      variant: 'primary'
    })
    .withSessionId(session.id)
    .withMemoryContext(true);

  // Store intent in Mem0
  await memory.add({
    user_id: tenantKey,
    messages: [{
      role: 'assistant',
      content: 'User wants to create a new LinkedIn campaign'
    }],
    metadata: {
      intent: 'create_campaign',
      timestamp: new Date().toISOString()
    }
  });

  return NextResponse.json(builder.build());
}

// When user provides campaign details and we're on campaign page
const currentPath = req.headers.get('x-current-path');
if (currentPath === '/dashboard/campaigns/new' && session.context?.intent === 'create_campaign') {

  // Extract campaign details from user message using AgentKit
  const campaignTopic = latestMessage; // In real impl, use NLP to extract

  const builder = new OrchestrationResponseBuilder()
    .withMessage(`Excellent! I'll set up a campaign about "${campaignTopic}". Let me fill in the details for you.`)
    .withFormFills([
      { id: 'campaign_name', value: campaignTopic, animated: true },
      { id: 'target_audience', value: extractAudience(campaignTopic), animated: true },
      { id: 'campaign_goal', value: 'lead_generation', animated: false }
    ])
    .withWait(2000) // Let user see the fields being filled
    .withButton('AI CREATE LEAD MAGNET', {
      action: 'create_lead_magnet',
      variant: 'primary'
    })
    .withButton("I'LL UPLOAD MY OWN", {
      navigateTo: '/dashboard/offers/upload',
      variant: 'secondary'
    })
    .withButton('SKIP LEAD MAGNET', {
      action: 'continue_without_magnet',
      variant: 'secondary'
    })
    .withSessionId(session.id);

  return NextResponse.json(builder.build());
}

// Helper function
function extractAudience(topic: string): string {
  // Simple extraction logic
  if (topic.toLowerCase().includes('cto')) return 'CTOs';
  if (topic.toLowerCase().includes('developer')) return 'Developers';
  if (topic.toLowerCase().includes('founder')) return 'Founders';
  return 'Business Leaders';
}
```

**Step 5: Run test and commit**

Run: `npm test lib/orchestration/__tests__/response-builder.test.ts`
Expected: All tests PASS

```bash
git add lib/orchestration/response-builder.ts lib/orchestration/__tests__/response-builder.test.ts
git add -p app/api/hgc-v2/route.ts  # Add only orchestration changes
git commit -m "feat(orchestration): add response builder and HGC-v2 orchestration support"
```

---

## Task 5: Client-Side Orchestration Executor

**Files:**
- Create: `components/chat/orchestration-executor.tsx`
- Create: `hooks/use-orchestration.ts`
- Modify: `app/dashboard/layout.tsx`

**Step 1: Write the failing test**

Create `hooks/__tests__/use-orchestration.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrchestration } from '../use-orchestration';

describe('useOrchestration', () => {
  it('executes navigation instruction', async () => {
    const mockPush = vi.fn();
    vi.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush })
    }));

    const { result } = renderHook(() => useOrchestration());

    await act(async () => {
      await result.current.execute({
        navigate: '/dashboard',
        message: 'Opening dashboard...'
      });
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('executes form fill instructions', async () => {
    document.body.innerHTML = `
      <input id="field1" />
      <input id="field2" />
    `;

    const { result } = renderHook(() => useOrchestration());

    await act(async () => {
      await result.current.execute({
        fillFields: [
          { id: 'field1', value: 'Value 1' },
          { id: 'field2', value: 'Value 2', animated: true }
        ]
      });
    });

    expect(document.getElementById('field1')).toHaveValue('Value 1');
    expect(document.getElementById('field2')).toHaveValue('Value 2');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test hooks/__tests__/use-orchestration.test.tsx`
Expected: FAIL with "Cannot find module '../use-orchestration'"

**Step 3: Write minimal implementation**

Create `hooks/use-orchestration.ts`:

```typescript
'use client';

import { useNavigationAPI } from './use-navigation-api';
import { FormControlAPI } from '@/lib/orchestration/form-control-api';
import { OrchestrationInstruction } from '@/lib/orchestration/response-builder';
import { useCallback, useRef } from 'react';

export function useOrchestration() {
  const navigationAPI = useNavigationAPI();
  const formAPI = useRef(new FormControlAPI());

  const execute = useCallback(async (instruction: OrchestrationInstruction) => {
    // Navigate if requested
    if (instruction.navigate) {
      await navigationAPI.navigateTo(
        instruction.navigate,
        instruction.message
      );
    }

    // Wait if requested
    if (instruction.wait) {
      await new Promise(resolve => setTimeout(resolve, instruction.wait));
    }

    // Fill form fields
    if (instruction.fillFields) {
      for (const field of instruction.fillFields) {
        await formAPI.current.fillField(
          field.id,
          field.value,
          { animated: field.animated }
        );
        // Small delay between fields for visibility
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Click button if requested
    if (instruction.clickButton) {
      await formAPI.current.clickButton(instruction.clickButton);
    }
  }, [navigationAPI]);

  return { execute };
}
```

Create `components/chat/orchestration-executor.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { useOrchestration } from '@/hooks/use-orchestration';
import { OrchestrationInstruction } from '@/lib/orchestration/response-builder';

interface OrchestrationExecutorProps {
  instruction?: OrchestrationInstruction;
  onComplete?: () => void;
}

export function OrchestrationExecutor({
  instruction,
  onComplete
}: OrchestrationExecutorProps) {
  const { execute } = useOrchestration();

  useEffect(() => {
    if (!instruction) return;

    const runOrchestration = async () => {
      try {
        await execute(instruction);
        onComplete?.();
      } catch (error) {
        console.error('[ORCHESTRATION_ERROR]', error);
      }
    };

    runOrchestration();
  }, [instruction, execute, onComplete]);

  return null; // This component doesn't render anything
}
```

**Step 4: Run test to verify it passes**

Run: `npm test hooks/__tests__/use-orchestration.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add hooks/use-orchestration.ts hooks/__tests__/use-orchestration.test.tsx
git add components/chat/orchestration-executor.tsx
git commit -m "feat(orchestration): add client-side orchestration executor"
```

---

## Task 6: Integration Test - Full Campaign Creation Flow

**Files:**
- Create: `__tests__/integration/campaign-creation-flow.test.tsx`

**Step 1: Write the integration test**

Create `__tests__/integration/campaign-creation-flow.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the full flow
describe('Campaign Creation Flow - Integration', () => {
  it('creates campaign with visible UI updates', async () => {
    // Mock API response
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/hgc-v2')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            response: "Let's create your campaign. What's it about?",
            orchestration: {
              navigate: '/dashboard/campaigns/new',
              message: 'Opening campaign builder...'
            },
            buttons: [
              { label: 'START CREATING', navigateTo: '/dashboard/campaigns/new' }
            ]
          })
        });
      }
    });

    // User types message
    const chatInput = screen.getByPlaceholderText('Ask HGC anything...');
    await userEvent.type(chatInput, 'Create a LinkedIn campaign about AI tools for CTOs');
    await userEvent.keyboard('{Enter}');

    // Verify navigation happens
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard/campaigns/new');
    });

    // Verify form gets filled
    await waitFor(() => {
      const nameField = screen.getByLabelText('Campaign Name');
      expect(nameField).toHaveValue('AI tools for CTOs');
    });

    // Verify inline buttons appear
    expect(screen.getByRole('button', { name: 'AI CREATE LEAD MAGNET' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "I'LL UPLOAD MY OWN" })).toBeInTheDocument();
  });
});
```

**Step 2: Run test**

Run: `npm test __tests__/integration/campaign-creation-flow.test.tsx`
Expected: Test PASS (or fail gracefully if components not yet integrated)

**Step 3: Commit**

```bash
git add __tests__/integration/campaign-creation-flow.test.tsx
git commit -m "test(orchestration): add integration test for campaign creation flow"
```

---

## Validation Checklist

Before marking complete:

- [ ] Navigation API navigates with toast messages
- [ ] Form Control API fills fields with React events
- [ ] Inline buttons render in chat responses
- [ ] HGC-v2 returns orchestration instructions
- [ ] Client executes orchestration instructions
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] All tests pass: `npm test`
- [ ] User can see fields being filled
- [ ] Animations are smooth and visible
- [ ] AgentKit tools still work properly

---

## Critical Reminders

**AgentKit Integration:**
- Use `@openai/agents` SDK only
- Tools come from chips in cartridges
- No raw OpenAI API calls

**Mem0 Integration:**
- Store orchestration context
- Remember user preferences
- Scope: `agencyId::clientId::userId`

**Console DB:**
- Load from `console_prompts` table
- Never hardcode configurations
- Skills cartridge has tool definitions

**Health Monitoring:**
- Check `/api/health` shows all green
- Verify AgentKit is active
- Confirm Mem0 is connected

---

## Time Estimate

- **Task 1:** Navigation API - 30 minutes
- **Task 2:** Form Control API - 45 minutes
- **Task 3:** Inline Buttons - 30 minutes
- **Task 4:** Response Builder - 45 minutes
- **Task 5:** Client Executor - 45 minutes
- **Task 6:** Integration Test - 30 minutes

**Total:** ~3.5 hours for core implementation

## Next Steps After This Plan

1. **Lead Magnet Generation Flow** - AI creates PDF
2. **Post Writing Interface** - Visible content generation
3. **Pod Alert System** - Show member notifications
4. **Background Monitoring** - After visible creation