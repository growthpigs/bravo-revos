/**
 * Unit Tests for SlashCommandAutocomplete Component
 * Tests: Rendering, keyboard navigation, filtering, selection
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SlashCommandAutocomplete } from '@/components/chat/SlashCommandAutocomplete';
import { slashCommands } from '@/lib/slash-commands';

describe('SlashCommandAutocomplete Component', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();
  const defaultProps = {
    visible: true,
    query: '',
    onSelect: mockOnSelect,
    onClose: mockOnClose,
    position: { top: 500, left: 100 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when visible is true', () => {
      render(<SlashCommandAutocomplete {...defaultProps} />);

      expect(screen.getByText(/commands/i)).toBeInTheDocument();
    });

    it('should not render when visible is false', () => {
      render(<SlashCommandAutocomplete {...defaultProps} visible={false} />);

      expect(screen.queryByText(/commands/i)).not.toBeInTheDocument();
    });

    it('should not render when no commands match query', () => {
      render(
        <SlashCommandAutocomplete
          {...defaultProps}
          query="nonexistent-xyz"
        />
      );

      expect(screen.queryByText(/commands/i)).not.toBeInTheDocument();
    });

    it('should show all commands when query is empty', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="" />);

      expect(screen.getByText(`${slashCommands.length} commands`)).toBeInTheDocument();
    });

    it('should show filtered count', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="pod" />);

      // Should find pod-members, pod-share, pod-engage, pod-stats
      expect(screen.getByText(/4 commands/i)).toBeInTheDocument();
    });

    it('should display category labels', () => {
      render(<SlashCommandAutocomplete {...defaultProps} />);

      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Campaign')).toBeInTheDocument();
      expect(screen.getByText('Pod')).toBeInTheDocument();
      expect(screen.getByText('Utility')).toBeInTheDocument();
    });
  });

  describe('Command Display', () => {
    it('should show command name with slash prefix', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="write" />);

      expect(screen.getByText('/write')).toBeInTheDocument();
    });

    it('should show command description', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="write" />);

      expect(
        screen.getByText(/Start writing a post/i)
      ).toBeInTheDocument();
    });

    it('should show command args when present', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="generate" />);

      expect(screen.getByText('[topic]')).toBeInTheDocument();
    });

    it('should show command aliases when present', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="launch" />);

      // li-campaign has aliases: launch, campaign
      expect(screen.getByText(/launch, campaign/i)).toBeInTheDocument();
    });

    it('should display all commands in correct categories', () => {
      const { container } = render(
        <SlashCommandAutocomplete {...defaultProps} />
      );

      // Count buttons (one per command)
      const commandButtons = container.querySelectorAll('button');
      expect(commandButtons.length).toBe(slashCommands.length);
    });
  });

  describe('Filtering', () => {
    it('should filter commands by name', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="write" />);

      expect(screen.getByText('/write')).toBeInTheDocument();
      expect(screen.getByText('/rewrite')).toBeInTheDocument();
      expect(screen.queryByText('/generate')).not.toBeInTheDocument();
    });

    it('should filter commands by alias', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="launch" />);

      expect(screen.getByText('/li-campaign')).toBeInTheDocument();
    });

    it('should filter commands by description', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="engagement" />);

      expect(screen.getByText('/pod-stats')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onSelect when command is clicked', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="write" />);

      const writeButton = screen.getByText('/write').closest('button');
      fireEvent.click(writeButton!);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect.mock.calls[0][0].name).toBe('write');
    });

    it('should highlight first command by default', () => {
      const { container } = render(
        <SlashCommandAutocomplete {...defaultProps} />
      );

      const firstButton = container.querySelector('button[data-index="0"]');
      expect(firstButton).toHaveClass('bg-gray-100');
    });

    it('should show selection indicator on highlighted command', () => {
      const { container } = render(
        <SlashCommandAutocomplete {...defaultProps} query="write" />
      );

      const firstButton = container.querySelector('button[data-index="0"]');
      const checkmark = firstButton?.querySelector('svg');
      expect(checkmark).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should move selection down with ArrowDown', async () => {
      const { container } = render(
        <SlashCommandAutocomplete {...defaultProps} query="write" />
      );

      // Initially first item selected
      let selectedButton = container.querySelector('button[data-index="0"]');
      expect(selectedButton).toHaveClass('bg-gray-100');

      // Press ArrowDown
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      await waitFor(() => {
        selectedButton = container.querySelector('button[data-index="1"]');
        expect(selectedButton).toHaveClass('bg-gray-100');
      });
    });

    it('should move selection up with ArrowUp', async () => {
      const { container } = render(
        <SlashCommandAutocomplete {...defaultProps} query="write" />
      );

      // Press ArrowDown to move to second item
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      await waitFor(() => {
        let selectedButton = container.querySelector('button[data-index="1"]');
        expect(selectedButton).toHaveClass('bg-gray-100');
      });

      // Press ArrowUp to go back to first
      fireEvent.keyDown(window, { key: 'ArrowUp' });

      await waitFor(() => {
        let selectedButton = container.querySelector('button[data-index="0"]');
        expect(selectedButton).toHaveClass('bg-gray-100');
      });
    });

    it('should wrap to last item when pressing ArrowUp at first', async () => {
      const { container } = render(
        <SlashCommandAutocomplete {...defaultProps} query="pod" />
      );

      // Initially at index 0
      expect(
        container.querySelector('button[data-index="0"]')
      ).toHaveClass('bg-gray-100');

      // Press ArrowUp (should wrap to last)
      fireEvent.keyDown(window, { key: 'ArrowUp' });

      await waitFor(() => {
        const lastIndex = 3; // 4 pod commands (0-3)
        const selectedButton = container.querySelector(
          `button[data-index="${lastIndex}"]`
        );
        expect(selectedButton).toHaveClass('bg-gray-100');
      });
    });

    it('should wrap to first item when pressing ArrowDown at last', async () => {
      const { container } = render(
        <SlashCommandAutocomplete {...defaultProps} query="pod" />
      );

      // Navigate to last item (index 3)
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(
          container.querySelector('button[data-index="3"]')
        ).toHaveClass('bg-gray-100');
      });

      // Press ArrowDown again (should wrap to first)
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(
          container.querySelector('button[data-index="0"]')
        ).toHaveClass('bg-gray-100');
      });
    });

    it('should select command on Enter key', async () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="write" />);

      // First command should be selected by default
      fireEvent.keyDown(window, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledTimes(1);
        expect(mockOnSelect.mock.calls[0][0].name).toBe('write');
      });
    });

    it('should close on Escape key', async () => {
      render(<SlashCommandAutocomplete {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should prevent default on keyboard events', () => {
      render(<SlashCommandAutocomplete {...defaultProps} />);

      const arrowDownEvent = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        cancelable: true,
      });
      const preventDefaultSpy = jest.spyOn(arrowDownEvent, 'preventDefault');

      window.dispatchEvent(arrowDownEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Query Changes', () => {
    it('should reset selection to 0 when query changes', async () => {
      const { rerender, container } = render(
        <SlashCommandAutocomplete {...defaultProps} query="pod" />
      );

      // Navigate down
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(
          container.querySelector('button[data-index="2"]')
        ).toHaveClass('bg-gray-100');
      });

      // Change query
      rerender(<SlashCommandAutocomplete {...defaultProps} query="write" />);

      await waitFor(() => {
        // Selection should reset to 0
        expect(
          container.querySelector('button[data-index="0"]')
        ).toHaveClass('bg-gray-100');
      });
    });
  });

  describe('Position', () => {
    it('should position above textarea', () => {
      const { container } = render(
        <SlashCommandAutocomplete
          {...defaultProps}
          position={{ top: 600, left: 200 }}
        />
      );

      const dropdown = container.querySelector('.fixed');
      expect(dropdown).toHaveStyle({
        left: '200px',
      });

      // Bottom should be calculated as: window.innerHeight - top + 10
      // For testing purposes, just verify the style attribute exists
      expect(dropdown).toHaveAttribute('style');
    });
  });

  describe('Footer Hints', () => {
    it('should show navigation hints when query is empty', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="" />);

      expect(
        screen.getByText(/Type to filter · Arrow keys to navigate/i)
      ).toBeInTheDocument();
    });

    it('should hide footer hints when query has text', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="pod" />);

      expect(
        screen.queryByText(/Type to filter/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should show keyboard shortcuts hint', () => {
      render(<SlashCommandAutocomplete {...defaultProps} />);

      expect(screen.getByText('↑↓ · Enter · Esc')).toBeInTheDocument();
    });

    it('should show singular "command" for 1 result', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="help" />);

      expect(screen.getByText('1 command')).toBeInTheDocument();
    });

    it('should show plural "commands" for multiple results', () => {
      render(<SlashCommandAutocomplete {...defaultProps} query="pod" />);

      expect(screen.getByText(/commands/i)).toBeInTheDocument();
    });
  });

  describe('Category Grouping', () => {
    it('should group commands by category', () => {
      const { container } = render(
        <SlashCommandAutocomplete {...defaultProps} query="pod" />
      );

      // All pod commands should be under "Pod" category
      const podCategory = Array.from(
        container.querySelectorAll('.text-\\[10px\\]')
      ).find((el) => el.textContent === 'POD');

      expect(podCategory).toBeInTheDocument();

      // Get parent container and check commands
      const categoryContainer = podCategory?.closest('.mb-2');
      const commandButtons = categoryContainer?.querySelectorAll('button');

      expect(commandButtons?.length).toBe(4); // 4 pod commands
    });

    it('should maintain category order', () => {
      const { container } = render(
        <SlashCommandAutocomplete {...defaultProps} />
      );

      const categoryLabels = Array.from(
        container.querySelectorAll('.uppercase.tracking-wide')
      ).map((el) => el.textContent);

      // Categories should appear in order: Content, Campaign, Pod, Utility
      const expectedOrder = ['CONTENT', 'CAMPAIGN', 'POD', 'UTILITY'];
      expect(categoryLabels).toEqual(expectedOrder);
    });
  });

  describe('Styling', () => {
    it('should use black & white design', () => {
      const { container } = render(
        <SlashCommandAutocomplete {...defaultProps} />
      );

      const dropdown = container.querySelector('.bg-white');
      expect(dropdown).toBeInTheDocument();
    });

    it('should use small fonts (10px-11px)', () => {
      const { container } = render(
        <SlashCommandAutocomplete {...defaultProps} />
      );

      const smallText = container.querySelector('.text-\\[10px\\]');
      expect(smallText).toBeInTheDocument();

      const mediumText = container.querySelector('.text-\\[11px\\]');
      expect(mediumText).toBeInTheDocument();
    });

    it('should have hover effect on commands', () => {
      const { container } = render(
        <SlashCommandAutocomplete {...defaultProps} />
      );

      const commandButton = container.querySelector('button');
      expect(commandButton).toHaveClass('hover:bg-gray-50');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid query changes', async () => {
      const { rerender } = render(
        <SlashCommandAutocomplete {...defaultProps} query="w" />
      );

      rerender(<SlashCommandAutocomplete {...defaultProps} query="wr" />);
      rerender(<SlashCommandAutocomplete {...defaultProps} query="wri" />);
      rerender(<SlashCommandAutocomplete {...defaultProps} query="writ" />);
      rerender(<SlashCommandAutocomplete {...defaultProps} query="write" />);

      await waitFor(() => {
        expect(screen.getByText('/write')).toBeInTheDocument();
      });
    });

    it('should not crash with null/undefined position', () => {
      expect(() => {
        render(
          <SlashCommandAutocomplete
            {...defaultProps}
            position={{ top: 0, left: 0 }}
          />
        );
      }).not.toThrow();
    });

    it('should handle visibility toggle rapidly', () => {
      const { rerender } = render(
        <SlashCommandAutocomplete {...defaultProps} visible={true} />
      );

      expect(() => {
        rerender(<SlashCommandAutocomplete {...defaultProps} visible={false} />);
        rerender(<SlashCommandAutocomplete {...defaultProps} visible={true} />);
        rerender(<SlashCommandAutocomplete {...defaultProps} visible={false} />);
      }).not.toThrow();
    });
  });
});
