/**
 * Git Integration - Branch, Commit, Deploy Info
 *
 * Extracts git metadata for display in health check banner
 * Sources: env vars (deployment platforms), .git directory, exec git commands
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { GitInfo, GitHealthCheck } from './types';

/**
 * Get git information from multiple sources
 * Priority: deployment env vars → git commands → fallback
 */
export async function getGitInfo(): Promise<GitInfo> {
  try {
    // Try deployment platform environment variables first
    const envCommit =
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.RENDER_GIT_COMMIT ||
      process.env.COMMIT_REF ||
      process.env.RAILWAY_GIT_COMMIT_SHA;

    const envBranch =
      process.env.VERCEL_GIT_COMMIT_REF ||
      process.env.RENDER_GIT_BRANCH ||
      process.env.BRANCH ||
      process.env.RAILWAY_GIT_BRANCH;

    // If env vars available (production deployment), use them
    if (envCommit && envBranch) {
      return {
        branch: envBranch,
        commit: envCommit.substring(0, 7),
        commitFull: envCommit,
        deployTimestamp: new Date().toISOString(),
        isDirty: false, // Production deployments are clean
      };
    }

    // Fallback: try git commands (local development)
    if (existsSync('.git')) {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf8',
      }).trim();

      const commitFull = execSync('git rev-parse HEAD', {
        encoding: 'utf8',
      }).trim();

      const commit = execSync('git rev-parse --short HEAD', {
        encoding: 'utf8',
      }).trim();

      // Check if working directory is dirty
      const status = execSync('git status --porcelain', {
        encoding: 'utf8',
      }).trim();
      const isDirty = status.length > 0;

      // Get last commit timestamp
      const commitTimestamp = execSync('git log -1 --format=%cI', {
        encoding: 'utf8',
      }).trim();

      return {
        branch,
        commit,
        commitFull,
        deployTimestamp: commitTimestamp,
        isDirty,
      };
    }

    // Final fallback: minimal info
    return {
      branch: 'unknown',
      commit: 'unknown',
      commitFull: 'unknown',
      deployTimestamp: new Date().toISOString(),
      isDirty: false,
    };
  } catch (error) {
    console.error('[Health] Failed to get git info:', error);
    return {
      branch: 'error',
      commit: 'error',
      commitFull: 'error',
      deployTimestamp: new Date().toISOString(),
      isDirty: false,
    };
  }
}

/**
 * Git health check verifier
 */
export async function verifyGit(): Promise<GitHealthCheck> {
  const startTime = Date.now();
  const verifiedSources: ('env_var' | 'endpoint_test' | 'code_check')[] = [];

  try {
    const gitInfo = await getGitInfo();

    // Source 1: Environment variable OR git command
    const envVarPresent =
      !!process.env.VERCEL_GIT_COMMIT_SHA ||
      !!process.env.RENDER_GIT_COMMIT ||
      existsSync('.git');
    if (envVarPresent) {
      verifiedSources.push('env_var');
    }

    // Source 2: Git commands work (code check)
    const codePathValid =
      gitInfo.branch !== 'unknown' && gitInfo.commit !== 'unknown';
    if (codePathValid) {
      verifiedSources.push('code_check');
    }

    // Get additional info (tags, behind origin)
    let tagsOnCommit: string[] = [];
    let behindOrigin: number | undefined;

    if (existsSync('.git')) {
      try {
        // Get tags on current commit
        const tagsOutput = execSync(
          `git tag --points-at ${gitInfo.commitFull}`,
          { encoding: 'utf8' }
        ).trim();
        tagsOnCommit = tagsOutput ? tagsOutput.split('\n') : [];

        // Check how many commits behind origin (if tracking branch exists)
        try {
          const behindOutput = execSync(
            `git rev-list --count HEAD..@{u}`,
            { encoding: 'utf8', stdio: 'pipe' }
          ).trim();
          behindOrigin = parseInt(behindOutput, 10);
        } catch {
          // No tracking branch configured, that's okay
        }
      } catch (error) {
        // Non-critical failures
        console.error('[Health] Git additional info failed:', error);
      }
    }

    const responseTimeMs = Date.now() - startTime;

    // Status determination
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let errorMessage: string | undefined;

    if (gitInfo.branch === 'unknown' || gitInfo.commit === 'unknown') {
      status = 'unhealthy';
      errorMessage = 'Cannot determine git branch/commit';
    } else if (gitInfo.isDirty) {
      status = 'degraded';
      errorMessage = 'Working directory has uncommitted changes';
    } else if (behindOrigin && behindOrigin > 0) {
      status = 'degraded';
      errorMessage = `Branch is ${behindOrigin} commit(s) behind origin`;
    }

    return {
      service: 'git',
      status,
      responseTimeMs,
      verifiedSources,
      diagnostics: {
        branch: gitInfo.branch,
        commit: gitInfo.commit,
        commitFull: gitInfo.commitFull,
        isDirty: gitInfo.isDirty,
        deployTimestamp: gitInfo.deployTimestamp,
        behindOrigin,
        tagsOnCommit,
      },
      errorMessage,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      service: 'git',
      status: 'unhealthy',
      responseTimeMs: Date.now() - startTime,
      verifiedSources,
      diagnostics: {
        branch: 'error',
        commit: 'error',
        commitFull: 'error',
        isDirty: false,
        deployTimestamp: new Date().toISOString(),
      },
      errorMessage: `Git check failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Format git info for display (e.g., "main@9feee4a")
 */
export function formatGitInfo(gitInfo: GitInfo): string {
  if (gitInfo.isDirty) {
    return `${gitInfo.branch}@${gitInfo.commit}*`;
  }
  return `${gitInfo.branch}@${gitInfo.commit}`;
}

/**
 * Format deploy time as relative time (e.g., "2h ago")
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
 * Get app version from package.json
 */
export function getAppVersion(): string {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}
