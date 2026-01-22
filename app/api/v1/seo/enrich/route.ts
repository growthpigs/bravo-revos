/**
 * SEO Enrichment API Route
 *
 * Fetches SEO intelligence from DataForSEO directly for client onboarding.
 * Returns domain metrics and competitors for display in the onboarding modal.
 *
 * Cost: ~$0.02 per enrichment (domain metrics + competitors call)
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { enrichDomainSEO, validateDomain } from '@/lib/audienceos/services/seo-enrichment'

interface SEOEnrichmentRequest {
  domain: string
}

export const POST = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest) => {

  try {
    const body: SEOEnrichmentRequest = await request.json()
    const { domain: rawDomain } = body

    // Validate domain
    const validation = validateDomain(rawDomain)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    if (!validation.domain) {
      // Empty domain - return empty result
      return NextResponse.json({
        success: true,
        domain: '',
        summary: null,
        competitors: [],
        fetched_at: new Date().toISOString(),
      })
    }

    // Call DataForSEO directly via service
    const result = await enrichDomainSEO(validation.domain)

    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (error) {
    console.error('SEO enrichment error:', error)
    return NextResponse.json(
      {
        success: false,
        domain: '',
        summary: null,
        competitors: [],
        fetched_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'SEO enrichment failed',
      },
      { status: 500 }
    )
  }
})
