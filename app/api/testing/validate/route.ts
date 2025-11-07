/**
 * G-02: Test Validation API
 * GET /api/testing/validate - Run E2E validation checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAllValidations } from '@/lib/testing/validation';

/**
 * GET /api/testing/validate
 * Runs all E2E validation checks
 * Returns summary and detailed results
 */
export async function GET(request: NextRequest) {
  try {
    const validationResults = await runAllValidations();

    const allPassed = validationResults.summary.failed === 0;

    return NextResponse.json({
      status: 'success',
      production_ready: allPassed,
      summary: validationResults.summary,
      results: validationResults.results.map((result) => ({
        passed: result.passed,
        message: result.message,
        timestamp: result.timestamp,
        details: result.details,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[VALIDATION_API] Error running validations:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
