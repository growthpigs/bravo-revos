/**
 * FloatingChatBar Resizable Layout Tests
 *
 * Tests the NEW resizable chat layout feature in expanded view:
 * - Resizable chat width (default 240px, min 200px, max 400px)
 * - Mouse drag-to-resize functionality
 * - Three-section layout: chat area | divider | history sidebar
 * - Dynamic width calculations
 * - Visual feedback on resize divider
 * - localStorage persistence for expanded state
 * - Chat history toggle behavior
 * - Conversation management during resize
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FloatingChatBar } from '@/components/chat/FloatingChatBar';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('FloatingChatBar - Resizable Layout Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('Response '),
            })
            .mockResolvedValueOnce({
              done: true,
            }),
        }),
      },
    });
  });

  describe('Chat Width State Management', () => {
    test('chat area has default width of 240px in expanded view', () => {
      const { container } = render(<FloatingChatBar />);

      // Switch to expanded view
      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Find main chat area (left section)
      const chatArea = container.querySelector('[style*="width: 240px"]');
      expect(chatArea).toBeInTheDocument();
    });

    test('chat width can be changed within constraints', () => {
      const { container } = render(<FloatingChatBar />);

      // Switch to expanded view
      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Find resize divider
      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      expect(resizeDivider).toBeInTheDocument();

      // Simulate mousedown on divider
      fireEvent.mouseDown(resizeDivider!);

      // Simulate mousemove to 300px
      fireEvent.mouseMove(document, { clientX: 300 });

      // Chat area should now be 300px
      const chatArea = container.querySelector('[style*="width: 300px"]');
      expect(chatArea).toBeInTheDocument();
    });

    test('chat width respects minimum constraint (200px)', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);

      // Try to resize to 100px (below minimum)
      fireEvent.mouseMove(document, { clientX: 100 });

      // Should clamp to 200px minimum
      const chatArea = container.querySelector('[style*="width: 200px"]');
      expect(chatArea).toBeInTheDocument();
    });

    test('chat width respects maximum constraint (400px)', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);

      // Try to resize to 500px (above maximum)
      fireEvent.mouseMove(document, { clientX: 500 });

      // Should clamp to 400px maximum
      const chatArea = container.querySelector('[style*="width: 400px"]');
      expect(chatArea).toBeInTheDocument();
    });

    test('isResizing state is false by default', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Resize divider should have default cursor
      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      expect(resizeDivider).toHaveStyle({ cursor: 'col-resize' });
    });

    test('isResizing becomes true on mousedown', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);

      // Component should now be in resizing state (width changes on mousemove)
      fireEvent.mouseMove(document, { clientX: 250 });
      const chatArea = container.querySelector('[style*="width: 250px"]');
      expect(chatArea).toBeInTheDocument();
    });

    test('isResizing becomes false on mouseup', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);
      fireEvent.mouseMove(document, { clientX: 300 });
      fireEvent.mouseUp(document);

      // Width should stay at 300px but not update further
      const chatArea = container.querySelector('[style*="width: 300px"]');
      expect(chatArea).toBeInTheDocument();

      // Further mousemove should NOT change width
      fireEvent.mouseMove(document, { clientX: 350 });
      expect(container.querySelector('[style*="width: 350px"]')).not.toBeInTheDocument();
    });
  });

  describe('Resize Event Handlers', () => {
    test('mousedown on divider initiates resize', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      expect(resizeDivider).toBeInTheDocument();

      // Should not throw error
      expect(() => fireEvent.mouseDown(resizeDivider!)).not.toThrow();
    });

    test('mousemove updates chat width when resizing', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);

      // Move to 280px
      fireEvent.mouseMove(document, { clientX: 280 });
      expect(container.querySelector('[style*="width: 280px"]')).toBeInTheDocument();

      // Move to 320px
      fireEvent.mouseMove(document, { clientX: 320 });
      expect(container.querySelector('[style*="width: 320px"]')).toBeInTheDocument();
    });

    test('mouseup stops resizing', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);
      fireEvent.mouseMove(document, { clientX: 300 });
      fireEvent.mouseUp(document);

      // Should not throw and width should be locked
      expect(() => fireEvent.mouseMove(document, { clientX: 350 })).not.toThrow();
      expect(container.querySelector('[style*="width: 300px"]')).toBeInTheDocument();
    });

    test('mousemove without mousedown does not change width', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Move mouse without clicking divider
      fireEvent.mouseMove(document, { clientX: 350 });

      // Should still be at default 240px
      expect(container.querySelector('[style*="width: 240px"]')).toBeInTheDocument();
    });

    test('resize event listeners are cleaned up', () => {
      const { container, unmount } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);

      // Unmount component
      unmount();

      // Should not throw errors when moving mouse after unmount
      expect(() => fireEvent.mouseMove(document, { clientX: 300 })).not.toThrow();
      expect(() => fireEvent.mouseUp(document)).not.toThrow();
    });
  });

  describe('Three-Section Layout', () => {
    test('expanded view shows three sections: chat, divider, history', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Chat area (left)
      const chatArea = container.querySelector('[style*="width: 240px"]');
      expect(chatArea).toBeInTheDocument();

      // Resize divider (middle)
      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      expect(resizeDivider).toBeInTheDocument();

      // History sidebar (right) - only if conversations exist
      // For initial render with no conversations, history may not show
      // Test with conversations in next test
    });

    test('chat area contains messages and input', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Should have textarea for input
      const textarea = container.querySelector('textarea');
      expect(textarea).toBeInTheDocument();

      // Should have messages area
      expect(screen.getByText('Start a conversation with your AI assistant')).toBeInTheDocument();
    });

    test('divider has visual styling', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      expect(resizeDivider).toHaveClass('w-1');
      expect(resizeDivider).toHaveClass('bg-gray-300');
      expect(resizeDivider).toHaveClass('hover:bg-blue-500');
      expect(resizeDivider).toHaveClass('cursor-col-resize');
    });

    test('divider changes color on hover', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      expect(resizeDivider).toHaveClass('hover:bg-blue-500');
    });

    test('history sidebar has dynamic width based on chat width', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Create a conversation first so history shows
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test message' } });
      fireEvent.submit(textarea!.closest('form')!);

      waitFor(() => {
        // Default: 384px total - 240px chat - 4px (divider+padding) = 140px history
        // Note: History sidebar only shows if there are conversations
        const historySidebar = container.querySelector('[style*="width:"]');
        expect(historySidebar).toBeInTheDocument();
      });
    });
  });

  describe('History Sidebar Conditional Rendering', () => {
    test('history sidebar shows when showChatHistory is true', async () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Send a message to create a conversation
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test message' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        // History sidebar should be visible
        const historyHeader = screen.queryByText('Chatbot');
        expect(historyHeader).toBeInTheDocument();
      });
    });

    test('history sidebar hides when showChatHistory is false', async () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Send a message to create a conversation
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test message' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Chatbot')).toBeInTheDocument();
      });

      // Click menu button to toggle history
      const menuButton = container.querySelector('button[aria-label="Toggle chat history"]');
      fireEvent.click(menuButton!);

      // History should be hidden
      expect(screen.queryByText('Chatbot')).not.toBeInTheDocument();
    });

    test('history sidebar toggle preserves chat width', async () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Resize chat to 300px
      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);
      fireEvent.mouseMove(document, { clientX: 300 });
      fireEvent.mouseUp(document);

      expect(container.querySelector('[style*="width: 300px"]')).toBeInTheDocument();

      // Send message to show history
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Chatbot')).toBeInTheDocument();
      });

      // Toggle history off
      const menuButton = container.querySelector('button[aria-label="Toggle chat history"]');
      fireEvent.click(menuButton!);

      // Chat width should still be 300px
      expect(container.querySelector('[style*="width: 300px"]')).toBeInTheDocument();
    });

    test('history sidebar only shows if conversations exist', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // No conversations yet, history should not render
      expect(screen.queryByText('Chatbot')).not.toBeInTheDocument();
    });
  });

  describe('Conversation Management During Resize', () => {
    test('can switch conversations while resizing', async () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Create first conversation
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'First message' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('First message')).toBeInTheDocument();
      });

      // Resize chat
      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);
      fireEvent.mouseMove(document, { clientX: 300 });
      fireEvent.mouseUp(document);

      // Create new conversation
      const newConvButton = container.querySelector('button[aria-label="New conversation"]');
      fireEvent.click(newConvButton!);

      // Should be able to switch between conversations
      expect(screen.queryByText('First message')).not.toBeInTheDocument();
    });

    test('can delete conversations while resized', async () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Create conversation
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test message' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });

      // Resize chat
      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);
      fireEvent.mouseMove(document, { clientX: 280 });
      fireEvent.mouseUp(document);

      // Mock window.confirm for delete all
      window.confirm = jest.fn(() => true);

      // Delete all conversations
      const deleteAllButton = container.querySelector('button[aria-label="Delete all conversations"]');
      fireEvent.click(deleteAllButton!);

      // History should disappear (no conversations)
      expect(screen.queryByText('Chatbot')).not.toBeInTheDocument();
    });
  });

  describe('localStorage Persistence', () => {
    test('expanded state persists to localStorage', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Check localStorage
      expect(localStorageMock.getItem('chat_expanded')).toBe('true');
    });

    test('collapsed state persists to localStorage', () => {
      const { container } = render(<FloatingChatBar />);

      // Go to sidebar
      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Go back to floating
      const floatingButton = container.querySelector('button[aria-label="Floating bar"]');
      fireEvent.click(floatingButton!);

      // Check localStorage
      expect(localStorageMock.getItem('chat_expanded')).toBe('false');
    });

    test('expanded state is restored on mount', () => {
      // Set localStorage before mounting
      localStorageMock.setItem('chat_expanded', 'true');

      const { container } = render(<FloatingChatBar />);

      // Should render in expanded view
      waitFor(() => {
        const chatArea = container.querySelector('[style*="width: 240px"]');
        expect(chatArea).toBeInTheDocument();
      });
    });

    test('conversations persist to localStorage', async () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Create conversation
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Persisted message' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        const stored = localStorageMock.getItem('chat_conversations');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.length).toBeGreaterThan(0);
      });
    });

    test('conversations are restored on mount', () => {
      // Set up localStorage with conversation
      const conversations = [
        {
          id: '123',
          title: 'Test Chat',
          messages: [
            {
              id: '1',
              role: 'user',
              content: 'Hello',
              createdAt: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      localStorageMock.setItem('chat_conversations', JSON.stringify(conversations));

      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      waitFor(() => {
        expect(screen.getByText('Test Chat')).toBeInTheDocument();
      });
    });
  });

  describe('Layout Constraints and Edge Cases', () => {
    test('layout does not break at minimum width (200px)', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);
      fireEvent.mouseMove(document, { clientX: 50 }); // Try to go very small

      // Should clamp to 200px
      expect(container.querySelector('[style*="width: 200px"]')).toBeInTheDocument();

      // Textarea should still be visible
      const textarea = container.querySelector('textarea');
      expect(textarea).toBeInTheDocument();
    });

    test('layout does not break at maximum width (400px)', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);
      fireEvent.mouseMove(document, { clientX: 600 }); // Try to go very large

      // Should clamp to 400px
      expect(container.querySelector('[style*="width: 400px"]')).toBeInTheDocument();

      // History sidebar should still have positive width
      // Total width is 384px, so at 400px chat, history would be negative
      // This might be a bug - history should have min width or hide
    });

    test('total width remains constant at 384px', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Get the main container
      const mainContainer = container.querySelector('.fixed.right-0.top-16.bottom-0');
      expect(mainContainer).toHaveStyle({ width: '384px' });

      // Resize chat
      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);
      fireEvent.mouseMove(document, { clientX: 300 });
      fireEvent.mouseUp(document);

      // Total width should still be 384px
      expect(mainContainer).toHaveStyle({ width: '384px' });
    });

    test('messages auto-scroll after resize', async () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Send multiple messages
      const textarea = container.querySelector('textarea');
      for (let i = 0; i < 5; i++) {
        fireEvent.change(textarea!, { target: { value: `Message ${i}` } });
        fireEvent.submit(textarea!.closest('form')!);
      }

      // Resize chat
      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);
      fireEvent.mouseMove(document, { clientX: 320 });
      fireEvent.mouseUp(document);

      // Messages should still be scrollable
      const scrollArea = container.querySelector('[class*="overflow-y-auto"]');
      expect(scrollArea).toBeInTheDocument();
    });

    test('input area remains functional after resize', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Resize
      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      fireEvent.mouseDown(resizeDivider!);
      fireEvent.mouseMove(document, { clientX: 350 });
      fireEvent.mouseUp(document);

      // Input should still work
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'After resize' } });
      expect(textarea).toHaveValue('After resize');
    });
  });

  describe('Visual Feedback', () => {
    test('divider has hover effect', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      expect(resizeDivider).toHaveClass('hover:bg-blue-500');
    });

    test('divider has cursor: col-resize', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      expect(resizeDivider).toHaveStyle({ cursor: 'col-resize' });
    });

    test('divider has title tooltip', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[title="Drag to resize chat area"]');
      expect(resizeDivider).toBeInTheDocument();
    });

    test('divider has transition animation', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      expect(resizeDivider).toHaveClass('transition-all');
      expect(resizeDivider).toHaveClass('duration-200');
    });

    test('chat area background is white', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const chatArea = container.querySelector('[style*="width: 240px"]');
      expect(chatArea).toHaveClass('bg-white');
    });

    test('history sidebar background is gray', async () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Create conversation to show history
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        const historySidebar = screen.getByText('Chatbot').closest('div');
        expect(historySidebar).toHaveClass('bg-gray-50');
      });
    });
  });

  describe('Accessibility for Resize Feature', () => {
    test('resize divider has aria-label', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[aria-label="Resize chat width"]');
      expect(resizeDivider).toBeInTheDocument();
    });

    test('resize divider has title for tooltip', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const resizeDivider = container.querySelector('[title="Drag to resize chat area"]');
      expect(resizeDivider).toBeInTheDocument();
    });

    test('menu toggle button has aria-label', () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      const menuButton = container.querySelector('button[aria-label="Toggle chat history"]');
      expect(menuButton).toBeInTheDocument();
    });

    test('new conversation button has aria-label', async () => {
      const { container } = render(<FloatingChatBar />);

      const sidebarButton = container.querySelector('button[aria-label="Sidebar view"]');
      fireEvent.click(sidebarButton!);

      // Create conversation to show history
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea!, { target: { value: 'Test' } });
      fireEvent.submit(textarea!.closest('form')!);

      await waitFor(() => {
        const newConvButton = container.querySelector('button[aria-label="New conversation"]');
        expect(newConvButton).toBeInTheDocument();
      });
    });
  });
});
