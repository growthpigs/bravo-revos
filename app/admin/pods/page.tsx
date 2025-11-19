'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, Edit, Trash2, Users, ExternalLink, Mail, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AddPodMemberModal } from '@/components/admin/AddPodMemberModal'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Switch } from '@/components/ui/switch'
import { activatePodMember, resendPodInvite } from './actions'

interface PodMember {
  id: string
  client_id: string
  user_id: string
  name: string
  linkedin_url: string
  unipile_account_id: string | null
  is_active: boolean
  onboarding_status: string
  invite_token: string | null
  invite_sent_at: string | null
  last_activity_at: string | null
  created_at: string
  updated_at: string
  clients?: { name: string; id: string } | null
}

export default function AdminPodsPage() {
  const [members, setMembers] = useState<PodMember[]>([])
  const [filteredMembers, setFilteredMembers] = useState<PodMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCreatePodModal, setShowCreatePodModal] = useState(false)
  const [editingMember, setEditingMember] = useState<PodMember | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<PodMember | null>(null)

  // Create pod form state
  const [podName, setPodName] = useState('')
  const [maxMembers, setMaxMembers] = useState('50')
  const [isCreatingPod, setIsCreatingPod] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadMembers()
  }, [])

  useEffect(() => {
    filterMembers()
  }, [members, searchTerm])

  const loadMembers = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('pod_members')
        .select(`
          *,
          clients (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform: Supabase returns clients as array, we need single object
      const transformedData = (data || []).map(member => ({
        ...member,
        clients: Array.isArray(member.clients) && member.clients.length > 0
          ? member.clients[0]
          : null
      }))

      setMembers(transformedData)
    } catch (error) {
      console.error('Error loading pod members:', error)
      toast.error('Failed to load pod members')
    } finally {
      setIsLoading(false)
    }
  }

  const filterMembers = () => {
    if (!searchTerm) {
      setFilteredMembers(members)
      return
    }

    const search = searchTerm.toLowerCase()
    const filtered = members.filter(
      (member) =>
        member.name.toLowerCase().includes(search) ||
        member.linkedin_url.toLowerCase().includes(search) ||
        member.unipile_account_id?.toLowerCase().includes(search) ||
        member.clients?.name.toLowerCase().includes(search)
    )

    setFilteredMembers(filtered)
  }

  const handleActivateMember = async (member: PodMember) => {
    try {
      const result = await activatePodMember(member.id)

      if (result.success) {
        toast.success(`Activated ${member.name}`)
        loadMembers()
      } else {
        toast.error(result.error || 'Failed to activate member')
      }
    } catch (error: any) {
      console.error('Error activating member:', error)
      toast.error(error.message || 'Failed to activate member')
    }
  }

  const handleResendInvite = async (member: PodMember) => {
    try {
      const result = await resendPodInvite(member.id)

      if (result.success) {
        toast.success(`Invite resent to ${member.name}`)
        if (result.inviteUrl) {
          console.log('[RESEND_INVITE] URL:', result.inviteUrl)
        }
      } else {
        toast.error(result.error || 'Failed to resend invite')
      }
    } catch (error: any) {
      console.error('Error resending invite:', error)
      toast.error(error.message || 'Failed to resend invite')
    }
  }

  const handleCreatePod = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('[POD_CREATE] Form submission started:', {
      podName,
      maxMembers,
      timestamp: new Date().toISOString(),
    })

    if (!podName.trim()) {
      console.warn('[POD_CREATE] Validation failed: pod name is empty')
      toast.error('Pod name is required')
      return
    }

    console.log('[POD_CREATE] Validation passed, attempting API call:', {
      podName: podName.trim(),
      maxMembers: parseInt(maxMembers) || 50,
    })

    setIsCreatingPod(true)
    try {
      const payload = {
        name: podName.trim(),
        max_members: parseInt(maxMembers) || 50
      }

      console.log('[POD_CREATE] Sending POST request to /api/admin/pods:', {
        method: 'POST',
        headers: 'Content-Type: application/json',
        body: payload,
      })

      const response = await fetch('/api/admin/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      console.log('[POD_CREATE] API Response received:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        ok: response.ok,
      })

      const result = await response.json()

      console.log('[POD_CREATE] Response body parsed:', {
        success: result.success,
        hasError: !!result.error,
        errorMessage: result.error,
        hasPodData: !!result.pod,
        podData: result.pod ? {
          id: result.pod.id,
          name: result.pod.name,
          maxMembers: result.pod.maxMembers,
          status: result.pod.status,
        } : null,
      })

      if (!response.ok) {
        const errorMsg = result.error || 'Failed to create pod'
        console.error('[POD_CREATE] Request failed:', {
          status: response.status,
          error: errorMsg,
        })
        throw new Error(errorMsg)
      }

      console.log('[POD_CREATE] ✅ Pod created successfully:', {
        podId: result.pod?.id,
        podName: result.pod?.name,
      })

      toast.success(`Pod "${result.pod.name}" created successfully`)
      setPodName('')
      setMaxMembers('50')
      setShowCreatePodModal(false)
      // Optionally reload members or update state here if needed
    } catch (error: any) {
      console.error('[POD_CREATE] ❌ Exception occurred:', {
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack,
      })
      toast.error(error.message || 'Failed to create pod')
    } finally {
      setIsCreatingPod(false)
      console.log('[POD_CREATE] Request completed, cleanup done')
    }
  }

  const handleOpenAdd = () => {
    setEditingMember(null)
    setShowAddModal(true)
  }

  const handleOpenEdit = (member: PodMember) => {
    setEditingMember(member)
    setShowAddModal(true)
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setEditingMember(null)
  }

  const handleSaveSuccess = () => {
    loadMembers()
    handleCloseModal()
  }

  const handleToggleActive = async (member: PodMember) => {
    try {
      const { error } = await supabase
        .from('pod_members')
        .update({
          is_active: !member.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', member.id)

      if (error) throw error

      toast.success(
        member.is_active
          ? `Deactivated ${member.name}`
          : `Activated ${member.name}`
      )
      loadMembers()
    } catch (error) {
      console.error('Error toggling member status:', error)
      toast.error('Failed to update member status')
    }
  }

  const handleDeleteMember = async () => {
    if (!memberToDelete) return

    try {
      const { error } = await supabase
        .from('pod_members')
        .delete()
        .eq('id', memberToDelete.id)

      if (error) throw error

      toast.success(`Deleted ${memberToDelete.name}`)
      setMemberToDelete(null)
      loadMembers()
    } catch (error) {
      console.error('Error deleting member:', error)
      toast.error('Failed to delete member')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getOnboardingStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-700" variant="secondary">
            Active
          </Badge>
        )
      case 'unipile_connected':
        return (
          <Badge className="bg-blue-100 text-blue-700" variant="secondary">
            Pending Activation
          </Badge>
        )
      case 'password_set':
        return (
          <Badge className="bg-yellow-100 text-yellow-700" variant="secondary">
            Password Set
          </Badge>
        )
      case 'invited':
        return (
          <Badge className="bg-purple-100 text-purple-700" variant="secondary">
            Invited
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700" variant="secondary">
            {status}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pod Members</h1>
          <p className="text-gray-600 mt-2">
            Manage team members who participate in pod amplification
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreatePodModal(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Pod
          </Button>
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, LinkedIn URL, or Unipile account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Member Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredMembers.length} of {members.length} pod members
        </span>
        <span>
          Active: {members.filter(m => m.is_active).length} / {members.length}
        </span>
      </div>

      {/* Members Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Loading pod members...</p>
          </CardContent>
        </Card>
      ) : filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No pod members found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? 'Try adjusting your search'
                : 'Get started by adding your first pod member'}
            </p>
            {!searchTerm && (
              <Button onClick={handleOpenAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Member
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>LinkedIn</TableHead>
                  <TableHead>Unipile Account</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Onboarding Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>
                      <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                      >
                        View Profile
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      {member.unipile_account_id ? (
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {member.unipile_account_id}
                        </code>
                      ) : (
                        <span className="text-gray-400 text-xs">Not connected</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.clients?.name || (
                        <span className="text-gray-400">No client</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getOnboardingStatusBadge(member.onboarding_status)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={member.is_active}
                        onCheckedChange={() => handleToggleActive(member)}
                        disabled={member.onboarding_status !== 'active'}
                        aria-label="Toggle active status"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Show Activate button for members with Unipile connected */}
                        {member.onboarding_status === 'unipile_connected' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleActivateMember(member)}
                            className="gap-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Activate
                          </Button>
                        )}

                        {/* Show Resend Invite button for invited members */}
                        {member.onboarding_status === 'invited' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvite(member)}
                            className="gap-1"
                          >
                            <Mail className="h-4 w-4" />
                            Resend
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(member)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMemberToDelete(member)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <AddPodMemberModal
        open={showAddModal}
        onClose={handleCloseModal}
        onSuccess={handleSaveSuccess}
        editingMember={editingMember}
      />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!memberToDelete}
        onOpenChange={(open) => !open && setMemberToDelete(null)}
        onConfirm={handleDeleteMember}
        title="Delete Pod Member"
        description={
          memberToDelete
            ? `Are you sure you want to delete ${memberToDelete.name}? This will also delete all their pod activities. This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        variant="destructive"
      />

      {/* Create Pod Modal */}
      <Dialog open={showCreatePodModal} onOpenChange={setShowCreatePodModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Pod</DialogTitle>
            <DialogDescription>
              Create a new pod for team amplification and engagement
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePod} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="podName">Pod Name *</Label>
              <Input
                id="podName"
                value={podName}
                onChange={(e) => setPodName(e.target.value)}
                placeholder="e.g., Marketing Team Pod"
                disabled={isCreatingPod}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxMembers">Max Members</Label>
              <Input
                id="maxMembers"
                type="number"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                placeholder="50"
                min="1"
                max="1000"
                disabled={isCreatingPod}
              />
              <p className="text-xs text-gray-500">
                Maximum number of members allowed in this pod
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreatePodModal(false)}
                disabled={isCreatingPod}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingPod}>
                {isCreatingPod ? 'Creating...' : 'Create Pod'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
