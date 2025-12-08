import { NextRequest, NextResponse } from 'next/server'
import {
  ok,
  okMessage,
  badRequest,
  notFound,
  requireAuth,
  parseJsonBody,
} from '@/lib/api'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const { id: campaignId } = await params

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  // Update campaign - RLS ensures user can only update their own
  const { data: updated, error: updateError } = await supabase
    .from('campaigns')
    .update(body as Record<string, unknown>)
    .eq('id', campaignId)
    .select()
    .single()

  if (updateError) {
    return badRequest(`Failed to update campaign: ${updateError.message}`)
  }

  return ok({ campaign: updated })
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const { id: campaignId } = await params

  // First fetch to get webhook_config_id - RLS ensures we can only see our own
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, webhook_config_id')
    .eq('id', campaignId)
    .single()

  if (!campaign) {
    return notFound('Campaign not found')
  }

  // Delete webhook config if exists
  if (campaign.webhook_config_id) {
    await supabase
      .from('webhook_configs')
      .delete()
      .eq('id', campaign.webhook_config_id)
  }

  // Delete campaign - RLS ensures user can only delete their own
  const { error: deleteError } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId)

  if (deleteError) {
    return badRequest(`Failed to delete campaign: ${deleteError.message}`)
  }

  return okMessage('Campaign deleted successfully')
}
