/**
 * POST/GET /api/email-extraction
 * Extract email addresses from DM replies
 *
 * SECURITY: Requires authentication via withAuth wrapper
 */

import { NextResponse } from 'next/server';
import { extractEmail, isValidEmail } from '@/lib/email-extraction';
import { withAuth, type AuthenticatedContext } from '@/lib/api/with-auth';
import { badRequest, serverError } from '@/lib/api/helpers';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

/**
 * POST - Extract email from DM reply text
 * Requires authentication
 */
export const POST = withAuth(async (
  { user }: AuthenticatedContext,
  request: NextRequest
) => {
  const body = await request.json();
  const { dmReplyText, leadId } = body;

  // Validate input
  if (!dmReplyText || typeof dmReplyText !== 'string') {
    return badRequest('dmReplyText is required and must be a string');
  }

  if (!leadId) {
    return badRequest('leadId is required');
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

  // Use service role for database operations (RLS bypass needed for lead updates)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Update lead status
  const status = extractionResult.email ? 'email_captured' : 'dm_replied';
  const { error: updateError } = await supabase
    .from('leads')
    .update({
      email: extractionResult.email,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  if (updateError) {
    console.error(`[EMAIL_API] Failed to update lead ${leadId}:`, updateError);
    return serverError('Failed to update lead record');
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

  return {
    status: 'success',
    extraction: extractionResult,
    leadUpdated: true,
    requiresManualReview: extractionResult.requiresManualReview,
  };
});

/**
 * GET - Get manual review queue
 * Requires authentication
 */
export const GET = withAuth(async ({ user }: AuthenticatedContext) => {
  // Use service role for database operations
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
    return serverError('Failed to fetch review queue');
  }

  return {
    status: 'success',
    reviews,
    total: reviews?.length || 0,
  };
});
