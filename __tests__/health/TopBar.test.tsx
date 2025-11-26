/**
 * TopBar Component Tests
 *
 * Tests the top banner component that displays service health status
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TopBar } from '@/components/TopBar';
import * as healthHooks from '@/hooks/use-health-status';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe('TopBar Component', () => {
  const mockHealthData = {
    status: 'healthy' as const,
    checks: {
      timestamp: new Date().toISOString(),
      database: { status: 'healthy' as const, latency: 50 },
      supabase: { status: 'healthy' as const },
      api: { status: 'healthy' as const },
      agentkit: { status: 'healthy' as const },
      mem0: { status: 'healthy' as const },
      unipile: { status: 'healthy' as const },
      email: { status: 'healthy' as const },
      console: { status: 'healthy' as const },
      cache: { status: 'healthy' as const },
      queue: { status: 'healthy' as const },
      cron: { status: 'healthy' as const },
      webhooks: { status: 'healthy' as const },
    },
  };

  // Helper to create mock health status return value with all required properties
  const createMockHealthStatus = (overrides?: {
    data?: typeof mockHealthData | null;
    isLoading?: boolean;
    error?: string | null;
    apiAvailable?: boolean | null;
    refresh?: jest.Mock;
  }) => ({
    data: mockHealthData,
    isLoading: false,
    error: null,
    apiAvailable: true,
    refresh: jest.fn(),
    ...overrides,
  }) as unknown as ReturnType<typeof healthHooks.useHealthStatus>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: null,
        isLoading: true,
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<TopBar />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render logo when showLogo is true', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: null,
        isLoading: false,
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<TopBar showLogo={true} />);

      const logo = screen.getByAltText('RevOS');
      expect(logo).toBeInTheDocument();
    });

    it('should not render logo when showLogo is false', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: null,
        isLoading: false,
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<TopBar showLogo={false} />);

      const logo = screen.queryByAltText('RevOS');
      expect(logo).not.toBeInTheDocument();
    });

    it('should display version and date', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: null,
        isLoading: false,
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<TopBar />);

      expect(screen.getByText(/V0.1/i)).toBeInTheDocument();
    });
  });

  describe('Health Status Display', () => {
    it('should display health banner when data is available', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: mockHealthData,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<TopBar />);

      expect(screen.getByText(/DATABASE/i)).toBeInTheDocument();
      expect(screen.getByText(/SUPABASE/i)).toBeInTheDocument();
    });

    it('should hide health banner when data is null', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: null,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<TopBar />);

      expect(screen.queryByText(/DATABASE/i)).not.toBeInTheDocument();
    });

    it('should display all 12 services', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: mockHealthData,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<TopBar />);

      const services = [
        'DATABASE', 'SUPABASE', 'API', 'AGENTKIT',
        'MEM0', 'UNIPILE', 'CONSOLE', 'CACHE',
        'QUEUE', 'CRON', 'WEBHOOKS', 'EMAIL'
      ];

      services.forEach((service) => {
        expect(screen.getByText(service)).toBeInTheDocument();
      });
    });
  });

  describe('Status Colors', () => {
    it('should use green color for healthy status', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: mockHealthData,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<TopBar />);

      const greenDots = container.querySelectorAll('.text-green-500');
      expect(greenDots.length).toBeGreaterThan(0);
    });

    it('should use orange color for degraded status', () => {
      const degradedData = {
        ...mockHealthData,
        checks: {
          ...mockHealthData.checks,
          database: { status: 'degraded' as const, latency: 500 },
        },
      } as unknown as typeof mockHealthData;

      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: degradedData,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<TopBar />);

      const orangeDots = container.querySelectorAll('.text-orange-500');
      expect(orangeDots.length).toBeGreaterThan(0);
    });

    it('should use red color for unhealthy status', () => {
      const unhealthyData = {
        ...mockHealthData,
        checks: {
          ...mockHealthData.checks,
          database: { status: 'unhealthy' as const, latency: 0 },
        },
      } as unknown as typeof mockHealthData;

      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: unhealthyData,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<TopBar />);

      const redDots = container.querySelectorAll('.text-red-500');
      expect(redDots.length).toBeGreaterThan(0);
    });

    it('should use gray color for unknown status', () => {
      const unknownData = {
        ...mockHealthData,
        checks: {
          ...mockHealthData.checks,
          database: { status: 'unknown' as const, latency: 0 },
        },
      } as unknown as typeof mockHealthData;

      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: unknownData,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<TopBar />);

      const grayDots = container.querySelectorAll('.text-gray-400');
      expect(grayDots.length).toBeGreaterThan(0);
    });
  });

  describe('Layout Structure', () => {
    it('should display 6 columns', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: mockHealthData,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<TopBar />);

      const columns = container.querySelectorAll('.flex.flex-col.gap-0\\.5');
      expect(columns.length).toBe(6);
    });

    it('should display 2 items per column', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: mockHealthData,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<TopBar />);

      const columns = container.querySelectorAll('.flex.flex-col.gap-0\\.5');
      columns.forEach((column) => {
        const items = column.querySelectorAll('span');
        expect(items.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should have dividers between columns', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: mockHealthData,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<TopBar />);

      const dividers = container.querySelectorAll('.w-px.h-5.bg-gray-300');
      expect(dividers.length).toBe(5); // 5 dividers for 6 columns
    });
  });

  describe('Fixed Positioning', () => {
    it('should have fixed positioning', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: null,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<TopBar />);

      const header = container.querySelector('header');
      expect(header).toHaveClass('fixed');
      expect(header).toHaveClass('top-0');
      expect(header).toHaveClass('left-0');
      expect(header).toHaveClass('right-0');
    });

    it('should have z-40 z-index', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: null,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<TopBar />);

      const header = container.querySelector('header');
      expect(header).toHaveClass('z-40');
    });
  });

  describe('Data Updates', () => {
    it('should update display when data changes', async () => {
      const { rerender } = render(<TopBar />);

      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: null,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      rerender(<TopBar />);

      expect(screen.queryByText(/DATABASE/i)).not.toBeInTheDocument();

      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: mockHealthData,
        isLoading: false,
        refresh: jest.fn(),
      }));

      rerender(<TopBar />);

      await waitFor(() => {
        expect(screen.getByText(/DATABASE/i)).toBeInTheDocument();
      });
    });
  });

  describe('Typography and Styling', () => {
    it('should use monospace font for version', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: null,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<TopBar />);

      const versionText = container.querySelector('.font-mono.text-\\[6pt\\]');
      expect(versionText).toBeInTheDocument();
    });

    it('should use monospace font for health status', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: mockHealthData,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<TopBar />);

      const statusText = container.querySelector('.font-mono.text-\\[8pt\\]');
      expect(statusText).toBeInTheDocument();
    });

    it('should use uppercase text for services', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({
        data: mockHealthData,
        isLoading: false,
        refresh: jest.fn(),
      }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<TopBar />);

      const statusText = container.querySelector('.uppercase');
      expect(statusText).toBeInTheDocument();
    });
  });
});
