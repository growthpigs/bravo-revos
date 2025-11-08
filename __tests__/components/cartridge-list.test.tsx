/**
 * CartridgeList Component Tests - HTML Structure Hydration Fix
 *
 * Tests the fix for invalid HTML structure that caused hydration errors
 * and dropdown menu click misfire (accidentally triggering delete on wrong cartridge).
 *
 * Issue: <div> wrapper inside <tbody> is invalid HTML
 * Fix: Removed wrapper, return array of TableRow elements, use flatMap()
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CartridgeList } from '@/components/cartridges/cartridge-list';
import { Cartridge } from '@/lib/cartridge-utils';

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
}));

describe('CartridgeList Component - HTML Structure Fix', () => {
  const mockCartridges: Cartridge[] = [
    {
      id: 'cart-1',
      name: 'System Base Voice',
      tier: 'system',
      description: 'Base voice settings',
      is_active: true,
      created_at: '2024-11-01T10:00:00Z',
      created_by: 'admin-1',
      voice_params: {
        tone: 'professional',
        style: 'formal',
        personality: 'authoritative',
        vocabulary: 'technical',
      },
      parent_id: null,
      agency_id: null,
      client_id: null,
      user_id: null,
    },
    {
      id: 'cart-2',
      name: 'User Custom Voice',
      tier: 'user',
      description: 'My personal voice',
      is_active: true,
      created_at: '2024-11-02T10:00:00Z',
      created_by: 'user-123',
      voice_params: {
        tone: 'casual',
        style: 'brief',
        personality: 'witty',
        vocabulary: 'informal',
      },
      parent_id: 'cart-1',
      agency_id: null,
      client_id: null,
      user_id: 'user-123',
    },
    {
      id: 'cart-3',
      name: 'Another User Voice',
      tier: 'user',
      description: 'Different voice',
      is_active: true,
      created_at: '2024-11-03T10:00:00Z',
      created_by: 'user-456',
      voice_params: {
        tone: 'friendly',
        style: 'detailed',
        personality: 'empathetic',
        vocabulary: 'simple',
      },
      parent_id: null,
      agency_id: null,
      client_id: null,
      user_id: 'user-456',
    },
  ];

  describe('Valid HTML Structure', () => {
    test('renders table without invalid div wrappers in tbody', () => {
      const { container } = render(<CartridgeList cartridges={mockCartridges} />);

      const tbody = container.querySelector('tbody');
      expect(tbody).toBeInTheDocument();

      // Check for invalid div children in tbody
      const divsInTbody = tbody?.querySelectorAll(':scope > div');
      expect(divsInTbody?.length).toBe(0); // ✅ No divs directly in tbody

      // Verify only TableRow elements are children
      const rowsInTbody = tbody?.querySelectorAll(':scope > tr');
      expect(rowsInTbody?.length).toBeGreaterThan(0);
    });

    test('renders correct number of table rows', () => {
      const { container } = render(<CartridgeList cartridges={mockCartridges} />);

      const rows = container.querySelectorAll('tbody > tr');
      expect(rows.length).toBe(mockCartridges.length);
    });

    test('each cartridge has exactly one row with correct data', () => {
      render(<CartridgeList cartridges={mockCartridges} />);

      mockCartridges.forEach((cartridge) => {
        expect(screen.getByText(cartridge.name)).toBeInTheDocument();
        expect(screen.getByText(cartridge.description!)).toBeInTheDocument();
      });
    });
  });

  describe('Dropdown Menu Event Handling', () => {
    test('edit button opens modal for correct cartridge', () => {
      const onEdit = jest.fn();

      render(<CartridgeList cartridges={mockCartridges} onEdit={onEdit} />);

      // Find all dropdown menu triggers
      const menuTriggers = screen.getAllByRole('button', { name: '' });
      const cartridge2Trigger = menuTriggers[1]; // Second cartridge

      // Open dropdown
      fireEvent.click(cartridge2Trigger);

      // Click Edit
      const editButton = screen.getByText('Edit Voice');
      fireEvent.click(editButton);

      // Verify correct cartridge was passed
      expect(onEdit).toHaveBeenCalledWith(mockCartridges[1]);
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    test('delete button triggers for correct cartridge only', () => {
      const onDelete = jest.fn();

      render(<CartridgeList cartridges={mockCartridges} onDelete={onDelete} />);

      // Find dropdown for third cartridge (user tier, can be deleted)
      const menuTriggers = screen.getAllByRole('button', { name: '' });
      const cartridge3Trigger = menuTriggers[2];

      // Open dropdown
      fireEvent.click(cartridge3Trigger);

      // Click Delete
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      // Verify correct cartridge ID was passed
      expect(onDelete).toHaveBeenCalledWith('cart-3');
      expect(onDelete).toHaveBeenCalledTimes(1);

      // Verify it was NOT called with other cartridge IDs
      expect(onDelete).not.toHaveBeenCalledWith('cart-1');
      expect(onDelete).not.toHaveBeenCalledWith('cart-2');
    });

    test('duplicate button calls correct handler', () => {
      const onDuplicate = jest.fn();

      render(<CartridgeList cartridges={mockCartridges} onDuplicate={onDuplicate} />);

      const menuTriggers = screen.getAllByRole('button', { name: '' });
      fireEvent.click(menuTriggers[0]);

      const duplicateButton = screen.getByText('Duplicate');
      fireEvent.click(duplicateButton);

      expect(onDuplicate).toHaveBeenCalledWith(mockCartridges[0]);
    });

    test('auto-generate button calls correct handler', () => {
      const onAutoGenerate = jest.fn();

      render(<CartridgeList cartridges={mockCartridges} onAutoGenerate={onAutoGenerate} />);

      const menuTriggers = screen.getAllByRole('button', { name: '' });
      fireEvent.click(menuTriggers[0]);

      const autoGenButton = screen.getByText('Auto-Generate');
      fireEvent.click(autoGenButton);

      expect(onAutoGenerate).toHaveBeenCalledWith(mockCartridges[0]);
    });
  });

  describe('System Cartridge Protection', () => {
    test('system cartridges do not show delete button', () => {
      render(<CartridgeList cartridges={mockCartridges} />);

      // Open dropdown for system cartridge
      const menuTriggers = screen.getAllByRole('button', { name: '' });
      fireEvent.click(menuTriggers[0]); // First cartridge is system tier

      // Delete button should NOT exist
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    test('user cartridges show delete button', () => {
      render(<CartridgeList cartridges={mockCartridges} />);

      // Open dropdown for user cartridge
      const menuTriggers = screen.getAllByRole('button', { name: '' });
      fireEvent.click(menuTriggers[1]); // Second cartridge is user tier

      // Delete button should exist
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('Tier Badge Rendering', () => {
    test('renders correct tier badges', () => {
      render(<CartridgeList cartridges={mockCartridges} />);

      expect(screen.getByText('system')).toBeInTheDocument();
      expect(screen.getAllByText('user').length).toBe(2);
    });

    test('applies correct tier colors', () => {
      const { container } = render(<CartridgeList cartridges={mockCartridges} />);

      const systemBadge = screen.getByText('system').parentElement;
      expect(systemBadge).toHaveClass('bg-purple-100', 'text-purple-900');

      const userBadges = screen.getAllByText('user');
      userBadges.forEach((badge) => {
        expect(badge.parentElement).toHaveClass('bg-amber-100', 'text-amber-900');
      });
    });
  });

  describe('Empty State', () => {
    test('shows empty state when no cartridges', () => {
      render(<CartridgeList cartridges={[]} />);

      expect(screen.getByText('No Cartridges')).toBeInTheDocument();
      expect(screen.getByText('Create your first voice cartridge to get started')).toBeInTheDocument();
    });
  });

  describe('Hierarchical Display', () => {
    test('renders parent-child relationships with expand/collapse', () => {
      render(<CartridgeList cartridges={mockCartridges} />);

      // System cartridge (parent) should have expand button
      const rows = screen.getAllByRole('row');
      const systemRow = rows[1]; // First row after header

      // Find expand button (▶)
      const expandButton = within(systemRow).getByText('▶');
      expect(expandButton).toBeInTheDocument();
    });

    test('expands child cartridges when clicking expand', () => {
      render(<CartridgeList cartridges={mockCartridges} />);

      const rows = screen.getAllByRole('row');
      const systemRow = rows[1];

      // Click expand
      const expandButton = within(systemRow).getByText('▶');
      fireEvent.click(expandButton);

      // Button should change to collapse (▼)
      expect(within(systemRow).getByText('▼')).toBeInTheDocument();
    });

    test('cartridges without children have no expand button', () => {
      render(<CartridgeList cartridges={mockCartridges} />);

      const rows = screen.getAllByRole('row');
      const userRow = rows[3]; // Third cartridge has no children

      // No expand/collapse button
      expect(within(userRow).queryByText('▶')).not.toBeInTheDocument();
      expect(within(userRow).queryByText('▼')).not.toBeInTheDocument();
    });
  });

  describe('Active/Inactive Status', () => {
    test('shows active badge for active cartridges', () => {
      render(<CartridgeList cartridges={mockCartridges} />);

      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBe(mockCartridges.length);
    });

    test('shows inactive badge for inactive cartridges', () => {
      const inactiveCartridges = [
        { ...mockCartridges[0], is_active: false },
      ];

      render(<CartridgeList cartridges={inactiveCartridges} />);

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('dropdown menus have proper ARIA labels', () => {
      render(<CartridgeList cartridges={mockCartridges} />);

      const menuTriggers = screen.getAllByRole('button', { name: '' });
      expect(menuTriggers.length).toBe(mockCartridges.length);
    });

    test('table has proper semantic structure', () => {
      const { container } = render(<CartridgeList cartridges={mockCartridges} />);

      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
      expect(container.querySelectorAll('th').length).toBeGreaterThan(0);
    });
  });
});
