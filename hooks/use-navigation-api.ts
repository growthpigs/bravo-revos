'use client';

import { useRouter } from 'next/navigation';
import { NavigationAPI } from '@/lib/orchestration/navigation-api';
import { useMemo } from 'react';

export function useNavigationAPI() {
  const router = useRouter();

  return useMemo(() => new NavigationAPI(router), [router]);
}
