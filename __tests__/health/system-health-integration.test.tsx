/**
 * System Health Integration Tests
 *
 * Tests the complete system health pages (dashboard and admin)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClientSystemHealthPage } from '@/app/dashboard/system-health/client-page';
import { SystemHealthClient } from '@/app/admin/system-health/system-health-client';
import * as healthHooks from '@/hooks/use-health-status';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  RefreshCw: ({ className }: any) => <div data-testid="refresh-icon" className={className}>RefreshCw</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  EyeOff: () => <div data-testid="eye-off-icon">EyeOff</div>,
  Megaphone: ({ className }: any) => <div data-testid="megaphone-icon" className={className}>Megaphone</div>,
  Users: ({ className }: any) => <div data-testid="users-icon" className={className}>Users</div>,
  Mail: ({ className }: any) => <div data-testid="mail-icon" className={className}>Mail</div>,
  Linkedin: ({ className }: any) => <div data-testid="linkedin-icon" className={className}>Linkedin</div>,
  Building2: ({ className }: any) => <div data-testid="building-icon" className={className}>Building2</div>,
  Activity: ({ className }: any) => <div data-testid="activity-icon" className={className}>Activity</div>,
}));

describe('ClientSystemHealthPage', () => {
  const mockClientMetrics = {
    campaignsCount: 5,
    leadsCount: 150,
    extractionsSuccessRate: '85.5',
    linkedinAccountsCount: 3,
  };

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
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText('System Health')).toBeInTheDocument();
    });

    it('should display header with description', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText(/Real-time monitoring/i)).toBeInTheDocument();
    });
  });

  describe('Overall Status Card', () => {
    it('should display overall status', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText('HEALTHY')).toBeInTheDocument();
    });

    it('should display last checked timestamp', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText(/Last checked:/i)).toBeInTheDocument();
    });

    it('should show UNKNOWN when no data', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({ data: null }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    });
  });

  describe('Service Health Grid', () => {
    it('should display all 12 service cards', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      const services = [
        'Database', 'Supabase', 'API', 'AgentKit',
        'Mem0', 'UniPile', 'Console', 'Cache',
        'Queue', 'Cron', 'Webhooks', 'Email'
      ];

      services.forEach((service) => {
        expect(screen.getByText(service)).toBeInTheDocument();
      });
    });

    it('should display database latency', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText('50ms')).toBeInTheDocument();
    });
  });

  describe('Client Metrics', () => {
    it('should display campaign count', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Active Campaigns')).toBeInTheDocument();
    });

    it('should display leads count', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Total Leads')).toBeInTheDocument();
    });

    it('should display extraction success rate', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText('85.5%')).toBeInTheDocument();
      expect(screen.getByText('Email Extraction Rate')).toBeInTheDocument();
    });

    it('should display LinkedIn accounts count', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('LinkedIn Accounts')).toBeInTheDocument();
    });
  });

  describe('Refresh Button', () => {
    it('should display refresh button', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('should call refresh when clicked', () => {
      const refreshMock = jest.fn();

      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({ refresh: refreshMock }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      const refreshButton = screen.getByText('Refresh').closest('button');
      fireEvent.click(refreshButton!);

      expect(refreshMock).toHaveBeenCalled();
    });

    it('should disable button when loading', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({ isLoading: true }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      const refreshButton = screen.getByText('Refresh').closest('button');
      expect(refreshButton).toBeDisabled();
    });

    it('should show spinner when loading', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({ isLoading: true }));

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      const { container } = render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Banner Visibility Toggle', () => {
    it('should display visibility toggle button', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText('Hide Top Banner')).toBeInTheDocument();
    });

    it('should show "Hide" when banner is visible', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText('Hide Top Banner')).toBeInTheDocument();
    });

    it('should show "Show" when banner is hidden', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: false,
        toggle: jest.fn(),
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      expect(screen.getByText('Show Top Banner')).toBeInTheDocument();
    });

    it('should call toggle when clicked', () => {
      const toggleMock = jest.fn();

      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      jest.spyOn(healthHooks, 'useHealthBannerVisibility').mockReturnValue({
        isVisible: true,
        toggle: toggleMock,
      });

      render(<ClientSystemHealthPage clientMetrics={mockClientMetrics} />);

      const toggleButton = screen.getByText('Hide Top Banner').closest('button');
      fireEvent.click(toggleButton!);

      expect(toggleMock).toHaveBeenCalled();
    });
  });
});

describe('SystemHealthClient (Admin)', () => {
  const mockAgencyMetrics = {
    clientsCount: 12,
    campaignsCount: 45,
    usersCount: 78,
    linkedinActiveCount: 23,
    podsPending: 5,
    podsFailed: 2,
    podsTotal: 150,
  };

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
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      render(<SystemHealthClient agencyMetrics={mockAgencyMetrics} />);

      expect(screen.getByText('Overall System Status')).toBeInTheDocument();
    });

    it('should display all 12 service cards', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      render(<SystemHealthClient agencyMetrics={mockAgencyMetrics} />);

      const services = [
        'Database', 'Supabase', 'API', 'AgentKit',
        'Mem0', 'UniPile', 'Console', 'Cache',
        'Queue', 'Cron', 'Webhooks', 'Email'
      ];

      services.forEach((service) => {
        expect(screen.getByText(service)).toBeInTheDocument();
      });
    });
  });

  describe('Agency Metrics', () => {
    it('should display total clients', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      render(<SystemHealthClient agencyMetrics={mockAgencyMetrics} />);

      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Total Clients')).toBeInTheDocument();
    });

    it('should display active campaigns', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      render(<SystemHealthClient agencyMetrics={mockAgencyMetrics} />);

      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('Active Campaigns')).toBeInTheDocument();
    });

    it('should display LinkedIn accounts', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      render(<SystemHealthClient agencyMetrics={mockAgencyMetrics} />);

      expect(screen.getByText('23')).toBeInTheDocument();
      expect(screen.getByText('LinkedIn Accounts')).toBeInTheDocument();
    });

    it('should calculate and display pod success rate', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      render(<SystemHealthClient agencyMetrics={mockAgencyMetrics} />);

      // Success rate = (150 - 2) / 150 * 100 = 98.7%
      expect(screen.getByText('98.7%')).toBeInTheDocument();
    });
  });

  describe('Real-Time Activity', () => {
    it('should display database latency', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      render(<SystemHealthClient agencyMetrics={mockAgencyMetrics} />);

      expect(screen.getByText('50ms')).toBeInTheDocument();
    });

    it('should display pending pods count', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      render(<SystemHealthClient agencyMetrics={mockAgencyMetrics} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Pending Pods')).toBeInTheDocument();
    });

    it('should display failed pods count', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      render(<SystemHealthClient agencyMetrics={mockAgencyMetrics} />);

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Failed Pods')).toBeInTheDocument();
    });

    it('should display total pods count', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      render(<SystemHealthClient agencyMetrics={mockAgencyMetrics} />);

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Total Pods')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should have refresh button', () => {
      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus());

      render(<SystemHealthClient agencyMetrics={mockAgencyMetrics} />);

      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('should call refresh when clicked', () => {
      const refreshMock = jest.fn();

      jest.spyOn(healthHooks, 'useHealthStatus').mockReturnValue(createMockHealthStatus({ refresh: refreshMock }));

      render(<SystemHealthClient agencyMetrics={mockAgencyMetrics} />);

      const refreshButton = screen.getByText('Refresh').closest('button');
      fireEvent.click(refreshButton!);

      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
