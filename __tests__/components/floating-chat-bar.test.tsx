/**
 * FloatingChatBar Component Tests
 *
 * Tests the three-state chat system: floating bar, sidebar, and fullscreen modes.
 * Validates state transitions, visual icon navigation, animations, message rendering,
 * auto-fullscreen detection, and input bar behavior.
 *
 * Component Features:
 * - Three states: floating bar (default), sidebar, fullscreen
 * - Visual icon navigation between states
 * - Smooth transitions with animations
 * - Auto-fullscreen trigger with keywords
 * - Compact input bar design
 * - Message rendering with ChatMessage component
 * - Chat history sidebar in fullscreen mode
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FloatingChatBar } from '@/components/chat/FloatingChatBar';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('FloatingChatBar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('Hello '),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('world!'),
            })
            .mockResolvedValueOnce({
              done: true,
            }),
        }),
      },
    });
  });

  describe('State Management - Three States', () => {
    test('renders in floating bar mode by default', () => {
      const { container } = render(<FloatingChatBar />);

      // Floating bar has specific positioning classes
      const floatingBar = container.querySelector('.fixed.bottom-8');
      expect(floatingBar).toBeInTheDocument();

      // Should NOT have sidebar or fullscreen classes
      expect(container.querySelector('.w-96')).not.toBeInTheDocument(); // Sidebar width
      expect(container.querySelector('.inset-0')).not.toBeInTheDocument(); // Fullscreen
    });

    test('transitions to sidebar mode when sidebar icon clicked', () => {
      const { container } = render(<FloatingChatBar />);

      // Find and click sidebar icon (vertical rectangle)
      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      expect(sidebarButton).toBeInTheDocument();
      fireEvent.click(sidebarButton!);

      // Should now show sidebar layout
      const sidebar = container.querySelector('.w-96.bg-white.border-l');
      expect(sidebar).toBeInTheDocument();
    });

    test('transitions to fullscreen mode when fullscreen icon clicked', () => {
      const { container } = render(<FloatingChatBar />);

      // Find and click fullscreen icon (square with rounded corners)
      const fullscreenButton = container.querySelector('button[aria-label="Fullscreen"]');
      expect(fullscreenButton).toBeInTheDocument();
      fireEvent.click(fullscreenButton!);

      // Should now show fullscreen layout
      const fullscreen = container.querySelector('.absolute.inset-0');
      expect(fullscreen).toBeInTheDocument();
    });

    test('transitions from sidebar back to floating bar', () => {
      const { container } = render(<FloatingChatBar />);

      // Go to sidebar
      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Click floating bar icon in sidebar
      const floatingBarButton = container.querySelector('button[aria-label="Floating bar"]');
      expect(floatingBarButton).toBeInTheDocument();
      fireEvent.click(floatingBarButton!);

      // Should be back to floating bar
      const floatingBar = container.querySelector('.fixed.bottom-8');
      expect(floatingBar).toBeInTheDocument();
    });

    test('transitions from fullscreen to sidebar', () => {
      const { container } = render(<FloatingChatBar />);

      // Go to fullscreen
      const fullscreenButton = container.querySelector('button[aria-label="Fullscreen"]');
      fireEvent.click(fullscreenButton!);

      // Click sidebar icon in fullscreen
      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Should now show sidebar
      const sidebar = container.querySelector('.w-96.bg-white.border-l');
      expect(sidebar).toBeInTheDocument();
    });

    test('transitions from fullscreen to floating bar', () => {
      const { container } = render(<FloatingChatBar />);

      // Go to fullscreen
      let fullscreenButton = container.querySelector('button[aria-label="Fullscreen"]');
      fireEvent.click(fullscreenButton!);

      // Click floating bar icon in fullscreen
      const floatingBarButton = container.querySelector('button[aria-label="Floating bar"]');
      fireEvent.click(floatingBarButton!);

      // Should be back to floating bar
      const floatingBar = container.querySelector('.fixed.bottom-8');
      expect(floatingBar).toBeInTheDocument();
    });
  });

  describe('Visual Icon Navigation', () => {
    test('floating bar shows sidebar and fullscreen icons', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarIcon = container.querySelector('button[aria-label="Sidebar view"]');
      const fullscreenIcon = container.querySelector('button[aria-label="Fullscreen"]');

      expect(sidebarIcon).toBeInTheDocument();
      expect(fullscreenIcon).toBeInTheDocument();
    });

    test('sidebar shows fullscreen and floating bar icons', () => {
      const { container } = render(<FloatingChatBar />);

      // Go to sidebar
      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const fullscreenIcon = container.querySelector('button[aria-label="Fullscreen"]');
      const floatingBarIcon = container.querySelector('button[aria-label="Floating bar"]');

      expect(fullscreenIcon).toBeInTheDocument();
      expect(floatingBarIcon).toBeInTheDocument();
    });

    test('fullscreen shows sidebar and floating bar icons', () => {
      const { container } = render(<FloatingChatBar />);

      // Go to fullscreen
      const fullscreenButton = container.querySelector('button[aria-label="Fullscreen"]');
      fireEvent.click(fullscreenButton!);

      const sidebarIcon = container.querySelector('button[aria-label="Sidebar view"]');
      const floatingBarIcon = container.querySelector('button[aria-label="Floating bar"]');

      expect(sidebarIcon).toBeInTheDocument();
      expect(floatingBarIcon).toBeInTheDocument();
    });

    test('icons have hover states', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      expect(sidebarButton).toHaveClass('hover:bg-gray-100');
    });

    test('icons have proper visual representations', () => {
      const { container } = render(<FloatingChatBar />);

      // Sidebar icon: vertical rectangle (w-2 h-4)
      const sidebarIcon = container.querySelector('.w-2.h-4.border-2');
      expect(sidebarIcon).toBeInTheDocument();

      // Fullscreen icon: square (w-3 h-3)
      const fullscreenIcon = container.querySelector('.w-3.h-3.border-2');
      expect(fullscreenIcon).toBeInTheDocument();
    });
  });

  describe('Animations and Transitions', () => {
    test('sidebar has slide-in animation', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const sidebar = container.querySelector('.animate-in.slide-in-from-right');
      expect(sidebar).toBeInTheDocument();
    });

    test('fullscreen has fade-in animation', () => {
      const { container } = render(<FloatingChatBar />);

      const fullscreenButton = container.querySelector('button[aria-label="Fullscreen"]');
      fireEvent.click(fullscreenButton!);

      const fullscreen = container.querySelector('.animate-in.fade-in');
      expect(fullscreen).toBeInTheDocument();
    });

    test('messages panel slides up from bottom', () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Hello' } });
      fireEvent.submit(textarea!.closest('form')!);

      // After message is sent, panel should appear with animation
      waitFor(() => {
        const messagesPanel = container.querySelector('.animate-in.slide-in-from-bottom');
        expect(messagesPanel).toBeInTheDocument();
      });
    });
  });

  describe('Message Rendering', () => {
    test('shows empty state when no messages', () => {
      render(<FloatingChatBar />);

      // Switch to sidebar to see messages area
      const sidebarButton = screen.getAllByRole('button')[0];
      fireEvent.click(sidebarButton);

      expect(screen.getByText('Start a conversation with your AI assistant')).toBeInTheDocument();
    });

    test('renders user message after submission', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Hello AI' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Hello AI')).toBeInTheDocument();
      });
    });

    test('renders assistant response from streaming API', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Hello' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(/Hello world!/)).toBeInTheDocument();
      });
    });

    test('shows loading animation while streaming', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Hello' } });
      fireEvent.submit(textarea!.closest('form')!);

      // Should show loading dots initially
      const loadingDots = container.querySelectorAll('.animate-bounce');
      expect(loadingDots.length).toBeGreaterThan(0);
    });

    test('messages appear in floating bar message panel', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test message' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        const messagePanel = container.querySelector('.max-h-\\[480px\\]');
        expect(messagePanel).toBeInTheDocument();
      });
    });
  });

  describe('Auto-Fullscreen Detection', () => {
    test('triggers fullscreen for "write a post"', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'write a post about AI' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        const fullscreen = container.querySelector('.absolute.inset-0');
        expect(fullscreen).toBeInTheDocument();
      });
    });

    test('triggers fullscreen for "write a linkedin post"', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'write a linkedin post' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        const fullscreen = container.querySelector('.absolute.inset-0');
        expect(fullscreen).toBeInTheDocument();
      });
    });

    test('triggers fullscreen for "draft"', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'draft an article' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        const fullscreen = container.querySelector('.absolute.inset-0');
        expect(fullscreen).toBeInTheDocument();
      });
    });

    test('does NOT trigger fullscreen for regular messages', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Hello, how are you?' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        // Should still be in floating bar mode
        const floatingBar = container.querySelector('.fixed.bottom-8');
        expect(floatingBar).toBeInTheDocument();
      });
    });

    test('keyword detection is case-insensitive', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'WRITE A POST' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        const fullscreen = container.querySelector('.absolute.inset-0');
        expect(fullscreen).toBeInTheDocument();
      });
    });
  });

  describe('Input Bar Behavior', () => {
    test('textarea has correct placeholder in floating bar', () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      expect(textarea).toHaveAttribute('placeholder', 'Revvy wants to help! Type...');
    });

    test('placeholder disappears after first message', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Hello' } });
      fireEvent.submit(textarea.closest('form')!);

      await waitFor(() => {
        expect(textarea.placeholder).toBe('');
      });
    });

    test('textarea auto-resizes with content', () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      const longText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';

      fireEvent.change(textarea, { target: { value: longText } });

      // Height should increase but be capped at 120px
      const height = parseInt(textarea.style.height);
      expect(height).toBeGreaterThan(0);
      expect(height).toBeLessThanOrEqual(120);
    });

    test('submit button is disabled when input is empty', () => {
      const { container } = render(<FloatingChatBar />);

      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton).toBeDisabled();
    });

    test('submit button is enabled when input has text', () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Hello' } });

      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton).not.toBeDisabled();
    });

    test('Enter key submits message', () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test' } });
      fireEvent.keyDown(textarea!, { key: 'Enter', shiftKey: false });

      waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/hgc', expect.any(Object));
      });
    });

    test('Shift+Enter creates new line without submitting', () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Line 1' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      // Should NOT call API
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('input clears after successful submission', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Hello' } });
      fireEvent.submit(textarea.closest('form')!);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    test('loading state shows bouncing dots in input area', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test' } });
      fireEvent.submit(textarea!.closest('form')!);

      // Should show loading animation
      const loadingDots = container.querySelectorAll('.animate-bounce');
      expect(loadingDots.length).toBeGreaterThan(0);
    });

    test('input height is compact (38px)', () => {
      const { container } = render(<FloatingChatBar />);

      // Check for h-[38px] class in loading state
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test' } });
      fireEvent.submit(textarea!.closest('form')!);

      const loadingContainer = container.querySelector('.h-\\[38px\\]');
      expect(loadingContainer).toBeInTheDocument();
    });
  });

  describe('Chat History Sidebar (Fullscreen)', () => {
    test('shows chat history sidebar in fullscreen by default', () => {
      const { container } = render(<FloatingChatBar />);

      const fullscreenButton = container.querySelector('button[aria-label="Fullscreen"]');
      fireEvent.click(fullscreenButton!);

      const historyHeader = screen.getByText('Chat History');
      expect(historyHeader).toBeInTheDocument();
    });

    test('chat history sidebar has correct width (w-80)', () => {
      const { container } = render(<FloatingChatBar />);

      const fullscreenButton = container.querySelector('button[aria-label="Fullscreen"]');
      fireEvent.click(fullscreenButton!);

      const historySidebar = container.querySelector('.w-80.border-r');
      expect(historySidebar).toBeInTheDocument();
    });

    test('shows "New Conversation" button in history sidebar', () => {
      const { container } = render(<FloatingChatBar />);

      const fullscreenButton = container.querySelector('button[aria-label="Fullscreen"]');
      fireEvent.click(fullscreenButton!);

      expect(screen.getByText('+ New Conversation')).toBeInTheDocument();
    });

    test('shows placeholder conversations', () => {
      const { container } = render(<FloatingChatBar />);

      const fullscreenButton = container.querySelector('button[aria-label="Fullscreen"]');
      fireEvent.click(fullscreenButton!);

      expect(screen.getByText('Current conversation')).toBeInTheDocument();
      expect(screen.getByText('LinkedIn campaign help')).toBeInTheDocument();
      expect(screen.getByText('Pod engagement analysis')).toBeInTheDocument();
    });

    test('can toggle chat history sidebar with menu button', () => {
      const { container } = render(<FloatingChatBar />);

      const fullscreenButton = container.querySelector('button[aria-label="Fullscreen"]');
      fireEvent.click(fullscreenButton!);

      const menuButton = container.querySelector('button[aria-label="Toggle chat history"]');
      expect(menuButton).toBeInTheDocument();
      fireEvent.click(menuButton!);

      // History sidebar should be hidden
      const historyHeader = screen.queryByText('Chat History');
      expect(historyHeader).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('shows error message when API call fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
      });
    });

    test('shows authentication error for 401 status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Please log in to use the chat')).toBeInTheDocument();
      });
    });

    test('can clear error message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Error',
      });

      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        const clearButton = screen.getByText('Clear');
        fireEvent.click(clearButton);
      });

      expect(screen.queryByText(/HTTP 500/)).not.toBeInTheDocument();
    });

    test('removes empty assistant message on error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Error',
      });

      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        // Should only show user message, not empty assistant message
        expect(screen.getByText('Test')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('all icon buttons have aria-labels', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      const fullscreenButton = container.querySelector('button[aria-label="Fullscreen"]');
      const submitButton = container.querySelector('button[aria-label="Send message"]');

      expect(sidebarButton).toBeInTheDocument();
      expect(fullscreenButton).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });

    test('all icon buttons have title tooltips', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[title="Switch to sidebar"]');
      const fullscreenButton = container.querySelector('button[title="Switch to fullscreen"]');

      expect(sidebarButton).toBeInTheDocument();
      expect(fullscreenButton).toBeInTheDocument();
    });

    test('textarea is properly labeled', () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      expect(textarea).toHaveAttribute('placeholder');
    });

    test('submit button is properly labeled', () => {
      const { container } = render(<FloatingChatBar />);

      const submitButton = container.querySelector('button[aria-label="Send message"]');
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Console Logging (Debug)', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    test('logs state transitions for debugging', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('SIDEBAR BUTTON')
      );
    });

    test('logs auto-fullscreen triggers', async () => {
      const { container } = render(<FloatingChatBar />);

      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'write a post' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[AUTO-FULLSCREEN]'),
          expect.any(String)
        );
      });
    });
  });
});
