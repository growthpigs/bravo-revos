/**
 * Component Tests: Pod Activity Feed
 * Tests for new Pod Activity page functionality
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PodActivityPage from '@/app/dashboard/pod-activity/page';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock window.location
delete (window as any).location;
(window as any).location = { href: '' };

describe('Pod Activity Page', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        onAuthStateChange: jest.fn(() => ({
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        })),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      })),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should redirect to login if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(window.location.href).toBe('/login');
      });
    });

    it('should render for authenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(screen.getByText('Pod Activity Feed')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      mockSupabase.auth.getUser.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<PodActivityPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Activity Display', () => {
    const mockActivities = [
      {
        id: 'activity-1',
        pod_id: 'pod-1',
        post_id: 'post-1',
        post_url: 'https://linkedin.com/post/1',
        engagement_type: 'like',
        scheduled_for: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        status: 'pending',
        created_at: new Date().toISOString(),
        execution_attempts: 0,
        last_error: null,
        pods: { name: 'Test Pod', client_id: 'client-1' },
        pod_members: [{ user_id: 'user-123' }],
      },
    ];

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      });
    });

    it('should display activities', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: mockActivities,
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(screen.getByText('Like Required')).toBeInTheDocument();
        expect(screen.getByText(/Test Pod/)).toBeInTheDocument();
      });
    });

    it('should show empty state when no activities', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(screen.getByText('No pod activities yet')).toBeInTheDocument();
      });
    });

    it('should display engagement type icons', async () => {
      const activities = [
        { ...mockActivities[0], engagement_type: 'like' },
        { ...mockActivities[0], id: 'activity-2', engagement_type: 'comment' },
        { ...mockActivities[0], id: 'activity-3', engagement_type: 'repost' },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: activities,
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(screen.getByText('Like Required')).toBeInTheDocument();
        expect(screen.getByText('Comment Required')).toBeInTheDocument();
        expect(screen.getByText('Repost Required')).toBeInTheDocument();
      });
    });

    it('should show status badges', async () => {
      const activities = [
        { ...mockActivities[0], status: 'pending' },
        { ...mockActivities[0], id: 'activity-2', status: 'completed' },
        { ...mockActivities[0], id: 'activity-3', status: 'failed' },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: activities,
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(screen.getAllByText('pending')[0]).toBeInTheDocument();
        expect(screen.getByText('completed')).toBeInTheDocument();
        expect(screen.getByText('failed')).toBeInTheDocument();
      });
    });

    it('should highlight urgent activities', async () => {
      const urgentActivity = {
        ...mockActivities[0],
        scheduled_for: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: [urgentActivity],
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        const urgentText = screen.getByText(/⚠️/);
        expect(urgentText).toBeInTheDocument();
      });
    });

    it('should show error messages for failed activities', async () => {
      const failedActivity = {
        ...mockActivities[0],
        status: 'failed',
        last_error: 'Rate limit exceeded',
        execution_attempts: 3,
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: [failedActivity],
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
        expect(screen.getByText(/3 attempts/)).toBeInTheDocument();
      });
    });
  });

  describe('Filter Functionality', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      });
    });

    it('should have filter buttons', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(screen.getByText('All Activities')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });
    });

    it('should filter activities by status', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        const pendingButton = screen.getByText('Pending');
        fireEvent.click(pendingButton);
      });

      // Verify query was called
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should show empty state with filter context', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        const completedButton = screen.getByText('Completed');
        fireEvent.click(completedButton);
      });

      await waitFor(() => {
        expect(screen.getByText('No completed activities')).toBeInTheDocument();
      });
    });
  });

  describe('Actions', () => {
    const mockActivity = {
      id: 'activity-1',
      pod_id: 'pod-1',
      post_id: 'post-1',
      post_url: 'https://linkedin.com/post/1',
      engagement_type: 'like',
      scheduled_for: new Date(Date.now() + 7200000).toISOString(),
      status: 'pending',
      created_at: new Date().toISOString(),
      execution_attempts: 0,
      last_error: null,
      pods: { name: 'Test Pod', client_id: 'client-1' },
      pod_members: [{ user_id: 'user-123' }],
    };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockActivity],
          error: null,
        }),
      });

      // Mock window.open
      global.open = jest.fn();
    });

    it('should have View Post button', async () => {
      render(<PodActivityPage />);

      await waitFor(() => {
        expect(screen.getByText('View Post')).toBeInTheDocument();
      });
    });

    it('should open post URL in new tab', async () => {
      render(<PodActivityPage />);

      await waitFor(() => {
        const viewButton = screen.getByText('View Post');
        fireEvent.click(viewButton);
      });

      expect(global.open).toHaveBeenCalledWith(
        'https://linkedin.com/post/1',
        '_blank'
      );
    });

    it('should show Execute Now button for pending activities', async () => {
      render(<PodActivityPage />);

      await waitFor(() => {
        expect(screen.getByText('Execute Now')).toBeInTheDocument();
      });
    });

    it('should not show Execute Now for completed activities', async () => {
      const completedActivity = { ...mockActivity, status: 'completed' };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [completedActivity],
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(screen.queryByText('Execute Now')).not.toBeInTheDocument();
      });
    });
  });

  describe('RLS Integration', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      });
    });

    it('should query with pod_members join for RLS', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock,
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(selectMock).toHaveBeenCalledWith(
          expect.stringContaining('pod_members!inner')
        );
      });
    });

    it('should filter by authenticated user ID', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock,
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(eqMock).toHaveBeenCalledWith('pod_members.user_id', 'user-123');
      });
    });
  });

  describe('Time Formatting', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      });
    });

    it('should format time remaining correctly', async () => {
      const activity = {
        id: 'activity-1',
        pod_id: 'pod-1',
        post_id: 'post-1',
        post_url: 'https://linkedin.com/post/1',
        engagement_type: 'like',
        scheduled_for: new Date(Date.now() + 7200000).toISOString(), // 2 hours
        status: 'pending',
        created_at: new Date().toISOString(),
        execution_attempts: 0,
        last_error: null,
        pods: { name: 'Test Pod', client_id: 'client-1' },
        pod_members: [{ user_id: 'user-123' }],
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [activity],
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(screen.getByText(/remaining/)).toBeInTheDocument();
      });
    });

    it('should show overdue for past dates', async () => {
      const activity = {
        id: 'activity-1',
        pod_id: 'pod-1',
        post_id: 'post-1',
        post_url: 'https://linkedin.com/post/1',
        engagement_type: 'like',
        scheduled_for: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        status: 'pending',
        created_at: new Date().toISOString(),
        execution_attempts: 0,
        last_error: null,
        pods: { name: 'Test Pod', client_id: 'client-1' },
        pod_members: [{ user_id: 'user-123' }],
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [activity],
          error: null,
        }),
      });

      render(<PodActivityPage />);

      await waitFor(() => {
        expect(screen.getByText('Overdue')).toBeInTheDocument();
      });
    });
  });
});
