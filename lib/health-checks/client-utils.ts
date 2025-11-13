/**
 * Client-Safe Health Check Utilities
 *
 * Pure functions that can be used in client components
 * NO Node.js APIs (fs, child_process, etc.)
 */

/**
 * Format timestamp as relative time (e.g., "2m ago", "5h ago")
 * Client-safe - uses only browser APIs
 */
export function formatDeployTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Format git commit SHA (short form)
 */
export function formatCommitSha(sha: string): string {
  return sha.substring(0, 7);
}

/**
 * Get status color for health status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return '#10b981'; // green-500
    case 'degraded':
      return '#f59e0b'; // amber-500
    case 'unhealthy':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Get status emoji for health status
 */
export function getStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy':
      return '✓';
    case 'degraded':
      return '⚠';
    case 'unhealthy':
      return '✗';
    default:
      return '?';
  }
}
