/**
 * ChatMessage Component Tests
 *
 * Tests the ChatMessage component's rendering, markdown formatting,
 * text contrast, loading states, and responsive behavior.
 *
 * Component Features:
 * - ReactMarkdown integration for formatted messages
 * - Proper text contrast with inherit colors (white on dark for user, dark on light for AI)
 * - Loading animation with three bouncing dots
 * - Support for bold, lists, links, paragraphs
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatMessage } from '@/components/chat/ChatMessage';
import type { UIMessage } from 'ai';

describe('ChatMessage Component', () => {
  describe('Basic Rendering', () => {
    test('renders user message with correct styling', () => {
      const message: UIMessage = {
        id: 'msg-1',
        role: 'user',
        parts: [{ type: 'text', text: 'Hello, AI!' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector('.bg-gray-900.text-white');
      expect(messageDiv).toBeInTheDocument();
      expect(messageDiv).toHaveTextContent('Hello, AI!');
    });

    test('renders assistant message with correct styling', () => {
      const message: UIMessage = {
        id: 'msg-2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Hello, human!' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector('.bg-gray-100.text-gray-900');
      expect(messageDiv).toBeInTheDocument();
      expect(messageDiv).toHaveTextContent('Hello, human!');
    });

    test('user messages align to the right', () => {
      const message: UIMessage = {
        id: 'msg-1',
        role: 'user',
        parts: [{ type: 'text', text: 'Test' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const wrapper = container.querySelector('.justify-end');
      expect(wrapper).toBeInTheDocument();
    });

    test('assistant messages align to the left', () => {
      const message: UIMessage = {
        id: 'msg-2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Test' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const wrapper = container.querySelector('.justify-start');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('shows loading animation when isLoading is true and no content', () => {
      const message: UIMessage = {
        id: 'msg-loading',
        role: 'assistant',
        parts: [{ type: 'text', text: '' }],
      };

      const { container } = render(<ChatMessage message={message} isLoading={true} />);

      // Check for three bouncing dots
      const bouncingDots = container.querySelectorAll('.animate-bounce');
      expect(bouncingDots.length).toBe(3);
    });

    test('shows content when loading and text exists (streaming)', () => {
      const message: UIMessage = {
        id: 'msg-streaming',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Partial response...' }],
      };

      const { container } = render(<ChatMessage message={message} isLoading={true} />);

      // Should show text content, not loading animation
      expect(screen.getByText('Partial response...')).toBeInTheDocument();
      const bouncingDots = container.querySelectorAll('.animate-bounce');
      expect(bouncingDots.length).toBe(0);
    });

    test('shows content when not loading', () => {
      const message: UIMessage = {
        id: 'msg-complete',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Complete response' }],
      };

      const { container } = render(<ChatMessage message={message} isLoading={false} />);

      expect(screen.getByText('Complete response')).toBeInTheDocument();
      const bouncingDots = container.querySelectorAll('.animate-bounce');
      expect(bouncingDots.length).toBe(0);
    });
  });

  describe('Text Contrast and Color Inheritance', () => {
    test('user message has white text on dark background', () => {
      const message: UIMessage = {
        id: 'msg-user',
        role: 'user',
        parts: [{ type: 'text', text: '**Bold text**' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector('.bg-gray-900.text-white');
      expect(messageDiv).toBeInTheDocument();

      // Check that bold text inherits color
      const boldText = container.querySelector('strong.text-inherit');
      expect(boldText).toBeInTheDocument();
    });

    test('assistant message has dark text on light background', () => {
      const message: UIMessage = {
        id: 'msg-assistant',
        role: 'assistant',
        parts: [{ type: 'text', text: '**Bold text**' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector('.bg-gray-100.text-gray-900');
      expect(messageDiv).toBeInTheDocument();

      // Check that bold text inherits color
      const boldText = container.querySelector('strong.text-inherit');
      expect(boldText).toBeInTheDocument();
    });

    test('all markdown elements inherit parent text color', () => {
      const message: UIMessage = {
        id: 'msg-markdown',
        role: 'user',
        parts: [
          {
            type: 'text',
            text: '**Bold** text with [link](https://example.com) and list:\n- Item 1\n- Item 2',
          },
        ],
      };

      const { container } = render(<ChatMessage message={message} />);

      // Bold inherits color
      const bold = container.querySelector('strong');
      expect(bold).toHaveClass('text-inherit');

      // List inherits color
      const list = container.querySelector('ul');
      expect(list).toHaveClass('text-inherit');

      // Link inherits color
      const link = container.querySelector('a');
      expect(link).toHaveClass('text-inherit');
    });
  });

  describe('Markdown Rendering', () => {
    test('renders bold text correctly', () => {
      const message: UIMessage = {
        id: 'msg-bold',
        role: 'assistant',
        parts: [{ type: 'text', text: 'This is **bold text**' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const bold = container.querySelector('strong');
      expect(bold).toBeInTheDocument();
      expect(bold).toHaveTextContent('bold text');
      expect(bold).toHaveClass('font-bold', 'text-inherit');
    });

    test('renders unordered lists correctly', () => {
      const message: UIMessage = {
        id: 'msg-list',
        role: 'assistant',
        parts: [{ type: 'text', text: '- Item 1\n- Item 2\n- Item 3' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();
      expect(list).toHaveClass('list-disc', 'ml-4', 'my-2', 'space-y-1', 'text-inherit');

      const items = container.querySelectorAll('li');
      expect(items.length).toBe(3);
      expect(items[0]).toHaveTextContent('Item 1');
      expect(items[1]).toHaveTextContent('Item 2');
      expect(items[2]).toHaveTextContent('Item 3');
    });

    test('renders ordered lists correctly', () => {
      const message: UIMessage = {
        id: 'msg-ordered',
        role: 'assistant',
        parts: [{ type: 'text', text: '1. First\n2. Second\n3. Third' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const list = container.querySelector('ol');
      expect(list).toBeInTheDocument();
      expect(list).toHaveClass('list-decimal', 'ml-4', 'my-2', 'space-y-1', 'text-inherit');

      const items = container.querySelectorAll('li');
      expect(items.length).toBe(3);
    });

    test('renders links correctly with proper attributes', () => {
      const message: UIMessage = {
        id: 'msg-link',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Check out [this link](https://example.com)' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveClass('underline', 'hover:no-underline', 'text-inherit');
    });

    test('renders paragraphs with proper spacing', () => {
      const message: UIMessage = {
        id: 'msg-paragraphs',
        role: 'assistant',
        parts: [{ type: 'text', text: 'First paragraph.\n\nSecond paragraph.' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs.length).toBeGreaterThan(0);

      paragraphs.forEach((p) => {
        expect(p).toHaveClass('text-inherit');
      });
    });

    test('renders complex markdown with multiple elements', () => {
      const message: UIMessage = {
        id: 'msg-complex',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: '**Important:**\n\n1. First point\n2. Second point\n\nCheck [docs](https://example.com) for more.',
          },
        ],
      };

      const { container } = render(<ChatMessage message={message} />);

      expect(container.querySelector('strong')).toBeInTheDocument();
      expect(container.querySelector('ol')).toBeInTheDocument();
      expect(container.querySelector('a')).toBeInTheDocument();
    });
  });

  describe('Message Parts Handling', () => {
    test('handles multiple text parts', () => {
      const message: UIMessage = {
        id: 'msg-multi',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Part 1' },
          { type: 'text', text: 'Part 2' },
        ],
      };

      const { container } = render(<ChatMessage message={message} />);

      expect(container).toHaveTextContent('Part 1');
      expect(container).toHaveTextContent('Part 2');
    });

    test('handles empty parts array', () => {
      const message: UIMessage = {
        id: 'msg-empty',
        role: 'assistant',
        parts: [],
      };

      const { container } = render(<ChatMessage message={message} />);

      // Should render empty message bubble
      const messageDiv = container.querySelector('.bg-gray-100');
      expect(messageDiv).toBeInTheDocument();
    });

    test('filters non-text parts correctly', () => {
      const message: UIMessage = {
        id: 'msg-mixed',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Text content' },
          { type: 'image' as any, url: 'https://example.com/image.jpg' },
        ],
      };

      render(<ChatMessage message={message} />);

      // Should only render text content
      expect(screen.getByText('Text content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty message text', () => {
      const message: UIMessage = {
        id: 'msg-empty-text',
        role: 'assistant',
        parts: [{ type: 'text', text: '' }],
      };

      const { container } = render(<ChatMessage message={message} isLoading={false} />);

      const messageDiv = container.querySelector('.bg-gray-100');
      expect(messageDiv).toBeInTheDocument();
    });

    test('handles very long messages', () => {
      const longText = 'A'.repeat(1000);
      const message: UIMessage = {
        id: 'msg-long',
        role: 'assistant',
        parts: [{ type: 'text', text: longText }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector('.max-w-\\[66\\%\\]');
      expect(messageDiv).toBeInTheDocument();
      expect(messageDiv).toHaveTextContent(longText);
    });

    test('handles special characters in message', () => {
      const message: UIMessage = {
        id: 'msg-special',
        role: 'assistant',
        parts: [{ type: 'text', text: '<script>alert("xss")</script>' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      // ReactMarkdown should escape HTML
      expect(container.querySelector('script')).not.toBeInTheDocument();
    });

    test('handles newlines and whitespace correctly', () => {
      const message: UIMessage = {
        id: 'msg-newlines',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Line 1\n\nLine 2\n\nLine 3' }],
      };

      render(<ChatMessage message={message} />);

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
      expect(screen.getByText(/Line 2/)).toBeInTheDocument();
      expect(screen.getByText(/Line 3/)).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    test('message width is constrained to 66% max', () => {
      const message: UIMessage = {
        id: 'msg-width',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Test message' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector('.max-w-\\[66\\%\\]');
      expect(messageDiv).toBeInTheDocument();
    });

    test('message has proper padding and border radius', () => {
      const message: UIMessage = {
        id: 'msg-style',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Test' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector('.px-4.py-2\\.5.rounded-xl');
      expect(messageDiv).toBeInTheDocument();
    });

    test('message has proper text size', () => {
      const message: UIMessage = {
        id: 'msg-size',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Test' }],
      };

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector('.text-sm');
      expect(messageDiv).toBeInTheDocument();
    });
  });

  describe('Console Logging (Debug Mode)', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    test('logs loading state for assistant messages', () => {
      const message: UIMessage = {
        id: 'msg-debug',
        role: 'assistant',
        parts: [{ type: 'text', text: '' }],
      };

      render(<ChatMessage message={message} isLoading={true} />);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ChatMessage] Loading state:'),
        expect.any(Object)
      );
    });

    test('does not log for user messages', () => {
      const message: UIMessage = {
        id: 'msg-user-debug',
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
      };

      render(<ChatMessage message={message} isLoading={false} />);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[ChatMessage] Loading state:'),
        expect.any(Object)
      );
    });
  });
});
