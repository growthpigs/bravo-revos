'use client';

import { useEffect, useState } from 'react';

export function TimestampDisplay() {
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    const updateTimestamp = () => {
      const now = new Date();
      const date = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      setTimestamp(`${date} at ${time}`);
    };

    updateTimestamp();
    const interval = setInterval(updateTimestamp, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-lg font-semibold text-blue-600 bg-blue-50 inline-block px-4 py-2 rounded-lg border border-blue-200">
      {timestamp || 'Loading time...'}
    </div>
  );
}
