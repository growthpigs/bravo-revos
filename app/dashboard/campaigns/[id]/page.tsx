import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Megaphone,
  FileText,
  MessageSquare,
  Webhook,
  TrendingUp,
  Users2,
  Target,
  Gift,
  ExternalLink,
  Edit,
  Trash2,
  Pause,
  Play,
  Link as LinkIcon
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CampaignActions from '@/components/dashboard/campaign-actions'
import { CampaignPostsSection } from '@/components/dashboard/CampaignPostsSection'
import { CampaignDocumentsSection } from '@/components/dashboard/CampaignDocumentsSection'
import { TriggerPodButton } from '@/components/dashboard/trigger-pod-button'
import { RepostButton } from '@/components/dashboard/repost-button'
import { PollCommentsButton } from '@/components/dashboard/poll-comments-button'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: {
    id: string
  }
}

export default async function CampaignDetailsPage({ params }: PageProps) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return notFound()
  }

  // Get user's client_id
  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (!userData?.client_id) {
    return notFound()
  }

  // Fetch campaign
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', params.id)
    .eq('client_id', userData.client_id)
    .single()

  if (error || !campaign) {
    return notFound()
  }

  // Fetch related lead magnet library data if exists
  let libraryMagnet = null
  if (campaign.library_magnet_id) {
    const { data } = await supabase
      .from('lead_magnet_library')
      .select('*')
      .eq('id', campaign.library_magnet_id)
      .single()
    libraryMagnet = data
  }

  // Fetch related webhook config if exists
  let webhookConfig = null
  if (campaign.webhook_config_id) {
    const { data } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('id', campaign.webhook_config_id)
      .single()
    webhookConfig = data
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-emerald-100 text-emerald-700',
    paused: 'bg-amber-100 text-amber-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-500',
  }

  // Parse trigger words - supports new JSONB array and legacy comma-separated string
  const triggerWords = (() => {
    // Try new JSONB array format first
    if (campaign.trigger_words && Array.isArray(campaign.trigger_words)) {
      return campaign.trigger_words
        .map((item: any) => {
          // Handle JSONB stringified values (e.g., '"GUIDE"')
          const str = typeof item === 'string' ? item : JSON.stringify(item);
          return str.replace(/^["']|["']$/g, '').trim();
        })
        .filter((word: string) => word.length > 0);
    }

    // Fall back to legacy TEXT comma-separated format
    if (campaign.trigger_word && typeof campaign.trigger_word === 'string') {
      return campaign.trigger_word
        .split(',')
        .map((w: string) => w.trim())
        .filter(Boolean);
    }

    return [];
  })()

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/campaigns">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Megaphone className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              {campaign.description && (
                <p className="text-gray-600 mt-1">{campaign.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Created {new Date(campaign.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={statusColors[campaign.status]} variant="secondary">
              {campaign.status}
            </Badge>
            {campaign.last_post_url && (
              <a
                href={campaign.last_post_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  View Post
                </Button>
              </a>
            )}
            <RepostButton
              campaignId={campaign.id}
              campaignName={campaign.name}
              postTemplate={campaign.post_template}
              triggerWord={campaign.trigger_word}
            />
            <PollCommentsButton
              campaignId={campaign.id}
              campaignName={campaign.name}
            />
            <TriggerPodButton
              campaignId={campaign.id}
              campaignName={campaign.name}
              lastPostUrl={campaign.last_post_url}
              podId={campaign.pod_id}
            />
            <CampaignActions campaignId={campaign.id} currentStatus={campaign.status} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users2 className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.total_leads || 0}</div>
            <p className="text-xs text-gray-600 mt-1">People who engaged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Target className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.total_conversions || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Emails collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.total_leads > 0
                ? `${Math.round((campaign.total_conversions || 0) / campaign.total_leads * 100)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-gray-600 mt-1">Lead to conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Posts Section - Posts to publish */}
      <div className="mb-8">
        <CampaignPostsSection campaignId={campaign.id} />
      </div>

      {/* Knowledge Base Documents Section - Reference materials */}
      <div className="mb-8">
        <CampaignDocumentsSection campaignId={campaign.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead Magnet Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-blue-600" />
              <CardTitle>Lead Magnet</CardTitle>
            </div>
            <CardDescription>
              {campaign.lead_magnet_source === 'library'
                ? 'From Library'
                : campaign.lead_magnet_source === 'custom'
                ? 'Custom Upload'
                : 'None'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaign.lead_magnet_source === 'library' && libraryMagnet && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Title</p>
                  <p className="text-gray-900">{libraryMagnet.title}</p>
                </div>
                {libraryMagnet.category && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Category</p>
                    <Badge variant="secondary">{libraryMagnet.category}</Badge>
                  </div>
                )}
                {libraryMagnet.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                    <p className="text-sm text-gray-600">{libraryMagnet.description}</p>
                  </div>
                )}
                {libraryMagnet.url && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Resource URL</p>
                    <a
                      href={libraryMagnet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View Resource
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </>
            )}
            {campaign.lead_magnet_source === 'custom' && (
              <div>
                <p className="text-sm text-gray-600">Custom lead magnet details</p>
              </div>
            )}
            {campaign.lead_magnet_source === 'none' && (
              <div>
                <p className="text-sm text-gray-600">No lead magnet configured for this campaign</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Post Content Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle>Post Content</CardTitle>
            </div>
            <CardDescription>LinkedIn post template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaign.last_post_url && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm font-medium text-emerald-900 mb-2">Published Post</p>
                <a
                  href={campaign.last_post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 hover:underline flex items-center gap-1 break-all"
                >
                  View on LinkedIn
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Post Template</p>
              <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                {campaign.post_template || 'No post content configured'}
              </div>
            </div>
            {triggerWords.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Trigger Words</p>
                <div className="flex flex-wrap gap-2">
                  {triggerWords.map((word: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {word}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DM Sequence Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <CardTitle>DM Sequence</CardTitle>
            </div>
            <CardDescription>Automated direct message templates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">DM 1 - Email Request</p>
              <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                {campaign.dm_template_step1 || 'No DM template configured'}
              </div>
            </div>
            {campaign.dm_template_step2 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">DM 2 - 5-min Fallback</p>
                <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                  {campaign.dm_template_step2}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-blue-600" />
              <CardTitle>Webhook Integration</CardTitle>
            </div>
            <CardDescription>ESP delivery configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {webhookConfig ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant={webhookConfig.active ? 'default' : 'secondary'}>
                    {webhookConfig.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline">{webhookConfig.esp_type}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Webhook Name</p>
                  <p className="text-sm text-gray-900">{webhookConfig.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Endpoint URL</p>
                  <p className="text-sm text-gray-600 font-mono break-all">
                    {webhookConfig.url.substring(0, 40)}...
                  </p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm text-gray-600">No webhook configured for this campaign</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
