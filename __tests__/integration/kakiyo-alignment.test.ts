/**
 * Integration Tests: Kakiyo Alignment
 * Tests for complete UI/UX alignment with Kakiyo design system
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Kakiyo Alignment Integration', () => {
  describe('Light Mode UI', () => {
    it('should have dark mode disabled in globals.css', () => {
      const globalsPath = path.join(process.cwd(), 'app/globals.css');
      const content = fs.readFileSync(globalsPath, 'utf-8');

      // Should not have dark mode color scheme
      expect(content).not.toMatch(/prefers-color-scheme:\s*dark/);

      // Should force light mode
      expect(content).toMatch(/:root/);
    });

    it('should use Kakiyo-style colors', () => {
      const globalsPath = path.join(process.cwd(), 'app/globals.css');
      const content = fs.readFileSync(globalsPath, 'utf-8');

      // Check for light backgrounds
      expect(content).toMatch(/--background.*255/); // White backgrounds
    });
  });

  describe('Dashboard Card Styles', () => {
    it('should have shadow and hover effects in dashboard', () => {
      const dashboardPath = path.join(process.cwd(), 'app/dashboard/page.tsx');
      const content = fs.readFileSync(dashboardPath, 'utf-8');

      // Check for shadow classes
      expect(content).toMatch(/shadow/);

      // Check for hover effects
      expect(content).toMatch(/hover:/);
    });

    it('should have border styling', () => {
      const dashboardPath = path.join(process.cwd(), 'app/dashboard/page.tsx');
      const content = fs.readFileSync(dashboardPath, 'utf-8');

      expect(content).toMatch(/border/);
    });
  });

  describe('Navigation Menu', () => {
    it('should include Pod Activity in sidebar', () => {
      const sidebarPath = path.join(process.cwd(), 'components/dashboard/dashboard-sidebar.tsx');
      const content = fs.readFileSync(sidebarPath, 'utf-8');

      expect(content).toMatch(/Pod Activity/);
      expect(content).toMatch(/\/dashboard\/pod-activity/);
    });

    it('should have NEW badge on Pod Activity', () => {
      const sidebarPath = path.join(process.cwd(), 'components/dashboard/dashboard-sidebar.tsx');
      const content = fs.readFileSync(sidebarPath, 'utf-8');

      const podActivitySection = content.match(/Pod Activity[\s\S]{0,200}badge.*NEW/);
      expect(podActivitySection).toBeTruthy();
    });

    it('should have Kakiyo-style badge colors', () => {
      const sidebarPath = path.join(process.cwd(), 'components/dashboard/dashboard-sidebar.tsx');
      const content = fs.readFileSync(sidebarPath, 'utf-8');

      // NEW badges should be blue
      expect(content).toMatch(/NEW.*blue/);
    });
  });

  describe('Security Implementation', () => {
    it('should have server-side API route', () => {
      const apiPath = path.join(process.cwd(), 'app/api/conversation-intelligence/route.ts');
      expect(fs.existsSync(apiPath)).toBe(true);
    });

    it('should check authentication in API route', () => {
      const apiPath = path.join(process.cwd(), 'app/api/conversation-intelligence/route.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');

      expect(content).toMatch(/supabase\.auth\.getUser/);
      expect(content).toMatch(/401/); // Unauthorized status
    });

    it('should validate request body in API route', () => {
      const apiPath = path.join(process.cwd(), 'app/api/conversation-intelligence/route.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');

      expect(content).toMatch(/action/);
      expect(content).toMatch(/message/);
      expect(content).toMatch(/400/); // Bad request status
    });

    it('should use OpenAI only on server side', () => {
      const apiPath = path.join(process.cwd(), 'app/api/conversation-intelligence/route.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');

      expect(content).toMatch(/import.*OpenAI.*from.*openai/);
      expect(content).toMatch(/process\.env\.OPENAI_API_KEY/);
    });

    it('should NOT use OpenAI in client components', () => {
      const productsPath = path.join(process.cwd(), 'app/dashboard/products-services/page.tsx');
      const productsContent = fs.readFileSync(productsPath, 'utf-8');

      expect(productsContent).not.toMatch(/import.*OpenAI/);
      expect(productsContent).not.toMatch(/process\.env\.OPENAI_API_KEY/);

      const chipPath = path.join(process.cwd(), 'lib/chips/conversation-intelligence.ts');
      const chipContent = fs.readFileSync(chipPath, 'utf-8');

      expect(chipContent).not.toMatch(/import.*OpenAI/);
      expect(chipContent).not.toMatch(/new OpenAI/);
    });
  });

  describe('Authentication Flow', () => {
    it('should use Supabase auth in products-services', () => {
      const productsPath = path.join(process.cwd(), 'app/dashboard/products-services/page.tsx');
      const content = fs.readFileSync(productsPath, 'utf-8');

      expect(content).toMatch(/supabase\.auth\.getUser/);
      expect(content).toMatch(/onAuthStateChange/);
    });

    it('should redirect to login on auth failure', () => {
      const productsPath = path.join(process.cwd(), 'app/dashboard/products-services/page.tsx');
      const content = fs.readFileSync(productsPath, 'utf-8');

      expect(content).toMatch(/window\.location\.href.*\/login/);
    });

    it('should use authenticated user ID', () => {
      const productsPath = path.join(process.cwd(), 'app/dashboard/products-services/page.tsx');
      const content = fs.readFileSync(productsPath, 'utf-8');

      expect(content).toMatch(/user\.id/);
      expect(content).toMatch(/userId:\s*user\.id/);
    });

    it('should NOT have hardcoded user IDs', () => {
      const productsPath = path.join(process.cwd(), 'app/dashboard/products-services/page.tsx');
      const content = fs.readFileSync(productsPath, 'utf-8');

      // Check for UUID patterns that aren't in comments
      const lines = content.split('\n').filter(line => !line.trim().startsWith('//'));
      const codeOnly = lines.join('\n');

      const hardcodedUUIDs = codeOnly.match(/['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/g);
      expect(hardcodedUUIDs).toBeNull();
    });
  });

  describe('Pod Activity Features', () => {
    it('should have Pod Activity page', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      expect(fs.existsSync(podPath)).toBe(true);
    });

    it('should use client component directive', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/'use client'/);
    });

    it('should have filter functionality', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/filterStatus/);
      expect(content).toMatch(/pending/);
      expect(content).toMatch(/completed/);
      expect(content).toMatch(/failed/);
    });

    it('should highlight urgent activities', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/isUrgent/);
      expect(content).toMatch(/3600000/); // 1 hour in milliseconds
    });

    it('should have external link functionality', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/post_url/);
      expect(content).toMatch(/window\.open/);
      expect(content).toMatch(/_blank/);
    });

    it('should have execute action button', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/Execute Now/);
      expect(content).toMatch(/handleExecuteActivity/);
    });
  });

  describe('RLS Integration', () => {
    it('should query with pod_members join', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/pod_members!inner/);
      expect(content).toMatch(/user_id/);
    });

    it('should filter by authenticated user', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/\.eq\(['"]pod_members\.user_id['"],\s*user\.id\)/);
    });
  });

  describe('Component Structure', () => {
    it('should use shadcn/ui components', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/Card/);
      expect(content).toMatch(/Button/);
      expect(content).toMatch(/Badge/);
    });

    it('should use lucide icons', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/from 'lucide-react'/);
      expect(content).toMatch(/ThumbsUp|MessageCircle|Repeat2/);
    });

    it('should have loading state', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/loading/);
      expect(content).toMatch(/Loading\.\.\./);
    });

    it('should have empty state', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/No pod activities/);
    });
  });

  describe('TypeScript Types', () => {
    it('should have proper type definitions in Pod Activity', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/interface PodActivity/);
      expect(content).toMatch(/engagement_type:/);
      expect(content).toMatch(/status:/);
    });

    it('should have proper type imports', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/import.*User.*from.*@supabase\/supabase-js/);
    });

    it('should have proper types in API route', () => {
      const apiPath = path.join(process.cwd(), 'app/api/conversation-intelligence/route.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');

      expect(content).toMatch(/interface ToneProfile/);
      expect(content).toMatch(/interface ResponseStyle/);
      expect(content).toMatch(/interface EmotionalContext/);
    });
  });

  describe('Error Handling', () => {
    it('should handle auth errors in products-services', () => {
      const productsPath = path.join(process.cwd(), 'app/dashboard/products-services/page.tsx');
      const content = fs.readFileSync(productsPath, 'utf-8');

      expect(content).toMatch(/error/);
      expect(content).toMatch(/catch/);
      expect(content).toMatch(/console\.error/);
    });

    it('should handle query errors in pod activity', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/error/);
      expect(content).toMatch(/console\.error/);
    });

    it('should handle API errors in route', () => {
      const apiPath = path.join(process.cwd(), 'app/api/conversation-intelligence/route.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');

      expect(content).toMatch(/try/);
      expect(content).toMatch(/catch/);
      expect(content).toMatch(/500/);
    });

    it('should provide fallback for missing OpenAI key', () => {
      const apiPath = path.join(process.cwd(), 'app/api/conversation-intelligence/route.ts');
      const content = fs.readFileSync(apiPath, 'utf-8');

      expect(content).toMatch(/503/); // Service unavailable
      expect(content).toMatch(/fallback.*true/);
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive container classes', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/container/);
      expect(content).toMatch(/mx-auto/);
    });

    it('should have responsive spacing', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/space-y|gap/);
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/<h1/);
      expect(content).toMatch(/<p/);
    });

    it('should have accessible button text', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/View Post/);
      expect(content).toMatch(/Execute Now/);
    });

    it('should have descriptive empty states', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/No pod activities yet/);
      expect(content).toMatch(/Join or create a pod/);
    });
  });

  describe('Performance', () => {
    it('should use useMemo for Supabase client', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/useMemo.*createClient/);
    });

    it('should have proper dependency arrays', () => {
      const podPath = path.join(process.cwd(), 'app/dashboard/pod-activity/page.tsx');
      const content = fs.readFileSync(podPath, 'utf-8');

      expect(content).toMatch(/useEffect.*\[.*\]/);
    });
  });
});
