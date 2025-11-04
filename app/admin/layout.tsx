import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/admin-sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('*, agencies(*)')
    .eq('id', user.id)
    .single()

  if (!userData || !['agency_admin', 'agency_member'].includes(userData.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar user={userData} agency={userData.agencies} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
