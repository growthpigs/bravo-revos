# Chat-Driven UI Orchestration - Implementation Plan

**Timeline:** 2-3 days
**Approach:** Build navigation + form control + inline buttons for visible UI automation

## Day 1: Core Infrastructure (7 hours)

### Task 1.1: Navigation Control API (2 hours)

**Create:** `lib/orchestration/navigation-api.ts`

```typescript
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toast';

export class NavigationAPI {
  private router;

  constructor(router) {
    this.router = router;
  }

  async navigateTo(path: string, message?: string) {
    // Show toast about navigation
    if (message) {
      toast.info(`🤖 ${message}`);
    }

    // Add slight delay so user sees the message
    await new Promise(resolve => setTimeout(resolve, 500));

    // Navigate
    this.router.push(path);

    // Return promise that resolves when navigation complete
    return new Promise(resolve => {
      setTimeout(resolve, 1000); // Allow page to load
    });
  }

  getCurrentPath() {
    return window.location.pathname;
  }
}
```

**Create:** `hooks/use-navigation-api.ts`

```typescript
export function useNavigationAPI() {
  const router = useRouter();
  return new NavigationAPI(router);
}
```

### Task 1.2: Form Control API (3 hours)

**Create:** `lib/orchestration/form-control-api.ts`

```typescript
export class FormControlAPI {
  async fillField(fieldId: string, value: string, options = {}) {
    const element = document.getElementById(fieldId);
    if (!element) throw new Error(`Field ${fieldId} not found`);

    // Visual typing effect
    if (options.animated) {
      await this.animateTyping(element, value);
    } else {
      element.value = value;
    }

    // Trigger React events
    this.triggerReactChange(element);

    // Visual highlight
    this.highlightField(element);
  }

  private async animateTyping(element: HTMLInputElement, text: string) {
    element.focus();
    for (let i = 0; i <= text.length; i++) {
      element.value = text.slice(0, i);
      this.triggerReactChange(element);
      await new Promise(r => setTimeout(r, 50)); // Type speed
    }
  }

  private triggerReactChange(element: HTMLElement) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    nativeInputValueSetter.call(element, element.value);

    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
  }

  private highlightField(element: HTMLElement) {
    element.classList.add('ai-highlight');
    setTimeout(() => {
      element.classList.remove('ai-highlight');
    }, 2000);
  }
}
```

**Add CSS:** `styles/orchestration.css`

```css
@keyframes ai-highlight {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
  50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}

.ai-highlight {
  animation: ai-highlight 2s ease-out;
}
```

### Task 1.3: Inline Button System (2 hours)

**Create:** `components/chat/inline-button.tsx`

```typescript
interface InlineButtonProps {
  label: string;
  action?: string; // Tool to execute
  navigateTo?: string; // Path to navigate
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: () => void;
}

export function InlineButton({
  label,
  action,
  navigateTo,
  variant = 'primary',
  disabled = false,
  onClick
}: InlineButtonProps) {
  const navigationAPI = useNavigationAPI();

  const handleClick = async () => {
    // Custom handler first
    if (onClick) {
      await onClick();
    }

    // Navigate if specified
    if (navigateTo) {
      await navigationAPI.navigateTo(
        navigateTo,
        `Opening ${label.toLowerCase()}...`
      );
    }

    // Execute tool if specified
    if (action) {
      await executeAction(action);
    }
  };

  return (
    <button
      className={cn(
        'inline-flex items-center px-4 py-2 rounded-md',
        'transition-all duration-200',
        variant === 'primary'
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
```

## Day 2: LinkedIn Campaign Flow (7 hours)

### Task 2.1: Campaign Creation Flow (3 hours)

**Update:** `app/api/hgc-v2/route.ts`

Add orchestration commands to response:

