/**
 * POST/GET /api/email-extraction
 * Extract email addresses from DM replies
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractEmail, isValidEmail } from '@/lib/email-extraction';
import { createClient } from '@supabase/supabase-js';

/**
 * POST - Extract email from DM reply text
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dmReplyText, leadId } = body;

    // Validate input
    if (!dmReplyText || typeof dmReplyText !== 'string') {
      return NextResponse.json(
        { error: 'dmReplyText is required and must be a string' },
        { status: 400 }
      );
    }

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      );
    }

    // Extract email
    const extractionResult = await extractEmail(dmReplyText);

    // Validate extracted email if found
    if (extractionResult.email && !isValidEmail(extractionResult.email)) {
      console.warn(`[EMAIL_API] Invalid email extracted: ${extractionResult.email}`);
      extractionResult.email = null;
      extractionResult.confidence = 'low';
      extractionResult.score = 0;
      extractionResult.requiresManualReview = true;
    }

    // Update lead in database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update lead status
    const status = extractionResult.email ? 'email_captured' : 'dm_replied';
    const { error: updateError } = await supabase
      .from('lead')
      .update({
        email: extractionResult.email,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (updateError) {
      console.error(`[EMAIL_API] Failed to update lead ${leadId}:`, updateError);
      return NextResponse.json(
        { error: 'Failed to update lead record' },
        { status: 500 }
      );
    }

    // If manual review required, create review queue entry
    if (extractionResult.requiresManualReview) {
      const { error: reviewError } = await supabase
        .from('email_extraction_reviews')
        .insert({
          lead_id: leadId,
          original_text: dmReplyText,
          extracted_email: extractionResult.email,
          confidence: extractionResult.confidence,
          score: extractionResult.score,
          method: extractionResult.method,
          alternative_emails: extractionResult.alternativeEmails,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (reviewError) {
        console.error(`[EMAIL_API] Failed to create review entry:`, reviewError);
      }
    }

    return NextResponse.json({
      status: 'success',
      extraction: extractionResult,
      leadUpdated: true,
      requiresManualReview: extractionResult.requiresManualReview,
    });
  } catch (error) {
    console.error('[EMAIL_API] Extraction error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Extraction failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get manual review queue
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get pending reviews
    const { data: reviews, error } = await supabase
      .from('email_extraction_reviews')
      .select(`
        id,
        lead_id,
        original_text,
        extracted_email,
        confidence,
        score,
        method,
        alternative_emails,
        status,
        created_at,
        leads (id, campaign_id, linkedin_id, linkedin_url)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[EMAIL_API] Failed to fetch reviews:', error);
      return NextResponse.json(
        { error: 'Failed to fetch review queue' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      reviews,
      total: reviews?.length || 0,
    });
  } catch (error) {
    console.error('[EMAIL_API] Fetch error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Fetch failed',
      },
      { status: 500 }
    );
  }
}
