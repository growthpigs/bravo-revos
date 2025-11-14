import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { toast } from '@/hooks/use-toast';

export class NavigationAPI {
  private router: AppRouterInstance;

  constructor(router: AppRouterInstance) {
    this.router = router;
  }

  async navigateTo(path: string, message?: string): Promise<void> {
    // Show toast about navigation
    if (message) {
      toast({
        title: `🤖 ${message}`,
        duration: 3000
      });
    }

    // Add delay so user sees the message
    await new Promise(resolve => setTimeout(resolve, 500));

    // Navigate
    this.router.push(path);

    // Allow page to load
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  getCurrentPath(): string {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  }
}
