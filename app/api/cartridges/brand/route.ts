import { NextRequest, NextResponse } from 'next/server'
import {
  ok,
  okMessage,
  notFound,
  serverError,
  requireAuth,
  parseJsonBody,
} from '@/lib/api'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  // Fetch user's brand cartridge (should only have one)
  const { data, error } = await supabase
    .from('brand_cartridges')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error fetching brand:', error)
    return serverError('Failed to fetch brand')
  }

  // If no brand exists, create default one
  if (!data) {
    const { data: newBrand, error: createError } = await supabase
      .from('brand_cartridges')
      .insert({
        user_id: user.id,
        name: 'My Brand',
        core_values: [],
        brand_personality: [],
        brand_colors: {
          primary: '#000000',
          secondary: '#FFFFFF',
          accent: '#0066CC',
        },
        social_links: {},
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating default brand:', createError)
      return serverError('Failed to create brand')
    }

    return ok({ brand: newBrand })
  }

  return ok({ brand: data })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body
  const brandData = body as Record<string, unknown>

  // Check if user already has a brand
  const { data: existing, error: checkError } = await supabase
    .from('brand_cartridges')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking brand:', checkError)
    return serverError('Failed to check brand')
  }

  let result

  if (existing) {
    // Update existing brand
    const { data, error } = await supabase
      .from('brand_cartridges')
      .update({
        ...brandData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating brand:', error)
      return serverError('Failed to update brand')
    }

    result = data
  } else {
    // Create new brand
    const { data, error } = await supabase
      .from('brand_cartridges')
      .insert({
        user_id: user.id,
        name: brandData.name || 'My Brand',
        company_name: brandData.company_name,
        company_description: brandData.company_description,
        company_tagline: brandData.company_tagline,
        industry: brandData.industry,
        target_audience: brandData.target_audience,
        core_values: brandData.core_values || [],
        brand_voice: brandData.brand_voice,
        brand_personality: brandData.brand_personality || [],
        logo_url: brandData.logo_url,
        brand_colors: brandData.brand_colors || {
          primary: '#000000',
          secondary: '#FFFFFF',
          accent: '#0066CC',
        },
        social_links: brandData.social_links || {},
        core_messaging: brandData.core_messaging,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating brand:', error)
      return serverError('Failed to create brand')
    }

    result = data
  }

  return ok({ brand: result })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body
  const brandData = body as Record<string, unknown>

  // Update brand (user can only have one)
  const { data, error } = await supabase
    .from('brand_cartridges')
    .update({
      ...brandData,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return notFound('Brand not found')
    }

    console.error('[BRAND_PATCH] Error updating brand:', {
      message: error.message,
      code: error.code,
      details: error.details,
    })
    return serverError(`Failed to update brand: ${error.message}`)
  }

  return ok({ brand: data })
}

export async function DELETE() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  // Get brand to find logo
  const { data: brand, error: fetchError } = await supabase
    .from('brand_cartridges')
    .select('logo_url')
    .eq('user_id', user.id)
    .single()

  if (fetchError || !brand) {
    return notFound('Brand not found')
  }

  // Delete logo from storage if exists
  if (brand.logo_url) {
    await supabase.storage.from('brand-assets').remove([brand.logo_url])
  }

  // Delete brand record
  const { error } = await supabase
    .from('brand_cartridges')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting brand:', error)
    return serverError('Failed to delete brand')
  }

  return okMessage('Brand deleted successfully')
}
