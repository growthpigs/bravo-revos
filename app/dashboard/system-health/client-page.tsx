'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useHealthStatus, useHealthBannerVisibility } from '@/hooks/use-health-status'
import { RefreshCw, Eye, EyeOff, Megaphone, Users, Mail, Linkedin } from 'lucide-react'

interface ClientSystemHealthPageProps {
  clientMetrics: {
    campaignsCount: number
    leadsCount: number
    extractionsSuccessRate: string
    linkedinAccountsCount: number
  }
}

export function ClientSystemHealthPage({ clientMetrics }: ClientSystemHealthPageProps) {
  const { data, isLoading, refresh } = useHealthStatus()
  const { isVisible, toggle } = useHealthBannerVisibility()

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-600 mt-2">
            Real-time monitoring of system services and your account metrics
          </p>
        </div>
        <Button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="mb-6">
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
      <Card className="mb-6">
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

      {/* Client-Specific Metrics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Account Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Active Campaigns"
              value={clientMetrics.campaignsCount}
              icon={Megaphone}
              color="text-orange-600"
              bgColor="bg-orange-50"
            />
            <MetricCard
              title="Total Leads"
              value={clientMetrics.leadsCount}
              icon={Users}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <MetricCard
              title="Email Extraction Rate"
              value={`${clientMetrics.extractionsSuccessRate}%`}
              icon={Mail}
              color="text-green-600"
              bgColor="bg-green-50"
            />
            <MetricCard
              title="LinkedIn Accounts"
              value={clientMetrics.linkedinAccountsCount}
              icon={Linkedin}
              color="text-indigo-600"
              bgColor="bg-indigo-50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Health status is displayed in the top banner of all dashboard pages.
            This feature is temporary for development monitoring.
          </p>
          <Button
            variant="outline"
            onClick={toggle}
            className="flex items-center gap-2"
          >
            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {isVisible ? 'Hide' : 'Show'} Top Banner
          </Button>
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

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return 'text-green-600'
    case 'degraded':
      return 'text-orange-600'
    case 'unhealthy':
      return 'text-red-600'
    default:
      return 'text-gray-500'
  }
}
