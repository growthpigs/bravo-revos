import { NextRequest, NextResponse } from 'next/server';
import { dmScraperChip } from '@/lib/chips/dm-scraper';

/**
 * POST /api/dm-scraper/test
 * Test endpoint for DMScraperChip
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, campaignId, minConfidence } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    // Execute the chip
    const result = await dmScraperChip.execute({
      accountId,
      campaignId,
      minConfidence: minConfidence || 0.7,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[DMScraperChip Test] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dm-scraper/test
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    chip: {
      id: dmScraperChip.id,
      name: dmScraperChip.name,
      description: dmScraperChip.description,
    },
    tool: dmScraperChip.getTool(),
  });
}
