import AdminSidebar from '@/components/admin/admin-sidebar'
import AdminLayoutWrapper from '@/components/admin/admin-layout-wrapper'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isUserAdmin } from '@/lib/auth/admin-check'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // SECURITY: Verify user is in admin_users table
  const isAdmin = await isUserAdmin(user.id, supabase)
  if (!isAdmin) {
    console.warn('[ADMIN_LAYOUT] Non-admin user attempted admin access:', user.id, user.email)
    redirect('/dashboard') // Redirect non-admins to regular dashboard
  }

  // Get user's agency info
  const { data: userData } = await supabase
    .from('user')
    .select('id, email, agency_id')
    .eq('id', user.id)
    .single()

  const { data: agencyData } = await supabase
    .from('agency')
    .select('id, name')
    .eq('id', userData?.agency_id || '')
    .single()

  const mockUser = {
    id: user.id,
    email: user.email || '',
    role: 'agency_admin',
    agencies: {
      id: agencyData?.id || '',
      name: agencyData?.name || 'Agency',
    },
  }

  return (
    <AdminLayoutWrapper user={mockUser} agency={mockUser.agencies}>
      {children}
    </AdminLayoutWrapper>
  )
}
