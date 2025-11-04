import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/components/dashboard/dashboard-sidebar'

export default async function DashboardLayout({
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
    .select('*, clients(*)')
    .eq('id', user.id)
    .single()

  if (!userData || !['client_admin', 'client_member'].includes(userData.role)) {
    redirect('/admin')
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <DashboardSidebar user={userData} client={userData.clients} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
