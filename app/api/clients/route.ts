import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  ok,
  badRequest,
  notFound,
  conflict,
  serverError,
  requireAuth,
  parseJsonBody,
} from '@/lib/api'

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user } = auth

  // Use service role client to bypass RLS for database operations
  const supabase = await createClient({ isServiceRole: true })

  // Get user's agency
  let { data: userData, error: userError } = await supabase
    .from('users')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  // If user exists but doesn't have an agency, create one
  if (userData && !userData.agency_id) {
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .insert({
        name: `${user.email?.split('@')[0]}'s Agency`,
        slug: user.email?.split('@')[0] || 'agency',
      })
      .select()
      .single()

    if (agencyError || !agency) {
      console.error('[API_CLIENTS] Error creating agency:', agencyError)
      return serverError('Failed to create agency')
    }

    // Update user with the new agency_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ agency_id: agency.id })
      .eq('id', user.id)

    if (updateError) {
      console.error('[API_CLIENTS] Error updating user:', updateError)
      return serverError('Failed to update user')
    }

    userData = { agency_id: agency.id }
  }

  if (!userData?.agency_id) {
    return notFound('Agency not found')
  }

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  const { name, slug } = body as { name?: string; slug?: string }

  if (!name || !slug) {
    return badRequest('Name and slug are required')
  }

  // Create client
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name,
      slug,
      agency_id: userData.agency_id,
    })
    .select()
    .single()

  if (error) {
    console.error('[API_CLIENTS] Database error:', error)

    // Handle duplicate key violations specifically
    if (error.code === '23505') {
      if (error.message.includes('clients_agency_id_name_key')) {
        return conflict('A client with this name already exists in your agency')
      }
      if (error.message.includes('idx_clients_agency_slug')) {
        return conflict('A client with this URL slug already exists')
      }
    }

    return serverError('Failed to create client')
  }

  // Revalidate the admin clients page cache so the UI updates immediately
  revalidatePath('/admin/clients')

  return ok({ client })
}
