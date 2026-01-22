'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Activity, ExternalLink, X } from 'lucide-react'
import { toast } from 'sonner'

interface PodActivity {
  id: string
  action: string
  status: 'pending' | 'success' | 'failed'
  scheduled_for: string
  executed_at: string | null
  repost_url: string | null
  error_message: string | null
  attempt_number: number
  max_attempts: number
  created_at: string
  updated_at: string
  pod_members: {
    name: string
    linkedin_url: string
  } | null
  posts: {
    post_url: string
    content: string
  } | null
}

type StatusFilter = 'All' | 'pending' | 'success' | 'failed'
type DateRangeFilter = 'Today' | 'Last 7 Days' | 'Last 30 Days' | 'All Time'

export default function ActivityDashboardPage() {
  const [activities, setActivities] = useState<PodActivity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<PodActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('All')
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeFilter>('Last 7 Days')
  const [selectedMember, setSelectedMember] = useState<string>('All')
  const [selectedActivity, setSelectedActivity] = useState<PodActivity | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [availableMembers, setAvailableMembers] = useState<Array<{ id: string; name: string }>>([])

  const supabase = createClient()

  // Initial load and auto-refresh setup
  useEffect(() => {
    fetchActivities()
    const interval = setInterval(() => {
      fetchActivities()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Apply filters when activities or filter values change
  useEffect(() => {
    applyFilters()
  }, [activities, selectedStatus, selectedDateRange, selectedMember])

  const fetchActivities = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('pod_activity')
        .select(`
          *,
          pod_members(name, linkedin_url),
          posts(post_url, content)
        `)
        .order('scheduled_for', { ascending: false })

      if (error) throw error

      // Transform data to handle Supabase's array/object response
      const transformedData = (data || []).map(activity => ({
        ...activity,
        pod_members: Array.isArray(activity.pod_members) && activity.pod_members.length > 0
          ? activity.pod_members[0]
          : null,
        posts: Array.isArray(activity.posts) && activity.posts.length > 0
          ? activity.posts[0]
          : null
      }))

      setActivities(transformedData)
      setLastUpdate(new Date())

      // Extract unique members for filter dropdown
      const uniqueMembers = transformedData
        .filter(a => a.pod_members?.name)
        .reduce((acc, activity) => {
          const member = activity.pod_members!
          if (!acc.find((m: { id: string; name: string }) => m.name === member.name)) {
            // Use a stable ID based on member name for filtering
            acc.push({ id: member.name, name: member.name })
          }
          return acc
        }, [] as Array<{ id: string; name: string }>)

      setAvailableMembers(uniqueMembers)
    } catch (error) {
      console.error('[DEBUG_ACTIVITY] Error loading pod activities:', error)
      toast.error('Failed to load pod activities')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...activities]

    // Status filter
    if (selectedStatus !== 'All') {
      filtered = filtered.filter(a => a.status === selectedStatus)
    }

    // Date range filter
    if (selectedDateRange !== 'All Time') {
      const now = new Date()
      let startDate = new Date()

      switch (selectedDateRange) {
        case 'Today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'Last 7 Days':
          startDate.setDate(now.getDate() - 7)
          break
        case 'Last 30 Days':
          startDate.setDate(now.getDate() - 30)
          break
      }

      filtered = filtered.filter(a => new Date(a.scheduled_for) >= startDate)
    }

    // Member filter
    if (selectedMember !== 'All') {
      filtered = filtered.filter(a => a.pod_members?.name === selectedMember)
    }

    setFilteredActivities(filtered)
  }

  const clearFilters = () => {
    setSelectedStatus('All')
    setSelectedDateRange('Last 7 Days')
    setSelectedMember('All')
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFullDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const truncateUrl = (url: string | null, maxLength = 50) => {
    if (!url) return '-'
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }

  const getStatusBadge = (status: 'pending' | 'success' | 'failed') => {
    const variants = {
      pending: 'secondary' as const,
      success: 'default' as const,
      failed: 'destructive' as const
    }

    const labels = {
      pending: 'Pending',
      success: 'Success',
      failed: 'Failed'
    }

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    )
  }

  const getLastUpdateText = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000)
    if (seconds < 10) return 'Just now'
    if (seconds < 60) return `${seconds} seconds ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }

  const handleManualRefresh = () => {
    fetchActivities()
    toast.success('Activity data refreshed')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pod Activity Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Real-time monitoring of pod repost activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Last updated: {getLastUpdateText()}
          </span>
          <Button onClick={handleManualRefresh} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date Range</label>
              <Select value={selectedDateRange} onValueChange={(value) => setSelectedDateRange(value as DateRangeFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Today">Today</SelectItem>
                  <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
                  <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
                  <SelectItem value="All Time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Member Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Pod Member</label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Members</SelectItem>
                  {availableMembers.map(member => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                onClick={clearFilters}
                variant="outline"
                className="w-full gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(selectedStatus !== 'All' || selectedDateRange !== 'Last 7 Days' || selectedMember !== 'All') && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Active filters:</span>
              {selectedStatus !== 'All' && (
                <Badge variant="secondary">{selectedStatus}</Badge>
              )}
              {selectedDateRange !== 'Last 7 Days' && (
                <Badge variant="secondary">{selectedDateRange}</Badge>
              )}
              {selectedMember !== 'All' && (
                <Badge variant="secondary">{selectedMember}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredActivities.length} of {activities.length} activities
        </span>
        <div className="flex gap-4">
          <span>Pending: {activities.filter(a => a.status === 'pending').length}</span>
          <span>Success: {activities.filter(a => a.status === 'success').length}</span>
          <span>Failed: {activities.filter(a => a.status === 'failed').length}</span>
        </div>
      </div>

      {/* Activities Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No pod activities yet
            </h3>
            <p className="text-gray-600">
              {activities.length === 0
                ? 'Try triggering pod amplification after publishing a post'
                : 'No activities match your current filters'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Post URL</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Executed At</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => (
                  <TableRow
                    key={activity.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedActivity(activity)}
                  >
                    <TableCell className="font-medium">
                      {activity.pod_members?.name || <span className="text-gray-400">Unknown</span>}
                    </TableCell>
                    <TableCell>
                      {activity.posts?.post_url ? (
                        <a
                          href={activity.posts.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {truncateUrl(activity.posts.post_url)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {activity.action}
                      </code>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(activity.status)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDateTime(activity.scheduled_for)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDateTime(activity.executed_at)}
                    </TableCell>
                    <TableCell>
                      {activity.status === 'success' && activity.repost_url ? (
                        <a
                          href={activity.repost_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Repost
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : activity.status === 'failed' && activity.error_message ? (
                        <span className="text-red-600 text-sm truncate block max-w-[200px]">
                          {truncateUrl(activity.error_message, 30)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Details Modal */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
          </DialogHeader>

          {selectedActivity && (
            <div className="space-y-6">
              {/* Status and Action */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedActivity.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Action</label>
                  <div className="mt-1">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {selectedActivity.action}
                    </code>
                  </div>
                </div>
              </div>

              {/* Member Details */}
              <div>
                <label className="text-sm font-medium text-gray-700">Pod Member</label>
                <div className="mt-1">
                  <p className="text-sm font-medium">{selectedActivity.pod_members?.name || 'Unknown'}</p>
                  {selectedActivity.pod_members?.linkedin_url && (
                    <a
                      href={selectedActivity.pod_members.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                    >
                      View LinkedIn Profile
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Post Details */}
              <div>
                <label className="text-sm font-medium text-gray-700">Original Post</label>
                <div className="mt-1">
                  {selectedActivity.posts?.post_url && (
                    <a
                      href={selectedActivity.posts.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
                    >
                      {selectedActivity.posts.post_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {selectedActivity.posts?.content && (
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
                      {selectedActivity.posts.content}
                    </div>
                  )}
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Scheduled For</label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatFullDateTime(selectedActivity.scheduled_for)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Executed At</label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatFullDateTime(selectedActivity.executed_at)}
                  </p>
                </div>
              </div>

              {/* Retry Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Attempt Number</label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedActivity.attempt_number} of {selectedActivity.max_attempts}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Max Attempts</label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedActivity.max_attempts}
                  </p>
                </div>
              </div>

              {/* Result */}
              {selectedActivity.status === 'success' && selectedActivity.repost_url && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Repost URL</label>
                  <a
                    href={selectedActivity.repost_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                  >
                    {selectedActivity.repost_url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {selectedActivity.status === 'failed' && selectedActivity.error_message && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Error Message</label>
                  <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-700 mt-1">
                    {selectedActivity.error_message}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-700">Created At</label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatFullDateTime(selectedActivity.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Updated At</label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatFullDateTime(selectedActivity.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
