import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FloatingChatBar } from '@/components/chat/FloatingChatBar';

// Mock fetch
global.fetch = jest.fn();

describe('FloatingChatBar Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Auto-Fullscreen Functionality', () => {
    it('should trigger fullscreen when assistant message > 500 chars (JSON response)', async () => {
      const longContent = 'a'.repeat(501);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: longContent }),
      });

      render(<FloatingChatBar />);

      // Type and send message
      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      // Wait for response and auto-fullscreen
      await waitFor(() => {
        // Check if document viewer is rendered (fullscreen mode)
        expect(screen.getByText('Working Document')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should NOT trigger fullscreen when message ≤ 500 chars', async () => {
      const shortContent = 'a'.repeat(500);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: shortContent }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        // Should show message but NOT fullscreen
        expect(screen.queryByText('Working Document')).not.toBeInTheDocument();
      });
    });

    it('should trigger fullscreen for streaming responses > 500 chars', async () => {
      const longContent = 'a'.repeat(501);

      // Mock streaming response
      const chunks = [longContent.slice(0, 250), longContent.slice(250)];
      const stream = new ReadableStream({
        start(controller) {
          chunks.forEach(chunk => {
            controller.enqueue(new TextEncoder().encode(chunk));
          });
          controller.close();
        },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/plain' }),
        body: stream,
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText('Working Document')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Document Title Extraction', () => {
    it('should extract title from h1 markdown syntax', async () => {
      const content = '# My Document Title\n\nBody content here';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: content }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Write a post' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        // Title should be extracted and displayed
        expect(screen.getByText('My Document Title')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should use default title if no h1 found', async () => {
      const content = 'a'.repeat(501); // Long content, no heading

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: content }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText('Working Document')).toBeInTheDocument();
      });
    });

    it('should extract title with special characters', async () => {
      const content = '# Document: "Special" & <Title>\n\n' + 'a'.repeat(500);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: content }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Write' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText('Document: "Special" & <Title>')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Intro Text Stripping', () => {
    it('should strip "Here\'s a..." intro text', async () => {
      const intro = "Here's a great LinkedIn post for you:\n\n";
      const actualContent = '# Post Title\n\n' + 'a'.repeat(500);
      const fullResponse = intro + actualContent;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: fullResponse }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Write a post' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        // Intro should be stripped in document content
        const documentContent = screen.getByText('Post Title');
        expect(documentContent).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should strip "Sure, here\'s..." intro text', async () => {
      const intro = "Sure, here's what you asked for:\n\n";
      const actualContent = '# Document\n\n' + 'a'.repeat(500);
      const fullResponse = intro + actualContent;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: fullResponse }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Create content' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText('Document')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should strip "I\'ve created..." intro text', async () => {
      const intro = "I've created a document for you:\n\n";
      const actualContent = '# My Doc\n\n' + 'a'.repeat(500);
      const fullResponse = intro + actualContent;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: fullResponse }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Make something' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText('My Doc')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Message Panel Auto-Open', () => {
    it('should auto-open message panel when exiting fullscreen', async () => {
      const longContent = '# Test\n\n' + 'a'.repeat(500);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: longContent }),
      });

      render(<FloatingChatBar />);

      // Send message to trigger fullscreen
      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Exit fullscreen
      const closeButton = screen.getByRole('button', { name: /close fullscreen/i });
      fireEvent.click(closeButton);

      // Message panel should be visible (not hidden)
      await waitFor(() => {
        // Check if messages are visible in floating mode
        expect(screen.getByPlaceholderText(/Revvy wants to help/i)).toBeInTheDocument();
      });
    });
  });

  describe('Two-Panel Fullscreen Layout', () => {
    it('should display chat panel and document panel in fullscreen', async () => {
      const longContent = '# Document\n\nBody content' + 'a'.repeat(500);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: longContent }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Create doc' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        // Both panels should exist
        expect(screen.getByText('Document')).toBeInTheDocument();
        expect(screen.getByText('Create doc')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should render document content with ReactMarkdown', async () => {
      const markdownContent = '# Heading\n\n**Bold** text\n\n- List item' + 'a'.repeat(500);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: markdownContent }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Write' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        // Check for markdown rendering
        expect(screen.getByText('Heading')).toBeInTheDocument();
        expect(screen.getByText('Bold')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Styling and Layout', () => {
    it('should render headings with correct sizes (h1: text-6xl)', async () => {
      const content = '# Large Heading\n\n' + 'a'.repeat(500);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: content }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Write' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        const heading = screen.getAllByText('Large Heading')[0]; // Get first instance
        expect(heading).toHaveClass('text-6xl');
      }, { timeout: 3000 });
    });

    it('should render h2 with text-5xl class', async () => {
      const content = '# Title\n\n## Subtitle\n\n' + 'a'.repeat(500);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: content }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Write' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        const subtitle = screen.getByText('Subtitle');
        expect(subtitle).toHaveClass('text-5xl');
      }, { timeout: 3000 });
    });

    it('should render h3 with text-4xl class', async () => {
      const content = '# Title\n\n### Section\n\n' + 'a'.repeat(500);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: content }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Write' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        const section = screen.getByText('Section');
        expect(section).toHaveClass('text-4xl');
      }, { timeout: 3000 });
    });

    it('should NOT render horizontal rules', async () => {
      const content = '# Title\n\n---\n\nContent after rule' + 'a'.repeat(500);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: content }),
      });

      const { container } = render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Write' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        const hr = container.querySelector('hr');
        expect(hr).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('State Management', () => {
    it('should transition isFullscreen state correctly', async () => {
      const longContent = '# Doc\n\n' + 'a'.repeat(500);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: longContent }),
      });

      render(<FloatingChatBar />);

      // Start in floating mode
      expect(screen.getByPlaceholderText(/Revvy wants to help/i)).toBeInTheDocument();

      // Send message
      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      // Should enter fullscreen
      await waitFor(() => {
        expect(screen.getByText('Doc')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Exit fullscreen
      const closeButton = screen.getByRole('button', { name: /close fullscreen/i });
      fireEvent.click(closeButton);

      // Should return to floating
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Revvy wants to help/i)).toBeInTheDocument();
      });
    });

    it('should update documentContent state with new messages', async () => {
      const firstContent = '# First\n\n' + 'a'.repeat(500);
      const secondContent = '# Second\n\n' + 'b'.repeat(500);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true, response: firstContent }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true, response: secondContent }),
        });

      render(<FloatingChatBar />);

      // First message
      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'First' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText('First')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Exit fullscreen
      const closeButton = screen.getByRole('button', { name: /close fullscreen/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Revvy wants to help/i)).toBeInTheDocument();
      });

      // Second message
      const textareaAgain = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textareaAgain, { target: { value: 'Second' } });
      fireEvent.keyDown(textareaAgain, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText('Second')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('handleMessageExpand Function', () => {
    it('should find last long message and enter fullscreen when expand clicked', async () => {
      const longContent = 'a'.repeat(501);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: longContent }),
      });

      render(<FloatingChatBar />);

      // Send long message but prevent auto-fullscreen by staying in floating
      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        // Message received, look for expand button
        const expandButtons = screen.getAllByRole('button', { name: /expand document/i });
        expect(expandButtons.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      // Click expand button
      const expandButton = screen.getAllByRole('button', { name: /expand document/i })[0];
      fireEvent.click(expandButton);

      // Should enter fullscreen
      await waitFor(() => {
        expect(screen.getByText('Working Document')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message submission', () => {
      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);

      // Try to send empty message
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      // Should not call fetch
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API error gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText(/API Error/i)).toBeInTheDocument();
      });
    });

    it('should handle 401 unauthorized error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText(/Please log in to use the chat/i)).toBeInTheDocument();
      });
    });

    it('should handle messages with only whitespace', () => {
      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: '   \n\n   ' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      // Should not call fetch
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle Shift+Enter for new line', () => {
      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'First line' } });

      // Shift+Enter should NOT submit
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should complete full workflow: ask -> AI writes -> auto-fullscreen -> expand button -> close', async () => {
      const longContent = '# LinkedIn Post\n\nGreat content here!' + 'a'.repeat(500);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: longContent }),
      });

      render(<FloatingChatBar />);

      // 1. User asks for post
      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Write a LinkedIn post' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      // 2. AI writes > 500 chars
      await waitFor(() => {
        expect(screen.getByText('LinkedIn Post')).toBeInTheDocument();
      }, { timeout: 3000 });

      // 3. Auto-fullscreen triggered
      expect(screen.getByText('LinkedIn Post')).toBeInTheDocument();

      // 4. User can see expand button in chat (if we exit fullscreen)
      const closeButton = screen.getByRole('button', { name: /close fullscreen/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        const expandButtons = screen.queryAllByRole('button', { name: /expand document/i });
        expect(expandButtons.length).toBeGreaterThan(0);
      });

      // 5. Message panel auto-opens
      expect(screen.getByPlaceholderText(/Revvy wants to help/i)).toBeInTheDocument();
    });

    it('should show clean message in chat without intro text', async () => {
      const intro = "Here's a great post:\n\n";
      const content = '# Post\n\nContent';
      const fullResponse = intro + content;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: fullResponse }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Write' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        // Intro text should be stripped
        expect(screen.queryByText(/Here's a great post/i)).not.toBeInTheDocument();
        expect(screen.getByText('Post')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display formatted content in document viewer without raw markdown', async () => {
      const markdownContent = '# Title\n\n**Bold text**\n\n- Item 1\n- Item 2' + 'a'.repeat(500);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: markdownContent }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Write' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        // Should see formatted content, NOT raw markdown syntax
        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Bold text')).toBeInTheDocument();

        // Should NOT see raw markdown symbols
        expect(screen.queryByText('# Title')).not.toBeInTheDocument();
        expect(screen.queryByText('**Bold text**')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Conversation Management', () => {
    it('should create new conversation when sending first message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: 'Hello!' }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Hi' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText('Hi')).toBeInTheDocument();
      });
    });

    it('should persist conversations to localStorage', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: 'Response' }),
      });

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        const stored = localStorage.getItem('chat_conversations');
        expect(stored).not.toBeNull();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading animation while waiting for response', async () => {
      // Delay the response
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => {
            resolve({
              ok: true,
              headers: new Headers({ 'content-type': 'application/json' }),
              json: async () => ({ success: true, response: 'Done' }),
            });
          }, 100)
        )
      );

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      // Should show loading animation
      await waitFor(() => {
        const loadingDots = document.querySelectorAll('.animate-bounce');
        expect(loadingDots.length).toBeGreaterThan(0);
      });
    });

    it('should disable submit button while loading', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => {
            resolve({
              ok: true,
              headers: new Headers({ 'content-type': 'application/json' }),
              json: async () => ({ success: true, response: 'Done' }),
            });
          }, 100)
        )
      );

      render(<FloatingChatBar />);

      const textarea = screen.getByPlaceholderText(/Revvy wants to help/i);
      fireEvent.change(textarea, { target: { value: 'Test' } });

      const sendButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(sendButton);

      // Button should be disabled during loading
      await waitFor(() => {
        expect(sendButton).toBeDisabled();
      });
    });
  });
});
