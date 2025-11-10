'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, Download, Star, Zap } from 'lucide-react'

interface AnalyticsData {
  customMagnetsCount: number
  totalDownloads: number
  mostPopular: { id: string; name: string; download_count: number } | null
  activeCampaignsCount: number
  campaignUsageMap: Record<string, number>
}

interface LeadMagnetAnalyticsProps {
  onDataLoaded?: (data: AnalyticsData) => void
}

export function LeadMagnetAnalytics({ onDataLoaded }: LeadMagnetAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/lead-magnets/analytics')
      if (!response.ok) throw new Error('Failed to load analytics')

      const result = await response.json()
      setData(result.data)

      // Pass data to parent if callback provided
      if (onDataLoaded && result.data) {
        onDataLoaded(result.data)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) return null

  const stats = [
    {
      icon: FileText,
      label: 'Custom Magnets',
      value: data.customMagnetsCount,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      icon: Download,
      label: 'Total Downloads',
      value: data.totalDownloads,
      color: 'text-green-600 bg-green-100'
    },
    {
      icon: Star,
      label: 'Most Popular',
      value: data.mostPopular?.name || 'None',
      subtitle: data.mostPopular ? `${data.mostPopular.download_count} downloads` : '',
      color: 'text-orange-600 bg-orange-100'
    },
    {
      icon: Zap,
      label: 'Active Campaigns',
      value: data.activeCampaignsCount,
      color: 'text-purple-600 bg-purple-100'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((stat, idx) => (
        <Card key={idx} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 truncate">
                  {stat.value}
                </p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">
                    {stat.subtitle}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
