/**
 * Build Info Component
 * Displays build version, commit, and environment information
 */

'use client';

import { useEffect, useState } from 'react';

interface BuildInfo {
  commit: string;
  branch: string;
  timestamp: string;
  environment: string;
}

export function BuildInfo() {
  const [info, setInfo] = useState<BuildInfo | null>(null);

  useEffect(() => {
    fetch('/build-info.json')
      .then((r) => r.json())
      .then(setInfo)
      .catch((err) => {
        console.error('[BUILD_INFO] Failed to load build info:', err);
        setInfo(null);
      });
  }, []);

  if (!info) {
    return null;
  }

  const isProduction = info.environment === 'production';
  const buildDate = new Date(info.timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="text-xs select-none">
      {isProduction ? (
        <span className="text-gray-500">
          v{info.commit} • {buildDate}
        </span>
      ) : (
        <span className="text-orange-600 font-medium">
          {info.environment.toUpperCase()} • {info.branch} • {info.commit}
        </span>
      )}
    </div>
  );
}
