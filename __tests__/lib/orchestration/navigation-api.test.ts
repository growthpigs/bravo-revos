import { NavigationAPI } from '@/lib/orchestration/navigation-api';
import { toast } from '@/hooks/use-toast';

jest.mock('@/hooks/use-toast');

describe('NavigationAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to path with toast message', async () => {
    const mockPush = jest.fn();
    const mockRouter = { push: mockPush };

    const api = new NavigationAPI(mockRouter as any);

    await api.navigateTo('/dashboard/campaigns/new', 'Opening campaign builder...');

    expect(toast).toHaveBeenCalledWith({
      title: '🤖 Opening campaign builder...',
      duration: 3000
    });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/campaigns/new');
  });

  it('adds delay for user visibility', async () => {
    const mockPush = jest.fn();
    const mockRouter = { push: mockPush };

    const api = new NavigationAPI(mockRouter as any);
    const startTime = Date.now();

    await api.navigateTo('/test');

    const endTime = Date.now();
    expect(endTime - startTime).toBeGreaterThanOrEqual(500); // Message display delay
  });

  it('navigates without message if not provided', async () => {
    const mockPush = jest.fn();
    const mockRouter = { push: mockPush };

    const api = new NavigationAPI(mockRouter as any);

    await api.navigateTo('/dashboard');

    // Toast should not be called if no message
    expect(toast).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('returns current path on client side', () => {
    const mockRouter = { push: jest.fn() };
    const api = new NavigationAPI(mockRouter as any);

    // In jsdom, window.location.pathname is set to '/'
    const path = api.getCurrentPath();
    expect(typeof path).toBe('string');
  });
});
