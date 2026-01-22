/**
 * Generate Build Info Script
 * Generates build information including commit hash, branch, and timestamp
 * Runs before build to create public/build-info.json
 */

const fs = require('fs');
const { execSync } = require('child_process');

try {
  // Create empty .env file if it doesn't exist (required for Vercel builds)
  // Some packages check for .env existence even when using environment variables
  try {
    if (!fs.existsSync('.env')) {
      fs.writeFileSync('.env', '# Auto-generated for Vercel build compatibility\n');
      console.log('[BUILD_INFO] Created empty .env file for build compatibility');
    }
  } catch (envError) {
    // Silently ignore - some environments may have read-only restrictions
    console.log('[BUILD_INFO] Note: Could not create .env file (may be read-only)');
  }

  console.log('[BUILD_INFO] Generating build information...');

  let commit = 'unknown';
  let branch = 'unknown';
  let sourceBranch = '';

  // Always try to get local git branch (source branch)
  try {
    sourceBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch (err) {
    console.warn('[BUILD_INFO] Could not get source branch');
  }

  // Use Vercel env vars if available
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    commit = process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
    const targetBranch = process.env.VERCEL_GIT_COMMIT_REF || 'unknown';
    // Store both branches separately
    branch = targetBranch;
    console.log('[BUILD_INFO] Using Vercel env vars');
  } else {
    // Local dev - just show source branch
    try {
      commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    } catch (err) {
      console.warn('[BUILD_INFO] Could not get commit hash (not a git repo?)');
    }
    branch = sourceBranch || 'unknown';
  }

  const buildInfo = {
    commit,
    branch,
    sourceBranch: sourceBranch || branch,
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
