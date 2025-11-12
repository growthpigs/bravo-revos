import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Megaphone, Users2, TrendingUp, Zap, Plus } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user?.id || '')
    .single()

  // Get stats
  const { count: campaignsCount } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', userData?.client_id || '')
    .eq('status', 'active')

  const { count: leadsCount } = await supabase
    .from('leads')
    .select('*, campaigns!inner(*)', { count: 'exact', head: true })
    .eq('campaigns.client_id', userData?.client_id || '')

  const { count: conversionsCount } = await supabase
    .from('leads')
    .select('*, campaigns!inner(*)', { count: 'exact', head: true })
    .eq('campaigns.client_id', userData?.client_id || '')
    .eq('status', 'webhook_sent')

  const conversionRate = leadsCount && conversionsCount 
    ? Math.round((conversionsCount / leadsCount) * 100)
    : 0

  const stats = [
    {
      title: 'Active Campaigns',
      value: campaignsCount || 0,
      icon: Megaphone,
      description: 'Currently running',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
    },
    {
      title: 'Total Leads',
      value: leadsCount || 0,
      icon: Users2,
      description: 'All time',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
    },
    {
      title: 'Conversions',
      value: conversionsCount || 0,
      icon: TrendingUp,
      description: 'Delivered to webhook',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
    },
    {
      title: 'Conversion Rate',
      value: `${conversionRate}%`,
      icon: Zap,
      description: 'Lead to conversion',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here is an overview of your campaigns
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-100">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-gray-900">Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <Link href="/dashboard/campaigns/new">
              <Button variant="outline" className="w-full justify-start hover:bg-gray-50">
                <Megaphone className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
            <Link href="/dashboard/lead-magnets">
              <Button variant="outline" className="w-full justify-start hover:bg-gray-50">
                <Plus className="h-4 w-4 mr-2" />
                Upload Lead Magnet
              </Button>
            </Link>
            <Link href="/dashboard/webhooks">
              <Button variant="outline" className="w-full justify-start hover:bg-gray-50">
                <Zap className="h-4 w-4 mr-2" />
                Configure Webhook
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-gray-900">Recent Leads</CardTitle>
            <CardDescription>Latest lead activity</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">No leads yet</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
