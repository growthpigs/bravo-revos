import { NextRequest, NextResponse } from 'next/server'
import {
  ok,
  okMessage,
  badRequest,
  notFound,
  serverError,
  requireAuth,
  parseJsonBody,
} from '@/lib/api'

interface TrainingDoc {
  file_path: string
}

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  // Fetch user's instruction cartridges
  const { data, error } = await supabase
    .from('instruction_cartridges')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[INSTR_API] Database error:', error)
    return serverError('Failed to fetch instruction cartridges')
  }

  return ok({ cartridges: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  const { name, description } = body as { name?: string; description?: string }

  if (!name) {
    return badRequest('Name is required')
  }

  // Generate Mem0 namespace
  const mem0Namespace = `instructions::marketing::${user.id}`

  // Create instruction cartridge
  const { data, error } = await supabase
    .from('instruction_cartridges')
    .insert({
      user_id: user.id,
      name,
      description,
      mem0_namespace: mem0Namespace,
      process_status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[INSTR_API] Error creating:', error)
    return serverError('Failed to create instruction cartridge')
  }

  return ok({ cartridge: data })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  const { id, ...updates } = body as { id?: string } & Record<string, unknown>

  if (!id) {
    return badRequest('Cartridge ID is required')
  }

  // Update instruction cartridge
  const { data, error } = await supabase
    .from('instruction_cartridges')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[INSTR_API] Error updating:', error)
    return serverError('Failed to update instruction cartridge')
  }

  if (!data) {
    return notFound('Cartridge not found')
  }

  return ok({ cartridge: data })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return badRequest('Cartridge ID is required')
  }

  // First, get the cartridge to find associated files
  const { data: cartridge, error: fetchError } = await supabase
    .from('instruction_cartridges')
    .select('training_docs')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !cartridge) {
    return notFound('Cartridge not found')
  }

  // Delete associated files from storage
  if (cartridge.training_docs && cartridge.training_docs.length > 0) {
    const filePaths = (cartridge.training_docs as TrainingDoc[]).map(
      (doc) => doc.file_path
    )
    await supabase.storage.from('instruction-documents').remove(filePaths)
  }

  // Delete instruction cartridge
  const { error } = await supabase
    .from('instruction_cartridges')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[INSTR_API] Error deleting:', error)
    return serverError('Failed to delete instruction cartridge')
  }

  return okMessage('Instruction cartridge deleted successfully')
}