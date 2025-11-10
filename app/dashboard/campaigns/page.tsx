'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Megaphone, Grid3x3, List, Loader } from 'lucide-react'
import { CampaignCardView } from '@/components/dashboard/CampaignCardView'
import { CampaignTableView } from '@/components/dashboard/CampaignTableView'
import Link from 'next/link'

interface Campaign {
  id: string
  name: string
  description?: string
  status: string
  total_leads: number
  total_conversions: number
  created_at: string
  document_count?: number
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/campaigns?limit=100')
        if (res.ok) {
          const data = await res.json()
          const campaignList = data.campaigns || data.data || []

          // Fetch document counts for each campaign
          const campaignsWithDocs = await Promise.all(
            campaignList.map(async (campaign: Campaign) => {
              try {
                const docRes = await fetch(
                  `/api/campaigns/${campaign.id}/documents?limit=1`
                )
                if (docRes.ok) {
                  const docData = await docRes.json()
                  return {
                    ...campaign,
                    document_count: docData.count || 0,
                  }
                }
              } catch (error) {
                console.error('[CAMPAIGNS] Error fetching docs for campaign:', error)
              }
              return campaign
            })
          )

          setCampaigns(campaignsWithDocs)
        }
      } catch (error) {
        console.error('[CAMPAIGNS] Error fetching campaigns:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-2">
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

      {/* View Toggle */}
      {campaigns.length > 0 && (
        <div className="mb-6 flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <span className="text-sm text-gray-600">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        viewMode === 'grid' ? (
          <CampaignCardView campaigns={campaigns} />
        ) : (
          <CampaignTableView campaigns={campaigns} />
        )
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No campaigns yet
            </h3>
            <p className="text-gray-600 mb-6">
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
