import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import type { UIMessage } from 'ai';

describe('ChatMessage Component', () => {
  // Helper to create UIMessage
  const createMessage = (role: 'user' | 'assistant', text: string): UIMessage => ({
    id: '1',
    role,
    parts: [{ type: 'text', text }],
  });

  describe('Expand Button Logic', () => {
    it('should show expand button for assistant messages > 500 chars', () => {
      const longText = 'a'.repeat(501);
      const message = createMessage('assistant', longText);
      const onExpand = jest.fn();

      render(<ChatMessage message={message} onExpand={onExpand} />);

      const expandButton = screen.getByRole('button', { name: /expand document/i });
      expect(expandButton).toBeInTheDocument();
    });

    it('should NOT show expand button for assistant messages ≤ 500 chars', () => {
      const shortText = 'a'.repeat(500); // Exactly 500 chars
      const message = createMessage('assistant', shortText);
      const onExpand = jest.fn();

      render(<ChatMessage message={message} onExpand={onExpand} />);

      const expandButton = screen.queryByRole('button', { name: /expand document/i });
      expect(expandButton).not.toBeInTheDocument();
    });

    it('should NOT show expand button for user messages regardless of length', () => {
      const longText = 'a'.repeat(1000);
      const message = createMessage('user', longText);
      const onExpand = jest.fn();

      render(<ChatMessage message={message} onExpand={onExpand} />);

      const expandButton = screen.queryByRole('button', { name: /expand document/i });
      expect(expandButton).not.toBeInTheDocument();
    });

    it('should NOT show expand button if onExpand is not provided', () => {
      const longText = 'a'.repeat(501);
      const message = createMessage('assistant', longText);

      render(<ChatMessage message={message} />);

      const expandButton = screen.queryByRole('button', { name: /expand document/i });
      expect(expandButton).not.toBeInTheDocument();
    });

    it('should call onExpand callback when expand button is clicked', () => {
      const longText = 'a'.repeat(501);
      const message = createMessage('assistant', longText);
      const onExpand = jest.fn();

      render(<ChatMessage message={message} onExpand={onExpand} />);

      const expandButton = screen.getByRole('button', { name: /expand document/i });
      fireEvent.click(expandButton);

      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('should render expand button with correct positioning and styling', () => {
      const longText = 'a'.repeat(501);
      const message = createMessage('assistant', longText);
      const onExpand = jest.fn();

      render(<ChatMessage message={message} onExpand={onExpand} />);

      const expandButton = screen.getByRole('button', { name: /expand document/i });

      // Check classes for positioning and styling
      expect(expandButton).toHaveClass('absolute', 'top-2', 'right-2');
      expect(expandButton).toHaveClass('w-4', 'h-4');
      expect(expandButton).toHaveClass('border-2', 'border-dashed');
    });
  });

  describe('Message Display', () => {
    it('should render user messages with correct styling', () => {
      const message = createMessage('user', 'Hello AI');

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector('.bg-gray-900.text-white');
      expect(messageDiv).toBeInTheDocument();
      expect(messageDiv).toHaveTextContent('Hello AI');
    });

    it('should render assistant messages with correct styling', () => {
      const message = createMessage('assistant', 'Hello human');

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector('.bg-gray-100.text-gray-900');
      expect(messageDiv).toBeInTheDocument();
      expect(messageDiv).toHaveTextContent('Hello human');
    });

    it('should apply correct padding (px-6 py-4)', () => {
      const message = createMessage('assistant', 'Test message');

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector('.px-6.py-4');
      expect(messageDiv).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show three thinking dots when loading with no text', () => {
      const message = createMessage('assistant', '');

      const { container } = render(<ChatMessage message={message} isLoading={true} />);

      const dots = container.querySelectorAll('.animate-bounce');
      expect(dots).toHaveLength(3);
    });

    it('should show message text when loading with text', () => {
      const message = createMessage('assistant', 'Generating response...');

      render(<ChatMessage message={message} isLoading={true} />);

      expect(screen.getByText('Generating response...')).toBeInTheDocument();
    });

    it('should not show loading animation for user messages', () => {
      const message = createMessage('user', '');

      const { container } = render(<ChatMessage message={message} isLoading={true} />);

      // User message should not show loading dots
      const messageContent = container.querySelector('.bg-gray-900');
      expect(messageContent?.textContent).toBe('');
    });
  });

  describe('Markdown Rendering', () => {
    it('should render bold text with correct styling', () => {
      const message = createMessage('assistant', '**Bold text**');

      render(<ChatMessage message={message} />);

      const boldElement = screen.getByText('Bold text');
      expect(boldElement.tagName).toBe('STRONG');
      expect(boldElement).toHaveClass('font-bold', 'text-inherit');
    });

    it('should render lists with correct styling', () => {
      const message = createMessage('assistant', '- Item 1\n- Item 2\n- Item 3');

      const { container } = render(<ChatMessage message={message} />);

      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();
      expect(list).toHaveClass('list-disc', 'ml-4');
    });

    it('should render links with correct attributes', () => {
      const message = createMessage('assistant', '[Google](https://google.com)');

      render(<ChatMessage message={message} />);

      const link = screen.getByRole('link', { name: /google/i });
      expect(link).toHaveAttribute('href', 'https://google.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveClass('underline');
    });

    it('should NOT render horizontal rules (hr should be null)', () => {
      const message = createMessage('assistant', 'Text above\n\n---\n\nText below');

      const { container } = render(<ChatMessage message={message} />);

      const hr = container.querySelector('hr');
      expect(hr).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly 500 character message (no expand button)', () => {
      const exactlyFiveHundred = 'a'.repeat(500);
      const message = createMessage('assistant', exactlyFiveHundred);
      const onExpand = jest.fn();

      render(<ChatMessage message={message} onExpand={onExpand} />);

      const expandButton = screen.queryByRole('button', { name: /expand document/i });
      expect(expandButton).not.toBeInTheDocument();
    });

    it('should handle exactly 501 character message (show expand button)', () => {
      const fiveHundredOne = 'a'.repeat(501);
      const message = createMessage('assistant', fiveHundredOne);
      const onExpand = jest.fn();

      render(<ChatMessage message={message} onExpand={onExpand} />);

      const expandButton = screen.getByRole('button', { name: /expand document/i });
      expect(expandButton).toBeInTheDocument();
    });

    it('should handle very long messages (5000+ chars)', () => {
      const veryLongText = 'a'.repeat(5000);
      const message = createMessage('assistant', veryLongText);
      const onExpand = jest.fn();

      render(<ChatMessage message={message} onExpand={onExpand} />);

      const expandButton = screen.getByRole('button', { name: /expand document/i });
      expect(expandButton).toBeInTheDocument();
      expect(screen.getByText(veryLongText)).toBeInTheDocument();
    });

    it('should handle messages with complex markdown formatting', () => {
      const complexMarkdown = `# Heading

**Bold text** and *italic* text

- List item 1
- List item 2

[Link](https://example.com)

\`\`\`
Code block
\`\`\``;

      const message = createMessage('assistant', complexMarkdown);

      const { container } = render(<ChatMessage message={message} />);

      expect(container.querySelector('strong')).toBeInTheDocument();
      expect(container.querySelector('ul')).toBeInTheDocument();
      expect(container.querySelector('a')).toBeInTheDocument();
    });

    it('should handle empty messages', () => {
      const message = createMessage('assistant', '');

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector('.bg-gray-100');
      expect(messageDiv).toBeInTheDocument();
    });

    it('should handle messages with special characters', () => {
      const specialChars = 'Test <>&"\'';
      const message = createMessage('assistant', specialChars);

      render(<ChatMessage message={message} />);

      expect(screen.getByText(specialChars)).toBeInTheDocument();
    });

    it('should handle messages with multiple parts', () => {
      const message: UIMessage = {
        id: '1',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'First part. ' },
          { type: 'text', text: 'Second part.' },
        ],
      };

      render(<ChatMessage message={message} />);

      // Text parts are joined with newline and rendered as separate paragraphs
      expect(screen.getByText('First part.')).toBeInTheDocument();
      expect(screen.getByText('Second part.')).toBeInTheDocument();
    });
  });

  describe('Button Accessibility', () => {
    it('should have correct aria-label for expand button', () => {
      const longText = 'a'.repeat(501);
      const message = createMessage('assistant', longText);
      const onExpand = jest.fn();

      render(<ChatMessage message={message} onExpand={onExpand} />);

      const expandButton = screen.getByRole('button', { name: /expand document/i });
      expect(expandButton).toHaveAttribute('aria-label', 'Expand document');
    });

    it('should have correct title attribute for expand button', () => {
      const longText = 'a'.repeat(501);
      const message = createMessage('assistant', longText);
      const onExpand = jest.fn();

      render(<ChatMessage message={message} onExpand={onExpand} />);

      const expandButton = screen.getByRole('button', { name: /expand document/i });
      expect(expandButton).toHaveAttribute('title', 'Click to expand and view full document');
    });
  });

  describe('Message Alignment', () => {
    it('should align user messages to the right', () => {
      const message = createMessage('user', 'User message');

      const { container } = render(<ChatMessage message={message} />);

      const wrapper = container.querySelector('.justify-end');
      expect(wrapper).toBeInTheDocument();
    });

    it('should align assistant messages to the left', () => {
      const message = createMessage('assistant', 'Assistant message');

      const { container } = render(<ChatMessage message={message} />);

      const wrapper = container.querySelector('.justify-start');
      expect(wrapper).toBeInTheDocument();
    });
  });
});
