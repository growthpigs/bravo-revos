'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useHealthStatus } from '@/hooks/use-health-status'
import { RefreshCw, Activity, Users, Building2, Megaphone, Linkedin } from 'lucide-react'

interface SystemHealthClientProps {
  agencyMetrics: {
    clientsCount: number
    campaignsCount: number
    usersCount: number
    linkedinActiveCount: number
    podsPending: number
    podsFailed: number
    podsTotal: number
  }
}

export function SystemHealthClient({ agencyMetrics }: SystemHealthClientProps) {
  const { data, isLoading, refresh } = useHealthStatus()

  const successRate = agencyMetrics.podsTotal > 0
    ? ((agencyMetrics.podsTotal - agencyMetrics.podsFailed) / agencyMetrics.podsTotal * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          onClick={refresh}
          disabled={isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle>Overall System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className={`text-4xl ${getStatusColor(data?.status || 'unknown')}`}>
              ●
            </span>
            <div>
              <div className="text-2xl font-bold uppercase">
                {data?.status || 'UNKNOWN'}
              </div>
              <div className="text-sm text-gray-500">
                Last checked: {data ? new Date(data.checks.timestamp).toLocaleString() : 'Never'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Health Grid (All 12 services) */}
      <Card>
        <CardHeader>
          <CardTitle>Service Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <ServiceCard name="Database" status={data?.checks.database.status} latency={data?.checks.database.latency} />
            <ServiceCard name="Supabase" status={data?.checks.supabase.status} />
            <ServiceCard name="API" status={data?.checks.api.status} />
            <ServiceCard name="AgentKit" status={data?.checks.agentkit.status} />
            <ServiceCard name="Mem0" status={data?.checks.mem0.status} />
            <ServiceCard name="UniPile" status={data?.checks.unipile.status} />
            <ServiceCard name="Console" status={data?.checks.console.status} />
            <ServiceCard name="Cache" status={data?.checks.cache.status} />
            <ServiceCard name="Queue" status={data?.checks.queue.status} />
            <ServiceCard name="Cron" status={data?.checks.cron.status} />
            <ServiceCard name="Webhooks" status={data?.checks.webhooks.status} />
            <ServiceCard name="Email" status={data?.checks.email.status} />
          </div>
        </CardContent>
      </Card>

      {/* Agency Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Clients"
          value={agencyMetrics.clientsCount}
          icon={Building2}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          title="Active Campaigns"
          value={agencyMetrics.campaignsCount}
          icon={Megaphone}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <MetricCard
          title="LinkedIn Accounts"
          value={agencyMetrics.linkedinActiveCount}
          icon={Linkedin}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
        />
        <MetricCard
          title="Pod Success Rate"
          value={`${successRate}%`}
          icon={Activity}
          color="text-green-600"
          bgColor="bg-green-50"
        />
      </div>

      {/* Real-Time Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Activity (Last 24 Hours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ActivityStat
              label="Database Latency"
              value={data?.checks.database.latency ? `${data.checks.database.latency}ms` : 'N/A'}
              status="info"
            />
            <ActivityStat
              label="Pending Pods"
              value={agencyMetrics.podsPending.toString()}
              status={agencyMetrics.podsPending > 10 ? 'warning' : 'success'}
            />
            <ActivityStat
              label="Failed Pods"
              value={agencyMetrics.podsFailed.toString()}
              status={agencyMetrics.podsFailed > 5 ? 'error' : 'success'}
            />
            <ActivityStat
              label="Total Pods"
              value={agencyMetrics.podsTotal.toString()}
              status="info"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ServiceCard({ name, status, latency }: { name: string; status?: string; latency?: number }) {
  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
      <span className="text-sm font-medium text-gray-700">{name}</span>
      <div className="flex items-center gap-2">
        <span className={`text-lg ${getStatusColor(status || 'unknown')}`}>●</span>
        {latency !== undefined && (
          <span className="text-xs text-gray-500">{latency}ms</span>
        )}
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon: Icon, color, bgColor }: {
  title: string
  value: number | string
  icon: any
  color: string
  bgColor: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  )
}

function ActivityStat({ label, value, status }: {
  label: string
  value: string
  status: 'success' | 'warning' | 'error' | 'info'
}) {
  const statusColor = {
    success: 'text-green-600',
    warning: 'text-orange-600',
    error: 'text-red-600',
    info: 'text-blue-600',
  }[status]

  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 mb-1">{label}</span>
      <span className={`text-2xl font-bold ${statusColor}`}>{value}</span>
    </div>
  )
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return 'text-green-500'
    case 'degraded':
      return 'text-orange-500'
    case 'unhealthy':
      return 'text-red-500'
    default:
      return 'text-gray-400'
  }
}
