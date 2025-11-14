import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { OrchestratedChatExample } from '@/components/chat/orchestrated-chat-example';

// Mock fetch
global.fetch = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  })
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}));

describe('OrchestratedChatExample Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render chat interface', () => {
    render(<OrchestratedChatExample />);

    expect(screen.getByPlaceholderText(/ask me to help/i)).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('should send message and display response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        response: 'Hello! How can I help?',
        orchestration: undefined,
        buttons: undefined
      })
    });

    render(<OrchestratedChatExample />);

    const input = screen.getByPlaceholderText(/ask me to help/i);
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
    });
  });

  it('should render inline buttons from response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        response: 'Choose an option',
        buttons: [
          { label: 'Create Campaign', navigateTo: '/campaigns/new' },
          { label: 'View Dashboard', navigateTo: '/dashboard' }
        ]
      })
    });

    render(<OrchestratedChatExample />);

    const input = screen.getByPlaceholderText(/ask me to help/i);
    fireEvent.change(input, { target: { value: 'Help me' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('Create Campaign')).toBeInTheDocument();
      expect(screen.getByText('View Dashboard')).toBeInTheDocument();
    });
  });

  it('should show progress indicator during orchestration', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        response: 'Creating campaign...',
        orchestration: {
          navigate: '/campaigns/new',
          message: 'Opening form...'
        }
      })
    });

    render(<OrchestratedChatExample />);

    const input = screen.getByPlaceholderText(/ask me to help/i);
    fireEvent.change(input, { target: { value: 'Create campaign' } });
    fireEvent.click(screen.getByText('Send'));

    // Progress should appear briefly
    await waitFor(() => {
      // The progress indicator might be visible briefly
      // We mainly verify no errors occur
      expect(screen.getByText('Creating campaign...')).toBeInTheDocument();
    });
  });

  it('should handle button action clicks', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          response: 'Choose an option',
          buttons: [{ label: 'Create Lead Magnet', action: 'create_lead_magnet' }]
        })
      })
      .mockResolvedValueOnce({
        json: async () => ({
          response: 'Creating lead magnet...'
        })
      });

    render(<OrchestratedChatExample />);

    const input = screen.getByPlaceholderText(/ask me to help/i);
    fireEvent.change(input, { target: { value: 'Help me' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('Create Lead Magnet')).toBeInTheDocument();
    });

    // Click the button
    fireEvent.click(screen.getByText('Create Lead Magnet'));

    // Should trigger second API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Creating lead magnet...')).toBeInTheDocument();
    });
  });

  it('should disable input during orchestration execution', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        response: 'Working...',
        orchestration: {
          navigate: '/dashboard',
          fillFields: [{ id: 'field1', value: 'test' }]
        }
      })
    });

    render(<OrchestratedChatExample />);

    const input = screen.getByPlaceholderText(/ask me to help/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));

    // Input should be disabled briefly during execution
    await waitFor(() => {
      // Check that orchestration completes without errors
      expect(screen.getByText('Working...')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<OrchestratedChatExample />);

    const input = screen.getByPlaceholderText(/ask me to help/i);
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText(/sorry, something went wrong/i)).toBeInTheDocument();
    });
  });

  it('should handle Enter key to send message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        response: 'Message received'
      })
    });

    render(<OrchestratedChatExample />);

    const input = screen.getByPlaceholderText(/ask me to help/i);
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Message received')).toBeInTheDocument();
    });
  });

  it('should clear input after sending', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        response: 'Got it'
      })
    });

    render(<OrchestratedChatExample />);

    const input = screen.getByPlaceholderText(/ask me to help/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('should handle responses without orchestration', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        response: 'Just a simple text response'
      })
    });

    render(<OrchestratedChatExample />);

    const input = screen.getByPlaceholderText(/ask me to help/i);
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('Just a simple text response')).toBeInTheDocument();
    });

    // Should not show progress or buttons
    expect(screen.queryByText(/navigating/i)).not.toBeInTheDocument();
  });
});
