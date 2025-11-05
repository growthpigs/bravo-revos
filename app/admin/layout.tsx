import AdminSidebar from '@/components/admin/admin-sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Mock user data for development
  const mockUser = {
    id: '1',
    email: 'admin@example.com',
    role: 'agency_admin',
    agencies: {
      id: '1',
      name: 'Example Agency',
    },
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar user={mockUser} agency={mockUser.agencies} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
