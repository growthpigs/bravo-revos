/**
 * GET/DELETE /api/linkedin/accounts
 * Get user's LinkedIn accounts or delete a specific account
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectAccount, getAccountStatus } from '@/lib/unipile-client'
import {
  ok,
  badRequest,
  notFound,
  forbidden,
  serverError,
  unauthorized,
} from '@/lib/api'

// Test user IDs for development mode
const DEV_USER_ID = '00000000-0000-0000-0000-000000000003'
const DEV_CLIENT_ID = '00000000-0000-0000-0000-000000000002'

interface ClientCredentials {
  apiKey: string
  dsn: string
}

/**
 * Get user and client IDs, handling development mode
 */
async function getUserContext(request: NextRequest): Promise<
  | { userId: string; clientId: string; supabase: Awaited<ReturnType<typeof createClient>> }
  | NextResponse
> {
  const isDevelopment = process.env.UNIPILE_MOCK_MODE !== 'false'

  if (isDevelopment) {
    console.log('[LINKEDIN_API] Development mode: Using test user and client IDs')
    const supabase = await createClient({ isServiceRole: true })
    return { userId: DEV_USER_ID, clientId: DEV_CLIENT_ID, supabase }
  }

  // Production: authenticate user
  const authSupabase = await createClient({ isServiceRole: false })
  const { data: { user } } = await authSupabase.auth.getUser()

  if (!user) {
    return unauthorized()
  }

  // Use service role for database queries
  const supabase = await createClient({ isServiceRole: true })

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, client_id')
    .eq('email', user.email)
    .single()

  if (userError || !userData) {
    return notFound('User not found')
  }

  return { userId: userData.id, clientId: userData.client_id, supabase }
}

/**
 * Get client's Unipile credentials
 */
async function getClientCredentials(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<ClientCredentials | null | NextResponse> {
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('unipile_api_key, unipile_dsn, unipile_enabled')
    .eq('id', clientId)
    .single()

  if (clientError) {
    console.error('[LINKEDIN_API] Client lookup failed:', clientError)
    return notFound('Client configuration not found')
  }

  if (clientData?.unipile_enabled && clientData?.unipile_api_key) {
    return {
      apiKey: clientData.unipile_api_key,
      dsn: clientData.unipile_dsn || 'https://api3.unipile.com:13344',
    }
  }

  return null
}

// GET - Retrieve all LinkedIn accounts for user
export async function GET(request: NextRequest) {
  const context = await getUserContext(request)
  if (context instanceof NextResponse) return context
  const { userId, clientId, supabase } = context

  const credentials = await getClientCredentials(supabase, clientId)
  if (credentials instanceof NextResponse) return credentials

  // Get all LinkedIn accounts for this user
  console.log('[LINKEDIN_API] Querying accounts with userId:', userId)
  const { data: accounts, error: accountsError } = await supabase
    .from('linkedin_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (accountsError) {
    console.error('Error fetching accounts:', accountsError)
    return serverError('Failed to fetch accounts')
  }

  // Check session status for each account
  const accountsWithStatus = await Promise.all(
    (accounts || []).map(async (account) => {
      try {
        const unipileStatus = await getAccountStatus(
          account.unipile_account_id,
          credentials
        )

        let dbStatus = account.status
        if (unipileStatus.status === 'CREDENTIALS') {
          dbStatus = 'expired'
        } else if (unipileStatus.status === 'DISCONNECTED') {
          dbStatus = 'error'
        }

        if (dbStatus !== account.status) {
          await supabase
            .from('linkedin_accounts')
            .update({ status: dbStatus })
            .eq('id', account.id)
        }

        return {
          ...account,
          status: dbStatus,
          unipile_status: unipileStatus.status,
          profile_data: {
            ...account.profile_data,
            name: unipileStatus.name,
            email: unipileStatus.email,
          },
        }
      } catch (error) {
        console.warn(`Warning: Could not check status for account ${account.id}`)
        return account
      }
    })
  )

  return ok({
    accounts: accountsWithStatus,
    total: accountsWithStatus.length,
  })
}

// DELETE - Disconnect a LinkedIn account
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('id')

  if (!accountId) {
    return badRequest('Missing account ID')
  }

  const context = await getUserContext(request)
  if (context instanceof NextResponse) return context
  const { userId, clientId, supabase } = context

  const credentials = await getClientCredentials(supabase, clientId)
  if (credentials instanceof NextResponse) return credentials

  // Get the account to verify ownership
  const { data: account, error: fetchError } = await supabase
    .from('linkedin_accounts')
    .select('id, user_id, unipile_account_id')
    .eq('id', accountId)
    .single()

  if (fetchError || !account) {
    return notFound('Account not found')
  }

  // Verify user owns this account
  if (account.user_id !== userId) {
    return forbidden('Account does not belong to user')
  }

  // Disconnect from Unipile
  try {
    await disconnectAccount(account.unipile_account_id, credentials)
  } catch (error) {
    console.warn('Could not disconnect from Unipile:', error)
    // Continue with local deletion even if Unipile disconnect fails
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('linkedin_accounts')
    .delete()
    .eq('id', accountId)

  if (deleteError) {
    return serverError('Failed to delete account')
  }

  return ok({
    message: 'LinkedIn account disconnected successfully',
  })
}
