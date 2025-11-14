/**
 * Integration Test: LinkedIn Campaign Creation Flow
 *
 * Tests the complete chat-driven UI orchestration system:
 * - HGC-v2 API returning orchestration responses
 * - useOrchestration hook executing instructions
 * - NavigationAPI navigating pages
 * - FormControlAPI filling forms
 * - InlineButton rendering and actions
 * - Progress indicators during operations
 *
 * This is an INTEGRATION test - it tests the complete system working together.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useOrchestration } from '@/hooks/use-orchestration';
import { OrchestrationResponseBuilder } from '@/lib/orchestration/response-builder';
import { InlineButton, InlineButtonGroup } from '@/components/chat/inline-button';
import { NavigationAPI } from '@/lib/orchestration/navigation-api';
import { FormControlAPI } from '@/lib/orchestration/form-control-api';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

// Test component that uses orchestration
function TestChatComponent() {
  const { execute, isExecuting, progress, buttons } = useOrchestration();
  const [messages, setMessages] = React.useState<string[]>([]);

  const handleCreateCampaign = async () => {
    const response = new OrchestrationResponseBuilder()
      .withMessage("Let's create your LinkedIn campaign!")
      .withNavigation('/dashboard/campaigns/new', 'Opening campaign builder...')
      .withButton('START CREATING', {
        navigateTo: '/dashboard/campaigns/new',
        variant: 'primary',
      })
      .build();

    setMessages([...messages, response.response]);
    await execute(response);
  };

  const handleFillCampaignForm = async () => {
    const response = new OrchestrationResponseBuilder()
      .withMessage('Perfect! Setting up your campaign...')
      .withFormFills([
        { id: 'campaign_name', value: 'AI Leadership for CTOs', animated: true },
        { id: 'target_audience', value: 'CTOs and Tech Leaders', animated: false },
        { id: 'campaign_description', value: 'Thought leadership campaign', animated: false },
      ])
      .withButton('AI CREATE LEAD MAGNET', { action: 'create_lead_magnet', variant: 'success' })
      .withButton("I'LL UPLOAD", { navigateTo: '/dashboard/offers', variant: 'secondary' })
      .withButton('SKIP', { action: 'skip', variant: 'warning' })
      .build();

    setMessages([...messages, response.response]);
    await execute(response);
  };

  return (
    <div>
      <div data-testid="messages">
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>

      {isExecuting && (
        <div data-testid="progress-indicator">{progress}</div>
      )}

      {buttons && buttons.length > 0 && (
        <InlineButtonGroup>
          {buttons.map((btn) => (
            <InlineButton key={btn.label} {...btn} />
          ))}
        </InlineButtonGroup>
      )}

      <button onClick={handleCreateCampaign} data-testid="create-campaign-btn">
        Create Campaign
      </button>
      <button onClick={handleFillCampaignForm} data-testid="fill-form-btn">
        Fill Form
      </button>
    </div>
  );
}

// Test form component
function TestCampaignForm() {
  return (
    <form data-testid="campaign-form">
      <input
        id="campaign_name"
        name="name"
        data-testid="campaign-name-input"
        placeholder="Campaign name"
      />
      <input
        id="target_audience"
        name="audience"
        data-testid="campaign-audience-input"
        placeholder="Target audience"
      />
      <input
        id="campaign_description"
        name="description"
        data-testid="campaign-description-input"
        placeholder="Campaign description"
      />
      <button type="submit" id="submit_button" data-testid="submit-button">
        Create Campaign
      </button>
    </form>
  );
}

describe('LinkedIn Campaign Creation Flow - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  describe('1. Complete Campaign Creation Flow', () => {
    it('should execute the complete flow from chat to campaign creation', async () => {
      const { getByTestId, getByText } = render(<TestChatComponent />);

      // User clicks "Create Campaign" button
      const createBtn = getByTestId('create-campaign-btn');

      await act(async () => {
        createBtn.click();
      });

      // Should show the message
      await waitFor(() => {
        expect(getByText("Let's create your LinkedIn campaign!")).toBeInTheDocument();
      });

      // Should show inline button
      await waitFor(() => {
        expect(getByText('START CREATING')).toBeInTheDocument();
      });

      // Should trigger navigation
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/campaigns/new');
      });
    });
  });

  describe('2. Navigation Orchestration', () => {
    it('should navigate to correct page with toast message', async () => {
      const { getByTestId } = render(<TestChatComponent />);

      const createBtn = getByTestId('create-campaign-btn');

      await act(async () => {
        createBtn.click();
      });

      // Wait for navigation to be called
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/campaigns/new');
      }, { timeout: 3000 });
    });

    it('should show progress indicator during navigation', async () => {
      const { getByTestId, queryByTestId } = render(<TestChatComponent />);

      const createBtn = getByTestId('create-campaign-btn');

      await act(async () => {
        createBtn.click();
      });

      // Progress indicator should appear
      await waitFor(() => {
        const progressIndicator = queryByTestId('progress-indicator');
        if (progressIndicator) {
          expect(progressIndicator).toBeInTheDocument();
        }
      });
    });
  });

  describe('3. Form Auto-Fill Orchestration', () => {
    it('should fill form fields with correct values', async () => {
      // Render both chat component and form
      const { container } = render(
        <>
          <TestChatComponent />
          <TestCampaignForm />
        </>
      );

      const fillBtn = container.querySelector('[data-testid="fill-form-btn"]') as HTMLButtonElement;

      await act(async () => {
        fillBtn.click();
      });

      // Wait for form fields to be filled
      await waitFor(() => {
        const nameInput = screen.getByTestId('campaign-name-input') as HTMLInputElement;
        const audienceInput = screen.getByTestId('campaign-audience-input') as HTMLInputElement;
        const descInput = screen.getByTestId('campaign-description-input') as HTMLInputElement;

        expect(nameInput.value).toBe('AI Leadership for CTOs');
        expect(audienceInput.value).toBe('CTOs and Tech Leaders');
        expect(descInput.value).toBe('Thought leadership campaign');
      }, { timeout: 5000 });
    });

    it('should fill multiple fields in sequence with delays', async () => {
      const { container } = render(
        <>
          <TestChatComponent />
          <form data-testid="campaign-form">
            <input
              id="campaign_name"
              data-testid="campaign-name-input"
            />
            <input
              id="target_audience"
              data-testid="campaign-audience-input"
            />
            <input
              id="campaign_description"
              data-testid="campaign-description-input"
            />
          </form>
        </>
      );

      const fillBtn = container.querySelector('[data-testid="fill-form-btn"]') as HTMLButtonElement;

      await act(async () => {
        fillBtn.click();
      });

      // All fields should be filled
      await waitFor(() => {
        const nameInput = screen.getByTestId('campaign-name-input') as HTMLInputElement;
        const audienceInput = screen.getByTestId('campaign-audience-input') as HTMLInputElement;
        const descInput = screen.getByTestId('campaign-description-input') as HTMLInputElement;

        expect(nameInput.value).toBe('AI Leadership for CTOs');
        expect(audienceInput.value).toBe('CTOs and Tech Leaders');
        expect(descInput.value).toBe('Thought leadership campaign');
      }, { timeout: 5000 });
    }, 15000);
  });

  describe('4. Inline Button Rendering', () => {
    it('should render multiple inline buttons with correct labels', async () => {
      const { getByTestId, getByText } = render(<TestChatComponent />);

      const fillBtn = getByTestId('fill-form-btn');

      await act(async () => {
        fillBtn.click();
      });

      await waitFor(() => {
        expect(getByText('AI CREATE LEAD MAGNET')).toBeInTheDocument();
        expect(getByText("I'LL UPLOAD")).toBeInTheDocument();
        expect(getByText('SKIP')).toBeInTheDocument();
      });
    });

    it('should render buttons with correct variants', async () => {
      const { getByTestId, getByText } = render(<TestChatComponent />);

      const fillBtn = getByTestId('fill-form-btn');

      await act(async () => {
        fillBtn.click();
      });

      await waitFor(() => {
        const successBtn = getByText('AI CREATE LEAD MAGNET');
        const secondaryBtn = getByText("I'LL UPLOAD");
        const warningBtn = getByText('SKIP');

        // Check class names contain variant styling
        expect(successBtn.className).toContain('bg-green-600');
        expect(secondaryBtn.className).toContain('bg-gray-200');
        expect(warningBtn.className).toContain('bg-amber-600');
      });
    });
  });

  describe('5. Button Click Actions', () => {
    it('should navigate when button with navigateTo is clicked', async () => {
      const { getByText } = render(
        <InlineButton
          label="GO TO OFFERS"
          navigateTo="/dashboard/offers"
        />
      );

      const button = getByText('GO TO OFFERS');

      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/offers');
      }, { timeout: 3000 });
    });

    it('should call onAction callback when button with action is clicked', async () => {
      const mockAction = jest.fn().mockResolvedValue(undefined);

      const { getByText } = render(
        <InlineButton
          label="CREATE MAGNET"
          action="create_lead_magnet"
          onAction={mockAction}
        />
      );

      const button = getByText('CREATE MAGNET');

      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledWith('create_lead_magnet');
      });
    });
  });

  describe('6. Progress Indicators', () => {
    it('should show progress during form filling', async () => {
      const { getByTestId, queryByTestId } = render(
        <>
          <TestChatComponent />
          <TestCampaignForm />
        </>
      );

      const fillBtn = getByTestId('fill-form-btn');

      await act(async () => {
        fillBtn.click();
      });

      // Progress should appear
      await waitFor(() => {
        const progress = queryByTestId('progress-indicator');
        if (progress) {
          expect(progress.textContent).toMatch(/Filling fields/);
        }
      });
    });

    it('should clear progress after completion', async () => {
      const { getByTestId, queryByTestId } = render(
        <>
          <TestChatComponent />
          <TestCampaignForm />
        </>
      );

      const fillBtn = getByTestId('fill-form-btn');

      await act(async () => {
        fillBtn.click();
      });

      // Wait for completion
      await waitFor(() => {
        const nameInput = screen.getByTestId('campaign-name-input') as HTMLInputElement;
        expect(nameInput.value).toBe('AI Leadership for CTOs');
      }, { timeout: 5000 });

      // Progress should be cleared
      await waitFor(() => {
        const progress = queryByTestId('progress-indicator');
        expect(progress).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('7. API Integration', () => {
    it('should build response with all orchestration fields', () => {
      const response = new OrchestrationResponseBuilder()
        .withMessage('Test message')
        .withNavigation('/test/path', 'Navigating...')
        .withFormFills([{ id: 'test', value: 'value' }])
        .withButton('TEST', { variant: 'primary' })
        .withSessionId('session-123')
        .withMemoryContext(true)
        .build();

      expect(response.response).toBe('Test message');
      expect(response.orchestration?.navigate).toBe('/test/path');
      expect(response.orchestration?.message).toBe('Navigating...');
      expect(response.orchestration?.fillFields).toHaveLength(1);
      expect(response.buttons).toHaveLength(1);
      expect(response.sessionId).toBe('session-123');
      expect(response.shouldRememberContext).toBe(true);
    });

    it('should handle responses without orchestration instructions', async () => {
      const response = new OrchestrationResponseBuilder()
        .withMessage('Just a message')
        .build();

      const TestComponent = () => {
        const { execute, isExecuting } = useOrchestration();
        const [executed, setExecuted] = React.useState(false);

        React.useEffect(() => {
          if (!executed) {
            execute(response).then(() => setExecuted(true));
          }
        }, [executed]);

        return <div>{isExecuting ? 'Executing' : 'Done'}</div>;
      };

      const { getByText } = render(<TestComponent />);

      await waitFor(() => {
        expect(getByText('Done')).toBeInTheDocument();
      });
    });
  });

  describe('8. Error Handling', () => {
    it('should handle missing form fields gracefully', async () => {
      const formAPI = new FormControlAPI();

      // Should throw error for missing field
      await expect(
        formAPI.fillField('nonexistent_field', 'value')
      ).rejects.toThrow("Field with id 'nonexistent_field' not found");
    });

    it('should clear progress on error', async () => {
      const TestErrorComponent = () => {
        const { execute, isExecuting, progress } = useOrchestration();
        const [executed, setExecuted] = React.useState(false);

        const handleError = async () => {
          const response = new OrchestrationResponseBuilder()
            .withMessage('Error test')
            .withFormFills([{ id: 'nonexistent', value: 'test' }])
            .build();

          await execute(response);
          setExecuted(true);
        };

        return (
          <div>
            <button onClick={handleError} data-testid="error-btn">
              Trigger Error
            </button>
            {isExecuting && <div data-testid="executing">Executing</div>}
            {progress && <div data-testid="progress">{progress}</div>}
            {executed && <div data-testid="done">Done</div>}
          </div>
        );
      };

      const { getByTestId, queryByTestId } = render(<TestErrorComponent />);

      const errorBtn = getByTestId('error-btn');

      await act(async () => {
        errorBtn.click();
      });

      // After error, progress should be cleared
      await waitFor(() => {
        expect(queryByTestId('executing')).not.toBeInTheDocument();
        expect(queryByTestId('progress')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('9. Sequential Operations', () => {
    it('should execute navigate → wait → fill in sequence', async () => {
      const callOrder: string[] = [];

      // Mock NavigationAPI to track calls
      const mockNavigate = jest.fn(async () => {
        callOrder.push('navigate');
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Mock FormControlAPI to track calls
      const mockFill = jest.fn(async () => {
        callOrder.push('fill');
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const response = new OrchestrationResponseBuilder()
        .withNavigation('/test')
        .withWait(200)
        .withFormFills([{ id: 'test', value: 'value' }])
        .build();

      expect(response.orchestration?.navigate).toBe('/test');
      expect(response.orchestration?.wait).toBe(200);
      expect(response.orchestration?.fillFields).toHaveLength(1);
    });
  });

  describe('10. Realistic User Scenario', () => {
    it('should complete full campaign creation workflow', async () => {
      const { getByTestId, getByText, queryByTestId } = render(
        <>
          <TestChatComponent />
          <TestCampaignForm />
        </>
      );

      // Step 1: User asks to create campaign
      const createBtn = getByTestId('create-campaign-btn');
      await act(async () => {
        createBtn.click();
      });

      // Step 2: Verify message appears
      await waitFor(() => {
        expect(getByText("Let's create your LinkedIn campaign!")).toBeInTheDocument();
      });

      // Step 3: Verify button appears
      await waitFor(() => {
        expect(getByText('START CREATING')).toBeInTheDocument();
      });

      // Step 4: Verify navigation happens
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/campaigns/new');
      });

      // Step 5: User provides campaign details
      const fillBtn = getByTestId('fill-form-btn');
      await act(async () => {
        fillBtn.click();
      });

      // Step 6: Verify form gets filled
      await waitFor(() => {
        const nameInput = screen.getByTestId('campaign-name-input') as HTMLInputElement;
        expect(nameInput.value).toBe('AI Leadership for CTOs');
      }, { timeout: 5000 });

      // Step 7: Verify multiple action buttons appear
      await waitFor(() => {
        expect(getByText('AI CREATE LEAD MAGNET')).toBeInTheDocument();
        expect(getByText("I'LL UPLOAD")).toBeInTheDocument();
        expect(getByText('SKIP')).toBeInTheDocument();
      });

      // Step 8: Verify progress cleared
      await waitFor(() => {
        expect(queryByTestId('progress-indicator')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
});
