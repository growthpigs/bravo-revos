/**
 * Health Check System - Type Definitions
 *
 * Core types for multi-source health verification
 * Every service must verify from 3 sources: env vars, endpoints, code checks
 */

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export type VerificationSource = 'env_var' | 'endpoint_test' | 'code_check';

export interface HealthCheckResult {
  service: string;
  status: HealthStatus;
  responseTimeMs: number | null; // Null for non-network checks
  verifiedSources: VerificationSource[];
  diagnostics: Record<string, any>; // Flexible diagnostics - each service has different data
  errorMessage?: string;
  timestamp: string;
}

export interface GitInfo {
  branch: string;
  commit: string;
  commitFull: string;
  deployTimestamp: string;
  isDirty: boolean; // Are there uncommitted changes?
}

// Specific health check types (diagnostics are flexible)
export type SupabaseHealthCheck = HealthCheckResult & { service: 'supabase' };
export type RedisHealthCheck = HealthCheckResult & { service: 'redis' };
export type WorkerHealthCheck = HealthCheckResult & { service: 'webhook_worker' | 'engagement_worker' };
export type UniPileHealthCheck = HealthCheckResult & { service: 'unipile' };
export type OpenAIHealthCheck = HealthCheckResult & { service: 'openai' };
export type ResendHealthCheck = HealthCheckResult & { service: 'resend' };
export type EnvVarHealthCheck = HealthCheckResult & { service: 'environment' };
export type GitHealthCheck = HealthCheckResult & { service: 'git' };
export type ConsoleHealthCheck = HealthCheckResult & { service: 'console' };

/**
 * Aggregate health status for the entire system
 */
export interface SystemHealthSnapshot {
  overallStatus: HealthStatus;
  timestamp: string;
  gitInfo: GitInfo;
  services: {
    supabase: SupabaseHealthCheck;
    redis: RedisHealthCheck;
    webhookWorker: WorkerHealthCheck;
    engagementWorker: WorkerHealthCheck;
    unipile: UniPileHealthCheck;
    openai: OpenAIHealthCheck;
    resend: ResendHealthCheck;
    environment: EnvVarHealthCheck;
    git: GitHealthCheck;
    console: ConsoleHealthCheck;
  };
  summary: {
    totalServices: number;
    healthyCount: number;
    degradedCount: number;
    unhealthyCount: number;
    unknownCount: number;
    averageResponseTime: number;
  };
}

/**
 * Historical health data point for graphing
 */
export interface HealthDataPoint {
  timestamp: string;
  status: HealthStatus;
  responseTimeMs: number | null;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  timeoutMs: number; // Max time to wait for response
  retryAttempts: number; // How many times to retry failed checks
  retryDelayMs: number; // Delay between retries
  logToDatabase: boolean; // Whether to store in system_health_log
}

/**
 * Default configuration
 */
export const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  timeoutMs: 5000, // 5 seconds
  retryAttempts: 2,
  retryDelayMs: 1000, // 1 second
  logToDatabase: true,
};

/**
 * Meta-health check result (health check for the health check system)
 */
export interface MetaHealthResult {
  healthCheckSystemOperational: boolean;
  databaseTableExists: boolean;
  apiEndpointReachable: boolean;
  lastCheckRecencyMs: number;
  allVerifiersImplemented: boolean;
  missingVerifiers: string[];
  testSuitesPassing: boolean;
  issues: string[];
}
