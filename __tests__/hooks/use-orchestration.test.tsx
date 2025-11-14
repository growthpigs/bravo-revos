import { renderHook, act, waitFor } from '@testing-library/react';
import { useOrchestration } from '@/hooks/use-orchestration';
import { NavigationAPI } from '@/lib/orchestration/navigation-api';
import { FormControlAPI } from '@/lib/orchestration/form-control-api';
import { OrchestrationResponse } from '@/lib/orchestration/response-builder';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('@/lib/orchestration/navigation-api');
jest.mock('@/lib/orchestration/form-control-api');

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}));

describe('useOrchestration', () => {
  let mockRouter: any;
  let mockNavigationAPI: jest.Mocked<NavigationAPI>;
  let mockFormControlAPI: jest.Mocked<FormControlAPI>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup router mock
    mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn()
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // Setup NavigationAPI mock
    mockNavigationAPI = {
      navigateTo: jest.fn().mockResolvedValue(undefined),
      getCurrentPath: jest.fn().mockReturnValue('/')
    } as any;
    (NavigationAPI as jest.Mock).mockImplementation(() => mockNavigationAPI);

    // Setup FormControlAPI mock
    mockFormControlAPI = {
      fillField: jest.fn().mockResolvedValue(undefined),
      clickButton: jest.fn().mockResolvedValue(undefined),
      selectOption: jest.fn().mockResolvedValue(undefined)
    } as any;
    (FormControlAPI as jest.Mock).mockImplementation(() => mockFormControlAPI);
  });

  describe('Initialization', () => {
    it('should initialize with no progress', () => {
      const { result } = renderHook(() => useOrchestration());

      expect(result.current.isExecuting).toBe(false);
      expect(result.current.progress).toBeNull();
    });

    it('should expose execute function', () => {
      const { result } = renderHook(() => useOrchestration());

      expect(typeof result.current.execute).toBe('function');
    });
  });

  describe('Navigation Execution', () => {
    it('should execute navigation command', async () => {
      const { result } = renderHook(() => useOrchestration());

      const response: OrchestrationResponse = {
        response: 'Navigating to campaigns',
        orchestration: {
          navigate: '/dashboard/campaigns',
          message: 'Opening campaigns...'
        }
      };

      await act(async () => {
        await result.current.execute(response);
      });

      expect(mockNavigationAPI.navigateTo).toHaveBeenCalledWith(
        '/dashboard/campaigns',
        'Opening campaigns...'
      );
    });

    it('should show progress during navigation', async () => {
      const { result } = renderHook(() => useOrchestration());

      const response: OrchestrationResponse = {
        response: 'Navigating...',
        orchestration: {
          navigate: '/dashboard'
        }
      };

      act(() => {
        result.current.execute(response);
      });

      // Should show progress immediately
      expect(result.current.isExecuting).toBe(true);
      expect(result.current.progress).toBeTruthy();

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(false);
      });
    });

    it('should handle navigation errors gracefully', async () => {
      const { result } = renderHook(() => useOrchestration());

      mockNavigationAPI.navigateTo.mockRejectedValue(new Error('Navigation failed'));

      const response: OrchestrationResponse = {
        response: 'Navigating...',
        orchestration: {
          navigate: '/invalid'
        }
      };

      await act(async () => {
        await result.current.execute(response);
      });

      // Should complete and clear progress even on error
      expect(result.current.isExecuting).toBe(false);
    });
  });

  describe('Form Fill Execution', () => {
    it('should execute single form fill', async () => {
      const { result } = renderHook(() => useOrchestration());

      const response: OrchestrationResponse = {
        response: 'Filling campaign name',
        orchestration: {
          fillFields: [
            { id: 'campaign_name', value: 'Test Campaign', animated: true }
          ]
        }
      };

      await act(async () => {
        await result.current.execute(response);
      });

      expect(mockFormControlAPI.fillField).toHaveBeenCalledWith(
        'campaign_name',
        'Test Campaign',
        { animated: true }
      );
    });

    it('should execute multiple form fills sequentially', async () => {
      const { result } = renderHook(() => useOrchestration());

      const response: OrchestrationResponse = {
        response: 'Filling form',
        orchestration: {
          fillFields: [
            { id: 'field1', value: 'Value 1' },
            { id: 'field2', value: 'Value 2' },
            { id: 'field3', value: 'Value 3' }
          ]
        }
      };

      await act(async () => {
        await result.current.execute(response);
      });

      expect(mockFormControlAPI.fillField).toHaveBeenCalledTimes(3);
      expect(mockFormControlAPI.fillField).toHaveBeenNthCalledWith(1, 'field1', 'Value 1', {});
      expect(mockFormControlAPI.fillField).toHaveBeenNthCalledWith(2, 'field2', 'Value 2', {});
      expect(mockFormControlAPI.fillField).toHaveBeenNthCalledWith(3, 'field3', 'Value 3', {});
    });

    it('should update progress during multi-field fill', async () => {
      const { result } = renderHook(() => useOrchestration());

      const response: OrchestrationResponse = {
        response: 'Filling form',
        orchestration: {
          fillFields: [
            { id: 'field1', value: 'Value 1' },
            { id: 'field2', value: 'Value 2' }
          ]
        }
      };

      act(() => {
        result.current.execute(response);
      });

      expect(result.current.isExecuting).toBe(true);
      expect(result.current.progress).toContain('Filling fields');

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(false);
      });
    });

    it('should handle form fill errors', async () => {
      const { result } = renderHook(() => useOrchestration());

      mockFormControlAPI.fillField.mockRejectedValue(new Error('Field not found'));

      const response: OrchestrationResponse = {
        response: 'Filling form',
        orchestration: {
          fillFields: [{ id: 'missing_field', value: 'test' }]
        }
      };

      await act(async () => {
        await result.current.execute(response);
      });

      // Should complete despite error
      expect(result.current.isExecuting).toBe(false);
    });
  });

  describe('Button Click Execution', () => {
    it('should execute button click', async () => {
      const { result } = renderHook(() => useOrchestration());

      const response: OrchestrationResponse = {
        response: 'Clicking submit',
        orchestration: {
          clickButton: 'submit-btn'
        }
      };

      await act(async () => {
        await result.current.execute(response);
      });

      expect(mockFormControlAPI.clickButton).toHaveBeenCalledWith('submit-btn');
    });
  });

  describe('Combined Operations', () => {
    it('should execute navigation and form fill together', async () => {
      const { result } = renderHook(() => useOrchestration());

      const response: OrchestrationResponse = {
        response: 'Setting up campaign',
        orchestration: {
          navigate: '/dashboard/campaigns/new',
          message: 'Opening form...',
          fillFields: [
            { id: 'campaign_name', value: 'New Campaign' }
          ]
        }
      };

      await act(async () => {
        await result.current.execute(response);
      });

      expect(mockNavigationAPI.navigateTo).toHaveBeenCalled();
      expect(mockFormControlAPI.fillField).toHaveBeenCalled();
    });

    it('should execute operations in correct order: navigate, wait, fill', async () => {
      const { result } = renderHook(() => useOrchestration());
      const executionOrder: string[] = [];

      mockNavigationAPI.navigateTo.mockImplementation(async () => {
        executionOrder.push('navigate');
      });

      mockFormControlAPI.fillField.mockImplementation(async () => {
        executionOrder.push('fill');
      });

      const response: OrchestrationResponse = {
        response: 'Setting up',
        orchestration: {
          navigate: '/dashboard',
          wait: 100,
          fillFields: [{ id: 'field', value: 'test' }]
        }
      };

      await act(async () => {
        await result.current.execute(response);
      });

      expect(executionOrder).toEqual(['navigate', 'fill']);
    });
  });

  describe('Progress Indicators', () => {
    it('should provide descriptive progress messages', async () => {
      const { result } = renderHook(() => useOrchestration());

      const response: OrchestrationResponse = {
        response: 'Working...',
        orchestration: {
          navigate: '/dashboard',
          fillFields: [{ id: 'field', value: 'test' }]
        }
      };

      act(() => {
        result.current.execute(response);
      });

      // Should start with navigation progress
      expect(result.current.progress).toContain('Navigating');

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(false);
      });
    });

    it('should clear progress when execution completes', async () => {
      const { result } = renderHook(() => useOrchestration());

      const response: OrchestrationResponse = {
        response: 'Done',
        orchestration: {
          navigate: '/dashboard'
        }
      };

      await act(async () => {
        await result.current.execute(response);
      });

      expect(result.current.isExecuting).toBe(false);
      expect(result.current.progress).toBeNull();
    });
  });

  describe('Response without Orchestration', () => {
    it('should handle response with no orchestration instructions', async () => {
      const { result } = renderHook(() => useOrchestration());

      const response: OrchestrationResponse = {
        response: 'Just a message'
      };

      await act(async () => {
        await result.current.execute(response);
      });

      expect(mockNavigationAPI.navigateTo).not.toHaveBeenCalled();
      expect(mockFormControlAPI.fillField).not.toHaveBeenCalled();
      expect(result.current.isExecuting).toBe(false);
    });
  });

  describe('Button Rendering', () => {
    it('should expose buttons from response', () => {
      const { result } = renderHook(() => useOrchestration());

      const response: OrchestrationResponse = {
        response: 'Choose an option',
        buttons: [
          { label: 'Create', navigateTo: '/create' },
          { label: 'Cancel', variant: 'secondary' }
        ]
      };

      act(() => {
        result.current.execute(response);
      });

      expect(result.current.buttons).toHaveLength(2);
      expect(result.current.buttons?.[0].label).toBe('Create');
      expect(result.current.buttons?.[1].label).toBe('Cancel');
    });

    it('should clear buttons on next execution', async () => {
      const { result } = renderHook(() => useOrchestration());

      const response1: OrchestrationResponse = {
        response: 'First',
        buttons: [{ label: 'Button 1' }]
      };

      await act(async () => {
        await result.current.execute(response1);
      });

      expect(result.current.buttons).toHaveLength(1);

      const response2: OrchestrationResponse = {
        response: 'Second'
      };

      await act(async () => {
        await result.current.execute(response2);
      });

      expect(result.current.buttons).toBeUndefined();
    });
  });
});
