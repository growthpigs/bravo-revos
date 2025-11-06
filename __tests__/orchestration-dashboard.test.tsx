/**
 * F-01 Orchestration Dashboard - Component Tests
 *
 * Tests the browser-based UI for testing AgentKit orchestration features.
 *
 * CRITICAL: These tests validate the React component that provides a UI
 * for testing the 4 core F-01 AgentKit features:
 * 1. orchestrate_post
 * 2. optimize_message
 * 3. analyze_performance
 * 4. generate_post
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrchestrationDashboard from '@/app/admin/orchestration-dashboard/page';

// Mock fetch globally
global.fetch = jest.fn();

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid={`input-${placeholder}`}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardFooter: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-testid={`alert-${variant || 'default'}`}>{children}</div>
  ),
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

describe('F-01 Orchestration Dashboard', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without errors', () => {
      render(<OrchestrationDashboard />);
      expect(
        screen.getByText('F-01 AgentKit Campaign Orchestration Dashboard')
      ).toBeInTheDocument();
    });

    it('should render all 4 action sections', () => {
      render(<OrchestrationDashboard />);
      expect(screen.getByText('1. Orchestrate Post (Core F-01 Feature)')).toBeInTheDocument();
      expect(screen.getByText('2. Optimize Message')).toBeInTheDocument();
      expect(screen.getByText('3. Analyze Performance')).toBeInTheDocument();
      expect(screen.getByText('4. Generate Post Content')).toBeInTheDocument();
    });

    it('should render all input fields', () => {
      render(<OrchestrationDashboard />);
      expect(screen.getByText('Campaign ID')).toBeInTheDocument();
      expect(screen.getByText('Pod ID')).toBeInTheDocument();
      expect(screen.getByText('Post ID')).toBeInTheDocument();
      expect(screen.getByText('Original Message')).toBeInTheDocument();
      expect(screen.getByText('Topic')).toBeInTheDocument();
    });

    it('should render all action buttons', () => {
      render(<OrchestrationDashboard />);
      expect(screen.getByText('Orchestrate Post')).toBeInTheDocument();
      expect(screen.getByText('Optimize Message')).toBeInTheDocument();
      expect(screen.getByText('Analyze Performance')).toBeInTheDocument();
      expect(screen.getByText('Generate Post')).toBeInTheDocument();
    });

    it('should render instructions card', () => {
      render(<OrchestrationDashboard />);
      expect(screen.getByText('How to Use')).toBeInTheDocument();
      expect(screen.getByText(/Enter your Campaign ID, Pod ID, and Post ID/)).toBeInTheDocument();
    });
  });

  describe('Input Field Updates', () => {
    it('should update campaignId when input changes', () => {
      render(<OrchestrationDashboard />);
      const input = screen.getByPlaceholderText('e.g., campaign-uuid') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'campaign-123' } });
      expect(input.value).toBe('campaign-123');
    });

    it('should update podId when input changes', () => {
      render(<OrchestrationDashboard />);
      const input = screen.getByPlaceholderText('e.g., pod-uuid') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'pod-456' } });
      expect(input.value).toBe('pod-456');
    });

    it('should update postId when input changes', () => {
      render(<OrchestrationDashboard />);
      const input = screen.getByPlaceholderText('e.g., post-uuid') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'post-789' } });
      expect(input.value).toBe('post-789');
    });

    it('should update messageText when input changes', () => {
      render(<OrchestrationDashboard />);
      const input = screen.getByPlaceholderText('Message to optimize') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'New message text' } });
      expect(input.value).toBe('New message text');
    });

    it('should update topic when input changes', () => {
      render(<OrchestrationDashboard />);
      const input = screen.getByPlaceholderText('Post topic') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Leadership tips' } });
      expect(input.value).toBe('Leadership tips');
    });
  });

  describe('Button Validation', () => {
    it('should disable Orchestrate Post button when required fields are missing', () => {
      render(<OrchestrationDashboard />);
      const button = screen.getByText('Orchestrate Post') as HTMLButtonElement;

      // Initially disabled (no campaign, pod, or post ID)
      expect(button.disabled).toBe(true);
    });

    it('should enable Orchestrate Post button when all required fields are filled', () => {
      render(<OrchestrationDashboard />);

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., pod-uuid'), {
        target: { value: 'pod-456' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., post-uuid'), {
        target: { value: 'post-789' },
      });

      const button = screen.getByText('Orchestrate Post') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });

    it('should disable Optimize Message button when campaignId is missing', () => {
      render(<OrchestrationDashboard />);
      const button = screen.getByText('Optimize Message') as HTMLButtonElement;

      expect(button.disabled).toBe(true);
    });

    it('should disable Analyze Performance button when campaignId is missing', () => {
      render(<OrchestrationDashboard />);
      const button = screen.getByText('Analyze Performance') as HTMLButtonElement;

      expect(button.disabled).toBe(true);
    });

    it('should disable Generate Post button when campaignId is missing', () => {
      render(<OrchestrationDashboard />);
      const button = screen.getByText('Generate Post') as HTMLButtonElement;

      expect(button.disabled).toBe(true);
    });
  });

  describe('API Calls - orchestrate_post', () => {
    it('should call API with correct payload for orchestrate_post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          activitiesScheduled: 10,
          strategy: { timing: 'optimal', likeWindow: [1, 30] },
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., pod-uuid'), {
        target: { value: 'pod-456' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., post-uuid'), {
        target: { value: 'post-789' },
      });

      // Click button
      const button = screen.getByText('Orchestrate Post');
      fireEvent.click(button);

      // Verify fetch was called with correct payload
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/agentkit/orchestrate',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'orchestrate_post',
              postId: 'post-789',
              campaignId: 'campaign-123',
              podId: 'pod-456',
            }),
          })
        );
      });
    });

    it('should display success result for orchestrate_post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          activitiesScheduled: 10,
          strategy: { timing: 'optimal' },
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill fields and click
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., pod-uuid'), {
        target: { value: 'pod-456' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., post-uuid'), {
        target: { value: 'post-789' },
      });
      fireEvent.click(screen.getByText('Orchestrate Post'));

      // Wait for result to display
      await waitFor(() => {
        expect(screen.getByText('✅ Success')).toBeInTheDocument();
        expect(screen.getByText('Activities Scheduled: 10')).toBeInTheDocument();
      });
    });

    it('should display error result for orchestrate_post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Invalid campaign ID',
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill fields and click
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'invalid-campaign' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., pod-uuid'), {
        target: { value: 'pod-456' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., post-uuid'), {
        target: { value: 'post-789' },
      });
      fireEvent.click(screen.getByText('Orchestrate Post'));

      // Wait for error to display
      await waitFor(() => {
        expect(screen.getByText('❌ Failed')).toBeInTheDocument();
        expect(screen.getByText('Invalid campaign ID')).toBeInTheDocument();
      });
    });
  });

  describe('API Calls - optimize_message', () => {
    it('should call API with correct payload for optimize_message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          optimizedMessage: 'Better message',
          confidence: 0.85,
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });

      // Click button
      const button = screen.getByText('Optimize Message');
      fireEvent.click(button);

      // Verify fetch was called with correct payload
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/agentkit/orchestrate',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'optimize_message',
              campaignId: 'campaign-123',
              messageType: 'dm_initial',
              originalMessage: 'Hi, I have a framework that helps with scaling.',
              goal: 'engagement',
            }),
          })
        );
      });
    });

    it('should display optimized message result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          optimizedMessage: 'Saw your comment - excited to share!',
          confidence: 0.85,
          variants: ['Variant 1', 'Variant 2'],
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill fields and click
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });
      fireEvent.click(screen.getByText('Optimize Message'));

      // Wait for result to display
      await waitFor(() => {
        expect(screen.getByText('✅ Success')).toBeInTheDocument();
        expect(screen.getByText(/Optimized:/)).toBeInTheDocument();
        expect(screen.getByText(/Saw your comment - excited to share!/)).toBeInTheDocument();
        expect(screen.getByText(/Confidence:/)).toBeInTheDocument();
        expect(screen.getByText(/85%/)).toBeInTheDocument();
      });
    });
  });

  describe('API Calls - analyze_performance', () => {
    it('should call API with correct payload for analyze_performance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          analysis: { overallScore: 75, insights: [] },
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });

      // Click button
      const button = screen.getByText('Analyze Performance');
      fireEvent.click(button);

      // Verify fetch was called with correct payload
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/agentkit/orchestrate',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'analyze_performance',
              campaignId: 'campaign-123',
              timeRange: '7d',
            }),
          })
        );
      });
    });

    it('should display analysis result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          analysis: {
            overallScore: 75,
            insights: ['Insight 1', 'Insight 2'],
            recommendations: ['Recommendation 1'],
          },
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill fields and click
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });
      fireEvent.click(screen.getByText('Analyze Performance'));

      // Wait for result to display
      await waitFor(() => {
        expect(screen.getByText('✅ Success')).toBeInTheDocument();
        // Analysis object is displayed as JSON
        expect(screen.getByText(/"overallScore"/)).toBeInTheDocument();
      });
    });
  });

  describe('API Calls - generate_post', () => {
    it('should call API with correct payload for generate_post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          postContent: { postText: 'Generated post', hashtags: [] },
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });

      // Click button
      const button = screen.getByText('Generate Post');
      fireEvent.click(button);

      // Verify fetch was called with correct payload
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/agentkit/orchestrate',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'generate_post',
              campaignId: 'campaign-123',
              topic: 'How to scale your leadership team',
            }),
          })
        );
      });
    });

    it('should display generated post result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          postContent: {
            postText: 'After coaching 500+ CEOs...\n\nComment SCALE below!',
            hashtags: ['#Leadership', '#Scaling'],
            bestPostingTime: 'Tuesday 10am',
          },
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill fields and click
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });
      fireEvent.click(screen.getByText('Generate Post'));

      // Wait for result to display
      await waitFor(() => {
        expect(screen.getByText('✅ Success')).toBeInTheDocument();
        // Post content object is displayed as JSON
        expect(screen.getByText(/"postText"/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should disable all buttons during loading', async () => {
      // Mock a slow response
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true }),
                } as Response),
              100
            )
          )
      );

      render(<OrchestrationDashboard />);

      // Fill fields
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., pod-uuid'), {
        target: { value: 'pod-456' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., post-uuid'), {
        target: { value: 'post-789' },
      });

      // Click button
      const button = screen.getByText('Orchestrate Post') as HTMLButtonElement;
      fireEvent.click(button);

      // Buttons should be disabled during loading
      expect(button.disabled).toBe(true);
      expect((screen.getByText('Optimize Message') as HTMLButtonElement).disabled).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(button.disabled).toBe(false);
      });
    });

    it('should clear previous results when starting new request', async () => {
      // First request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          activitiesScheduled: 10,
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill fields and click
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., pod-uuid'), {
        target: { value: 'pod-456' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., post-uuid'), {
        target: { value: 'post-789' },
      });
      fireEvent.click(screen.getByText('Orchestrate Post'));

      // Wait for first result
      await waitFor(() => {
        expect(screen.getByText('✅ Success')).toBeInTheDocument();
      });

      // Second request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          activitiesScheduled: 5,
        }),
      } as Response);

      fireEvent.click(screen.getByText('Orchestrate Post'));

      // Previous result should be cleared during loading
      // (Implementation clears result before making new request)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<OrchestrationDashboard />);

      // Fill fields and click
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., pod-uuid'), {
        target: { value: 'pod-456' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., post-uuid'), {
        target: { value: 'post-789' },
      });
      fireEvent.click(screen.getByText('Orchestrate Post'));

      // Wait for error to display
      await waitFor(() => {
        expect(screen.getByText('❌ Failed')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should handle API errors with error messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Campaign not found',
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill fields and click
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'invalid-campaign' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., pod-uuid'), {
        target: { value: 'pod-456' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., post-uuid'), {
        target: { value: 'post-789' },
      });
      fireEvent.click(screen.getByText('Orchestrate Post'));

      // Wait for error to display
      await waitFor(() => {
        expect(screen.getByText('❌ Failed')).toBeInTheDocument();
      });
    });
  });

  describe('Timestamp Accuracy', () => {
    it('should include timestamp in results', async () => {
      const beforeTime = new Date();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          activitiesScheduled: 10,
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill fields and click
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., pod-uuid'), {
        target: { value: 'pod-456' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., post-uuid'), {
        target: { value: 'post-789' },
      });
      fireEvent.click(screen.getByText('Orchestrate Post'));

      const afterTime = new Date();

      // Wait for result with timestamp
      await waitFor(() => {
        expect(screen.getByText(/Timestamp:/)).toBeInTheDocument();
      });

      // Timestamp should be between beforeTime and afterTime
      const timestampElement = screen.getByText(/Timestamp:/);
      expect(timestampElement).toBeInTheDocument();
    });
  });

  describe('UI State Consistency', () => {
    it('should maintain input values after API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      } as Response);

      render(<OrchestrationDashboard />);

      // Fill fields
      fireEvent.change(screen.getByPlaceholderText('e.g., campaign-uuid'), {
        target: { value: 'campaign-123' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., pod-uuid'), {
        target: { value: 'pod-456' },
      });

      // Click button
      fireEvent.click(screen.getByText('Analyze Performance'));

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('✅ Success')).toBeInTheDocument();
      });

      // Input values should still be present
      const campaignInput = screen.getByPlaceholderText('e.g., campaign-uuid') as HTMLInputElement;
      const podInput = screen.getByPlaceholderText('e.g., pod-uuid') as HTMLInputElement;

      expect(campaignInput.value).toBe('campaign-123');
      expect(podInput.value).toBe('pod-456');
    });
  });
});
