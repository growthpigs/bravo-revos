import DashboardSidebar from '@/components/dashboard/dashboard-sidebar'
import { TopBar } from '@/components/TopBar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user's client info
  const { data: userData } = await supabase
    .from('users')
    .select('id, email, client_id')
    .eq('id', user.id)
    .single()

  const { data: clientData } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', userData?.client_id || '')
    .single()

  const userData_obj = {
    id: user.id,
    email: user.email || '',
    role: 'client_admin',
  }

  const clientData_obj = {
    id: clientData?.id || '',
    name: clientData?.name || 'Client',
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Always visible */}
      <div className="w-64 flex-shrink-0">
        <DashboardSidebar user={userData_obj} client={clientData_obj} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {/* Content */}
        <main className="flex-1 overflow-y-auto pt-16 px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
