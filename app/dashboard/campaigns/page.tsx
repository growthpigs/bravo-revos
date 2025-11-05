import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Megaphone, TrendingUp, Users2 } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user?.id || '')
    .single()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('client_id', userData?.client_id || '')
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-emerald-100 text-emerald-700',
    paused: 'bg-amber-100 text-amber-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-slate-100 text-slate-500',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-slate-600 mt-2">
            Manage your LinkedIn lead generation campaigns
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  </div>
                  <Badge className={statusColors[campaign.status]} variant="secondary">
                    {campaign.status}
                  </Badge>
                </div>
                {campaign.description && (
                  <CardDescription className="line-clamp-2">
                    {campaign.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <Users2 className="h-4 w-4 text-slate-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-slate-900">
                      {campaign.total_leads || 0}
                    </p>
                    <p className="text-xs text-slate-600">Leads</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-slate-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-slate-900">
                      {campaign.total_conversions || 0}
                    </p>
                    <p className="text-xs text-slate-600">Conversions</p>
                  </div>
                </div>
                <Link href={`/dashboard/campaigns/${campaign.id}`}>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Megaphone className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No campaigns yet
            </h3>
            <p className="text-slate-600 mb-6">
              Create your first campaign to start generating leads
            </p>
            <Link href="/dashboard/campaigns/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
