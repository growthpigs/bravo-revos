import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, Filter, Users2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user?.id || '')
    .single()

  const { data: leads } = await supabase
    .from('leads')
    .select('*, campaigns(name)')
    .eq('campaigns.client_id', userData?.client_id || '')
    .order('created_at', { ascending: false })
    .limit(50)

  const statusColors: Record<string, string> = {
    comment_detected: 'bg-blue-100 text-blue-700',
    dm_sent: 'bg-purple-100 text-purple-700',
    email_captured: 'bg-orange-100 text-orange-700',
    webhook_sent: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
          <p className="text-slate-600 mt-2">
            View and manage all your captured leads
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {leads && leads.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
            <CardDescription>
              {leads.length} lead{leads.length !== 1 ? 's' : ''} captured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Campaign
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Company
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Date
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-900">
                        {lead.full_name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {lead.email || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {(lead as any).campaigns?.name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={statusColors[lead.status]}
                          variant="secondary"
                        >
                          {lead.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {lead.company || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Users2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No leads yet
            </h3>
            <p className="text-slate-600 mb-6">
              Leads will appear here once your campaigns are active
            </p>
            <Button>View Campaigns</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
