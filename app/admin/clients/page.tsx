import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Users, Megaphone } from 'lucide-react'
import { AddClientModal } from '@/components/admin/add-client-modal'

export const dynamic = 'force-dynamic'

export default async function AdminClientsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('agency_id')
    .eq('id', user?.id || '')
    .single()

  const { data: clients } = await supabase
    .from('clients')
    .select('*, campaigns(count), users(count)')
    .eq('agency_id', userData?.agency_id || '')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-600 mt-2">
            Manage all clients in your agency
          </p>
        </div>
        <AddClientModal />
      </div>

      {clients && clients.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {client.logo_url ? (
                      <Image
                        src={client.logo_url}
                        alt={client.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <p className="text-sm text-slate-500">@{client.slug}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <Users className="h-4 w-4 text-slate-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-slate-900">
                      {(client as any).users?.[0]?.count || 0}
                    </p>
                    <p className="text-xs text-slate-600">Users</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <Megaphone className="h-4 w-4 text-slate-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-slate-900">
                      {(client as any).campaigns?.[0]?.count || 0}
                    </p>
                    <p className="text-xs text-slate-600">Campaigns</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No clients yet
            </h3>
            <p className="text-slate-600 mb-6">
              Add your first client to get started
            </p>
            <AddClientModal />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
