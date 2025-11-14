import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { InlineButton } from '@/components/chat/inline-button';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

// Mock use-toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}));

describe('InlineButton', () => {
  beforeEach(() => {
    mockPush.mockClear();
    jest.clearAllMocks();
  });

  it('renders button with label', () => {
    render(<InlineButton label="CREATE CAMPAIGN" />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('CREATE CAMPAIGN');
  });

  it('renders with primary variant by default', () => {
    render(<InlineButton label="Click me" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<InlineButton label="Primary" variant="primary" />);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<InlineButton label="Secondary" variant="secondary" />);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200');

    rerender(<InlineButton label="Success" variant="success" />);
    expect(screen.getByRole('button')).toHaveClass('bg-green-600');

    rerender(<InlineButton label="Warning" variant="warning" />);
    expect(screen.getByRole('button')).toHaveClass('bg-amber-600');
  });

  it('calls onAction callback when action is provided', () => {
    const mockAction = jest.fn();

    render(
      <InlineButton
        label="Execute Tool"
        action="create_campaign"
        onAction={mockAction}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mockAction).toHaveBeenCalledWith('create_campaign');
  });

  it('navigates when navigateTo is provided', async () => {
    render(
      <InlineButton
        label="Open Dashboard"
        navigateTo="/dashboard"
      />
    );

    fireEvent.click(screen.getByRole('button'));

    // Wait for navigation to happen (500ms delay + 1000ms navigation delay)
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      },
      { timeout: 2000 }
    );
  });

  it('shows loading state while executing', async () => {
    const mockAction = jest.fn<Promise<void>, [string]>(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <InlineButton
        label="Execute"
        action="test_action"
        onAction={mockAction}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Check for loading state - button should be disabled and have spinner
    expect(button).toBeDisabled();

    // Wait for action to complete
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('shows spinner icon when loading', async () => {
    const mockAction = jest.fn<Promise<void>, [string]>(
      () => new Promise(resolve => setTimeout(resolve, 200))
    );

    render(
      <InlineButton
        label="Execute"
        action="test_action"
        onAction={mockAction}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Spinner should be visible while loading
    const spinner = button.querySelector('svg');
    expect(spinner).toHaveClass('animate-spin');

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('disables button when disabled prop is true', () => {
    render(<InlineButton label="Disabled" disabled={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50');
  });

  it('prevents click when already loading', async () => {
    const mockAction = jest.fn<Promise<void>, [string]>(
      () => new Promise(resolve => setTimeout(resolve, 300))
    );

    render(
      <InlineButton
        label="Click"
        action="test"
        onAction={mockAction}
      />
    );

    const button = screen.getByRole('button');

    // First click starts loading
    fireEvent.click(button);
    expect(mockAction).toHaveBeenCalledTimes(1);

    // Try to click again while loading (should be prevented by disabled state)
    fireEvent.click(button);
    expect(mockAction).toHaveBeenCalledTimes(1); // Still 1, not 2

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('executes action and navigation in sequence', async () => {
    const mockAction = jest.fn<Promise<void>, [string]>(
      () => new Promise(resolve => setTimeout(resolve, 50))
    );

    render(
      <InlineButton
        label="Do Both"
        action="test_action"
        navigateTo="/new-page"
        onAction={mockAction}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    // Action should be called first
    expect(mockAction).toHaveBeenCalledWith('test_action');

    // Then navigation should happen
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith('/new-page');
      },
      { timeout: 2000 }
    );
  });

  it('handles errors gracefully', async () => {
    const mockAction = jest.fn(() => {
      throw new Error('Action failed');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <InlineButton
        label="Failing Action"
        action="fail_action"
        onAction={mockAction}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Button should be enabled again after error
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });

    consoleSpy.mockRestore();
  });

  it('scales on hover and click', () => {
    render(<InlineButton label="Interactive" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('hover:scale-105');
    expect(button).toHaveClass('active:scale-95');
  });
});
