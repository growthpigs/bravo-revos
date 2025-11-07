'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, Filter, Users2, Search, X, Eye, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  company: string
  title: string
  linkedin_url: string
  linkedin_id: string
  status: string
  created_at: string
  campaign_id: string
  campaigns?: { name: string }
}

interface FilterOptions {
  status: string
  campaign: string
  dateFrom: string
  dateTo: string
  searchTerm: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    campaign: '',
    dateFrom: '',
    dateTo: '',
    searchTerm: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  // Fetch leads and campaigns
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        const { data: userData } = await supabase
          .from('users')
          .select('client_id')
          .eq('id', user?.id || '')
          .single()

        // Fetch campaigns
        const { data: campaignsData } = await supabase
          .from('campaigns')
          .select('id, name')
          .eq('client_id', userData?.client_id || '')
          .order('created_at', { ascending: false })

        // Fetch leads
        const { data: leadsData } = await supabase
          .from('leads')
          .select('*, campaigns(name)')
          .eq('campaigns.client_id', userData?.client_id || '')
          .order('created_at', { ascending: false })
          .limit(100)

        setCampaigns(campaignsData || [])
        setLeads(leadsData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  const statusColors: Record<string, string> = {
    comment_detected: 'bg-blue-100 text-blue-700',
    dm_sent: 'bg-purple-100 text-purple-700',
    email_captured: 'bg-orange-100 text-orange-700',
    webhook_sent: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
  }

  const statusLabels: Record<string, string> = {
    comment_detected: '💬 Comment Detected',
    dm_sent: '📨 DM Sent',
    email_captured: '✉️ Email Captured',
    webhook_sent: '✅ Webhook Sent',
    failed: '❌ Failed',
  }

  // Filter leads based on selected filters
  useEffect(() => {
    let result = leads

    // Status filter
    if (filters.status) {
      result = result.filter(lead => lead.status === filters.status)
    }

    // Campaign filter
    if (filters.campaign) {
      result = result.filter(lead => lead.campaign_id === filters.campaign)
    }

    // Date range filter
    if (filters.dateFrom) {
      result = result.filter(lead => new Date(lead.created_at) >= new Date(filters.dateFrom))
    }
    if (filters.dateTo) {
      const dateToEnd = new Date(filters.dateTo)
      dateToEnd.setHours(23, 59, 59, 999)
      result = result.filter(lead => new Date(lead.created_at) <= dateToEnd)
    }

    // Search filter (name, email, company, LinkedIn)
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      result = result.filter(lead => {
        const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase()
        return (
          fullName.includes(term) ||
          (lead.email?.toLowerCase().includes(term)) ||
          (lead.company?.toLowerCase().includes(term)) ||
          (lead.linkedin_url?.toLowerCase().includes(term))
        )
      })
    }

    setFilteredLeads(result)
  }, [leads, filters])

  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      alert('No leads to export')
      return
    }

    const headers = ['Name', 'Email', 'Company', 'Title', 'Campaign', 'Status', 'LinkedIn URL', 'Date']
    const rows = filteredLeads.map(lead => [
      `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      lead.email || '',
      lead.company || '',
      lead.title || '',
      (lead.campaigns as any)?.name || '',
      lead.status,
      lead.linkedin_url || '',
      new Date(lead.created_at).toLocaleDateString(),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleResetFilters = () => {
    setFilters({
      status: '',
      campaign: '',
      dateFrom: '',
      dateTo: '',
      searchTerm: '',
    })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
          <p className="text-slate-600 mt-2">
            View and manage all your captured leads ({filteredLeads.length} of {leads.length})
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="mb-6 bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Name, email, company..."
                    className="pl-8"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Status</Label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Statuses</option>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Campaign */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Campaign</Label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  value={filters.campaign}
                  onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
                >
                  <option value="">All Campaigns</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">From Date</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="text-sm"
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">To Date</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Reset Filters Button */}
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                <X className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leads Table */}
      {filteredLeads && filteredLeads.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
            <CardDescription>
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} {filters.searchTerm || filters.status || filters.campaign ? 'matching filters' : 'captured'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Campaign</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Company</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-900 font-medium">{`${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown'}</td>
                      <td className="py-3 px-4 text-slate-600">{lead.email || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{(lead.campaigns as any)?.name || '-'}</td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[lead.status]} variant="secondary">
                          {statusLabels[lead.status]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{lead.company || '-'}</td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : leads.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No leads yet</h3>
            <p className="text-slate-600">Leads will appear here once your campaigns are active</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Users2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No results</h3>
            <p className="text-slate-600">No leads match your filters. Try adjusting your search.</p>
          </CardContent>
        </Card>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-white border-b p-6">
              <h2 className="text-xl font-bold text-slate-900">Lead Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLead(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Profile Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Profile Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600 uppercase">Full Name</Label>
                    <p className="text-slate-900 font-medium mt-1">{`${selectedLead.first_name || ''} ${selectedLead.last_name || ''}`.trim() || 'Unknown'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 uppercase">Email</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-slate-900 font-medium break-all">{selectedLead.email || '-'}</p>
                      {selectedLead.email && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedLead.email)
                          }}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 uppercase">Company</Label>
                    <p className="text-slate-900 font-medium mt-1">{selectedLead.company || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 uppercase">Title</Label>
                    <p className="text-slate-900 font-medium mt-1">{selectedLead.title || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Campaign & Status */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="font-semibold text-slate-900">Campaign & Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600 uppercase">Campaign</Label>
                    <p className="text-slate-900 font-medium mt-1">{(selectedLead.campaigns as any)?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 uppercase">Status</Label>
                    <Badge className={`${statusColors[selectedLead.status]} mt-1`} variant="secondary">
                      {statusLabels[selectedLead.status]}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* LinkedIn Profile */}
              {selectedLead.linkedin_url && (
                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-semibold text-slate-900">LinkedIn Profile</h3>
                  <a
                    href={selectedLead.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline break-all text-sm"
                  >
                    {selectedLead.linkedin_url}
                  </a>
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="font-semibold text-slate-900">Timeline</h3>
                <div className="text-sm text-slate-600">
                  <p>Captured on {new Date(selectedLead.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 border-t pt-6">
                {selectedLead.linkedin_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedLead.linkedin_url, '_blank')}
                  >
                    View on LinkedIn
                  </Button>
                )}
                {selectedLead.email && (
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = `mailto:${selectedLead.email}`}
                  >
                    Send Email
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
