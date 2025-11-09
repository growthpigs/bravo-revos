import AdminSidebar from '@/components/admin/admin-sidebar'
import AdminLayoutWrapper from '@/components/admin/admin-layout-wrapper'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

  // Get user's agency info
  const { data: userData } = await supabase
    .from('users')
    .select('id, email, agency_id')
    .eq('id', user.id)
    .single()

  const { data: agencyData } = await supabase
    .from('agencies')
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
