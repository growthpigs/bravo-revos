/**
 * useHealthStatus Hook Tests
 *
 * Tests the React hook that fetches health data every 30 seconds
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useHealthStatus, useHealthBannerVisibility } from '@/hooks/use-health-status';

// Mock fetch
global.fetch = jest.fn();

describe('useHealthStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const mockHealthData = {
    status: 'healthy',
    checks: {
      timestamp: new Date().toISOString(),
      database: { status: 'healthy', latency: 50 },
      supabase: { status: 'healthy' },
      api: { status: 'healthy' },
      agentkit: { status: 'healthy' },
      mem0: { status: 'healthy' },
      unipile: { status: 'healthy' },
      email: { status: 'healthy' },
      console: { status: 'healthy' },
      cache: { status: 'healthy' },
      queue: { status: 'healthy' },
      cron: { status: 'healthy' },
      webhooks: { status: 'healthy' },
    },
  };

  describe('Initial State', () => {
    it('should start with loading state', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockHealthData,
      });

      const { result } = renderHook(() => useHealthStatus());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
    });

    it('should fetch data on mount', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockHealthData,
      });

      renderHook(() => useHealthStatus());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/health');
      });
    });
  });

  describe('Data Fetching', () => {
    it('should update data when API responds', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockHealthData,
      });

      const { result } = renderHook(() => useHealthStatus());

      await waitFor(() => {
        expect(result.current.data).toEqual(mockHealthData);
      });
    });

    it('should set loading to false after fetch', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockHealthData,
      });

      const { result } = renderHook(() => useHealthStatus());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should provide refresh function', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockHealthData,
      });

      const { result } = renderHook(() => useHealthStatus());

      expect(result.current.refresh).toBeDefined();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should refetch when refresh is called', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockHealthData,
      });

      const { result } = renderHook(() => useHealthStatus());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Polling Behavior', () => {
    it('should poll at default 30 second interval', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockHealthData,
      });

      renderHook(() => useHealthStatus());

      // Initial fetch
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Advance 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Advance another 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should respect custom refresh interval', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockHealthData,
      });

      const customInterval = 10000; // 10 seconds
      renderHook(() => useHealthStatus(customInterval));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should cleanup interval on unmount', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockHealthData,
      });

      const { unmount } = renderHook(() => useHealthStatus());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Advance time and verify no more fetches
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useHealthStatus());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle non-ok responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useHealthStatus());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it('should continue polling after errors', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          json: async () => mockHealthData,
        });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      renderHook(() => useHealthStatus());

      // First fetch fails
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Advance time for next poll
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Second fetch succeeds
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Data Structure Validation', () => {
    it('should handle complete health data structure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockHealthData,
      });

      const { result } = renderHook(() => useHealthStatus());

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const data = result.current.data!;
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('checks');
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('supabase');
      expect(data.checks).toHaveProperty('api');
      expect(data.checks).toHaveProperty('timestamp');
    });

    it('should handle degraded status', async () => {
      const degradedData = {
        ...mockHealthData,
        status: 'degraded',
        checks: {
          ...mockHealthData.checks,
          database: { status: 'degraded', latency: 500 },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => degradedData,
      });

      const { result } = renderHook(() => useHealthStatus());

      await waitFor(() => {
        expect(result.current.data?.status).toBe('degraded');
      });
    });

    it('should handle unhealthy status', async () => {
      const unhealthyData = {
        ...mockHealthData,
        status: 'unhealthy',
        checks: {
          ...mockHealthData.checks,
          database: { status: 'unhealthy' },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => unhealthyData,
      });

      const { result } = renderHook(() => useHealthStatus());

      await waitFor(() => {
        expect(result.current.data?.status).toBe('unhealthy');
      });
    });
  });
});

describe('useHealthBannerVisibility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should default to visible', () => {
      const { result } = renderHook(() => useHealthBannerVisibility());

      expect(result.current.isVisible).toBe(true);
    });

    it('should read from localStorage on mount', () => {
      localStorage.setItem('health-banner-visible', 'false');

      const { result } = renderHook(() => useHealthBannerVisibility());

      expect(result.current.isVisible).toBe(false);
    });

    it('should handle invalid localStorage values', () => {
      localStorage.setItem('health-banner-visible', 'invalid');

      const { result } = renderHook(() => useHealthBannerVisibility());

      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('Toggle Functionality', () => {
    it('should provide toggle function', () => {
      const { result } = renderHook(() => useHealthBannerVisibility());

      expect(result.current.toggle).toBeDefined();
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should toggle visibility', () => {
      const { result } = renderHook(() => useHealthBannerVisibility());

      expect(result.current.isVisible).toBe(true);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isVisible).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isVisible).toBe(true);
    });

    it('should persist to localStorage when toggled', () => {
      const { result } = renderHook(() => useHealthBannerVisibility());

      act(() => {
        result.current.toggle();
      });

      expect(localStorage.getItem('health-banner-visible')).toBe('false');

      act(() => {
        result.current.toggle();
      });

      expect(localStorage.getItem('health-banner-visible')).toBe('true');
    });
  });

  describe('Persistence', () => {
    it('should maintain state across remounts', () => {
      const { result: result1 } = renderHook(() => useHealthBannerVisibility());

      act(() => {
        result1.current.toggle();
      });

      const { result: result2 } = renderHook(() => useHealthBannerVisibility());

      expect(result2.current.isVisible).toBe(false);
    });
  });
});