```typescript
// Detect UI orchestration requests
if (message.includes('create') && message.includes('campaign')) {
  return {
    response: "Let's build your campaign together. What's it about?",
    orchestration: {
      navigate: '/dashboard/campaigns/new',
      message: 'Opening campaign builder...'
    },
    buttons: [
      { label: 'START CREATING', navigateTo: '/dashboard/campaigns/new' }
    ]
  };
}

// When user provides campaign topic
if (context.currentPage === '/dashboard/campaigns/new') {
  return {
    response: `Perfect! I'll set up "${userInput}" as your campaign.`,
    orchestration: {
      fillFields: [
        { id: 'campaign_name', value: userInput, animated: true },
        { id: 'target_audience', value: extractAudience(userInput) }
      ]
    },
    buttons: [
      { label: 'AI CREATE LEAD MAGNET', action: 'create_lead_magnet' },
      { label: "I'LL UPLOAD", navigateTo: '/dashboard/offers' },
      { label: 'SKIP LEAD MAGNET', action: 'continue' }
    ]
  };
}
```

### Task 2.2: Form Auto-Fill Implementation (2 hours)

**Update:** `app/dashboard/campaigns/new/page.tsx`

```typescript
export default function NewCampaignPage() {
  const [orchestration, setOrchestration] = useState(null);
  const formAPI = new FormControlAPI();

  useEffect(() => {
    // Listen for orchestration commands
    const handleOrchestration = async (event) => {
      const { fillFields } = event.detail;

      if (fillFields) {
        for (const field of fillFields) {
          await formAPI.fillField(
            field.id,
            field.value,
            { animated: field.animated }
          );
          // Pause between fields for visibility
          await new Promise(r => setTimeout(r, 500));
        }
      }
    };

    window.addEventListener('hgc:orchestrate', handleOrchestration);
    return () => window.removeEventListener('hgc:orchestrate', handleOrchestration);
  }, []);

  return (
    <form id="campaign-form">
      <input
        id="campaign_name"
        name="name"
        placeholder="Campaign name"
        className="transition-all duration-200"
      />
      <input
        id="target_audience"
        name="audience"
        placeholder="Target audience"
        className="transition-all duration-200"
      />
      {/* More fields */}
    </form>
  );
}
```

### Task 2.3: Progress Indicators (2 hours)

**Create:** `components/orchestration/progress-indicator.tsx`

```typescript
export function ProgressIndicator({
  message,
  progress,
  isComplete
}: {
  message: string;
  progress?: number;
  isComplete?: boolean;
}) {
  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 min-w-[300px]">
      <div className="flex items-center gap-3">
        {!isComplete && (
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
        )}
        {isComplete && (
          <CheckCircle className="h-5 w-5 text-green-600" />
        )}
        <span className="text-sm font-medium">{message}</span>
      </div>

      {progress !== undefined && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

## Day 3: Testing & Polish (4 hours)

### Task 3.1: End-to-End Flow Test (2 hours)

**Create:** `__tests__/orchestration/linkedin-campaign-flow.test.ts`

```typescript
describe('LinkedIn Campaign Creation Flow', () => {
  it('creates campaign with visible UI updates', async () => {
    // Start at dashboard
    render(<Dashboard />);

    // User asks to create campaign
    await userEvent.type(chatInput, 'Create LinkedIn campaign');
    await userEvent.click(sendButton);

    // Verify navigation happens
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard/campaigns/new');
    });

    // Verify form fields get filled
    await waitFor(() => {
      expect(screen.getByLabelText('Campaign name')).toHaveValue('AI Leadership for CTOs');
    });

    // Verify inline buttons appear
    expect(screen.getByText('AI CREATE LEAD MAGNET')).toBeInTheDocument();
  });
});
```

### Task 3.2: Polish & Animation (2 hours)

- Add smooth transitions between pages
- Implement typing animation for all text fields
- Add success/error animations
- Create loading skeletons during navigation
- Add sound effects (optional, subtle)

## Deployment Checklist

- [ ] Navigation API works with Next.js app router
- [ ] Form fields update with proper React events
- [ ] Inline buttons render in chat responses
- [ ] Progress indicators show for async operations
- [ ] LinkedIn campaign flow works end-to-end
- [ ] User can see every action happening
- [ ] Smooth animations enhance visibility
- [ ] TypeScript compiles without errors
- [ ] Tests pass for orchestration flow
- [ ] AgentKit still handles tool execution

## Success Metrics

✅ Time to create campaign: <2 minutes (vs 10 manual)
✅ User confidence: Can see every step
✅ Zero "black box" moments
✅ Smooth transitions between pages
✅ Form fills are visually satisfying
✅ Progress indicators for all async work

## Notes

This approach is fundamentally different from hidden workflows. The user becomes a participant watching AI help them, rather than AI doing things invisibly. This builds trust and teaches the user the UI at the same time.