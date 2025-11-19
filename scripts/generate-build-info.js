/**
 * Generate Build Info Script
 * Generates build information including commit hash, branch, and timestamp
 * Runs before build to create public/build-info.json
 */

const fs = require('fs');
const { execSync } = require('child_process');

try {
  console.log('[BUILD_INFO] Generating build information...');

  let commit = 'unknown';
  let branch = 'unknown';

  try {
    commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch (err) {
    console.warn('[BUILD_INFO] Could not get commit hash (not a git repo?)');
  }

  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch (err) {
    console.warn('[BUILD_INFO] Could not get branch name');
  }

  const buildInfo = {
    commit,
    branch,
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'local',
  };

  // Ensure public directory exists
  const publicDir = 'public';
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('[BUILD_INFO] Created public directory');
  }

  fs.writeFileSync('public/build-info.json', JSON.stringify(buildInfo, null, 2));

  console.log('[BUILD_INFO] ✅ Build info generated:', buildInfo);
} catch (error) {
  console.error('[BUILD_INFO] ❌ Error generating build info:', error);
  process.exit(1);
}
