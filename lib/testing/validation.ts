/**
 * G-02: E2E Test Validation Helpers
 * Utilities for validating test scenarios and system state
 */

import { createClient } from '@/lib/supabase/server';

const LOG_PREFIX = '[E2E_VALIDATION]';

export interface ValidationResult {
  passed: boolean;
  message: string;
  details: Record<string, any>;
  timestamp: string;
}

/**
 * Validate no duplicate activities (idempotency check)
 */
export async function validateNoDuplicateActivities(): Promise<ValidationResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('pod_activities')
      .select('pod_id, post_id')
      .then((result) => {
        // Group and check for duplicates
        const grouped: Record<string, number> = {};
        const duplicates: Array<{ pod_id: string; post_id: string; count: number }> = [];

        result.data?.forEach((activity: any) => {
          const key = `${activity.pod_id}:${activity.post_id}`;
          grouped[key] = (grouped[key] || 0) + 1;
        });

        Object.entries(grouped).forEach(([key, count]) => {
          if (count > 1) {
            const [pod_id, post_id] = key.split(':');
            duplicates.push({ pod_id, post_id, count });
          }
        });

        return {
          data: duplicates,
          error: result.error,
        };
      });

    const passed = !error && (!data || data.length === 0);

    return {
      passed,
      message: passed
        ? 'No duplicate activities found (idempotency verified)'
        : `Found ${data?.length || 0} duplicate activity combinations`,
      details: {
        duplicates: data || [],
        error: error?.message,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Validation failed',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Validate activity status flow (should only be pending/completed/failed)
 */
export async function validateActivityStatusFlow(): Promise<ValidationResult> {
  try {
    const supabase = await createClient();

    const result = await supabase
      .from('pod_activities')
      .select('status');

    const statuses = new Set(result.data?.map((a: any) => a.status) || []);
    const validStatuses = new Set(['pending', 'completed', 'failed', 'scheduled']);
    const invalidStatuses = Array.from(statuses).filter((s) => !validStatuses.has(s));

    const details = {
      statuses: Array.from(statuses),
      invalidStatuses,
      total: result.data?.length || 0,
    };

    const passed = !result.error && !invalidStatuses.length;

    return {
      passed,
      message: passed ? 'All activities have valid status' : 'Found invalid activity statuses',
      details,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Validation failed',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Validate DLQ only contains permanent failures
 */
export async function validateDeadLetterQueue(): Promise<ValidationResult> {
  try {
    const supabase = await createClient();

    const result = await supabase
      .from('pod_activities_dlq')
      .select('error_type');

    const errorTypes = result.data?.map((d: any) => d.error_type) || [];
    const permanentErrors = new Set(['auth_error', 'validation_error', 'not_found']);
    const invalidErrors = errorTypes.filter((e: string) => !permanentErrors.has(e));

    const details = {
      totalDLQEntries: errorTypes.length,
      errorTypeCounts: errorTypes.reduce(
        (acc: Record<string, number>, type: string) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {}
      ),
      invalidErrors,
    };

    const passed = !result.error && !invalidErrors.length;

    return {
      passed,
      message: passed
        ? 'All DLQ entries are permanent failures'
        : 'Found retryable errors in DLQ',
      details,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Validation failed',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Validate success rate is healthy (> 80%)
 */
export async function validateSuccessRate(minRate: number = 80): Promise<ValidationResult> {
  try {
    const supabase = await createClient();

    const result = await supabase
      .from('pod_activities')
      .select('status');

    const all = result.data || [];
    const completed = all.filter((a: any) => a.status === 'completed').length;
    const rate = all.length > 0 ? Math.round((completed / all.length) * 100) : 0;

    const details = {
      total: all.length,
      completed,
      failed: all.filter((a: any) => a.status === 'failed').length,
      pending: all.filter((a: any) => a.status === 'pending').length,
      successRate: rate,
      minRequired: minRate,
    };

    const passed = !result.error && rate >= minRate;

    return {
      passed,
      message: passed
        ? `Success rate ${rate}% meets target (${minRate}%)`
        : `Success rate ${rate}% below target (${minRate}%)`,
      details,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Validation failed',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Validate average execution time
 */
export async function validateExecutionTime(maxMs: number = 5000): Promise<ValidationResult> {
  try {
    const supabase = await createClient();

    const result = await supabase
      .from('pod_activities')
      .select('created_at, executed_at');

    let totalTime = 0;
    let count = 0;

    result.data?.forEach((a: any) => {
      if (a.executed_at && a.created_at) {
        const created = new Date(a.created_at).getTime();
        const executed = new Date(a.executed_at).getTime();
        totalTime += executed - created;
        count++;
      }
    });

    const avgTime = count > 0 ? totalTime / count : 0;

    const details = {
      totalExecuted: count,
      averageMs: Math.round(avgTime),
      maxExpected: maxMs,
    };

    const passed = !result.error && avgTime <= maxMs;

    return {
      passed,
      message: passed
        ? `Average execution time ${Math.round(avgTime)}ms meets target (${maxMs}ms)`
        : `Average execution time ${Math.round(avgTime)}ms exceeds target (${maxMs}ms)`,
      details,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Validation failed',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Run all validations and return summary
 */
export async function runAllValidations(): Promise<{
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  results: ValidationResult[];
}> {
  const results = await Promise.all([
    validateNoDuplicateActivities(),
    validateActivityStatusFlow(),
    validateDeadLetterQueue(),
    validateSuccessRate(),
    validateExecutionTime(),
  ]);

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const failed = total - passed;

  console.log(
    `${LOG_PREFIX} Validation Summary: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)`
  );

  return {
    summary: {
      total,
      passed,
      failed,
      passRate: Math.round((passed / total) * 100),
    },
    results,
  };
}
