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
import { Plus, Search, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

interface Pod {
  id: string
  client_id: string | null
  name: string
  description: string | null
  min_members: number
  max_members: number
  auto_engage: boolean
  settings: Record<string, any>
  status: 'active' | 'paused'
  created_at: string
  updated_at: string
}

export default function AdminPodsPage() {
  const [pods, setPods] = useState<Pod[]>([])
  const [filteredPods, setFilteredPods] = useState<Pod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [showCreatePodModal, setShowCreatePodModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Create pod form state
  const [podName, setPodName] = useState('')
  const [maxMembers, setMaxMembers] = useState('50')
  const [isCreatingPod, setIsCreatingPod] = useState(false)

  // Edit pod state
  const [editingPod, setEditingPod] = useState<Pod | null>(null)
  const [editPodName, setEditPodName] = useState('')
  const [editPodDescription, setEditPodDescription] = useState('')
  const [editMaxMembers, setEditMaxMembers] = useState('')
  const [isEditingPod, setIsEditingPod] = useState(false)

  // Delete confirmation state
  const [podToDelete, setPodToDelete] = useState<Pod | null>(null)

  // Members management state
  const [podMembers, setPodMembers] = useState<any[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>('')
  const [isAddingMember, setIsAddingMember] = useState(false)

  // Invite new user form state
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFirstName, setInviteFirstName] = useState('')
  const [inviteLastName, setInviteLastName] = useState('')
  const [isInvitingUser, setIsInvitingUser] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadPods()
  }, [])

  useEffect(() => {
    filterPods()
  }, [pods, searchTerm])

  const loadPods = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('pods')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setPods(data || [])
    } catch (error) {
      console.error('Error loading pods:', error)
      toast.error('Failed to load pods')
    } finally {
      setIsLoading(false)
    }
  }

  const filterPods = () => {
    if (!searchTerm) {
      setFilteredPods(pods)
      return
    }

    const search = searchTerm.toLowerCase()
    const filtered = pods.filter(
      (pod) =>
        pod.name.toLowerCase().includes(search) ||
        pod.description?.toLowerCase().includes(search)
    )

    setFilteredPods(filtered)
  }

  const loadPodMembers = async (podId: string) => {
    try {
      setIsLoadingMembers(true)
      // Get current members
      const { data: members, error: membersError } = await supabase
        .from('pod_members')
        .select('id, user_id, users(id, email, first_name, last_name)')
        .eq('pod_id', podId)

      if (membersError) throw membersError

      setPodMembers(members || [])

      // Get available users (not in this pod)
      const memberUserIds = (members || []).map((m: any) => m.user_id)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .not('id', 'in', `(${memberUserIds.join(',')})`)

      if (usersError) throw usersError
      setAvailableUsers(users || [])
    } catch (error) {
      console.error('Error loading pod members:', error)
      toast.error('Failed to load pod members')
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const handleOpenEdit = (pod: Pod) => {
    setEditingPod(pod)
    setEditPodName(pod.name)
    setEditPodDescription(pod.description || '')
    setEditMaxMembers(pod.max_members.toString())
    setShowEditModal(true)
    setShowInviteForm(false)
    setInviteEmail('')
    setInviteFirstName('')
    setInviteLastName('')
    setSelectedUserToAdd('')
    loadPodMembers(pod.id)
  }

  const handleSaveEdit = async () => {
    if (!editingPod) return

    if (!editPodName.trim()) {
      toast.error('Pod name is required')
      return
    }

    setIsEditingPod(true)
    try {
      const { error } = await supabase
        .from('pods')
        .update({
          name: editPodName.trim(),
          description: editPodDescription.trim() || null,
          max_members: parseInt(editMaxMembers) || 50,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPod.id)

      if (error) throw error

      toast.success(`Pod "${editPodName}" updated successfully`)
      setShowEditModal(false)
      setEditingPod(null)
      loadPods()
    } catch (error) {
      console.error('Error updating pod:', error)
      toast.error('Failed to update pod')
    } finally {
      setIsEditingPod(false)
    }
  }

  const handleTogglePodStatus = async (pod: Pod) => {
    try {
      const newStatus = pod.status === 'active' ? 'paused' : 'active'
      const { error } = await supabase
        .from('pods')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', pod.id)

      if (error) throw error

      toast.success(`Pod "${pod.name}" ${newStatus === 'active' ? 'activated' : 'paused'}`)
      loadPods()
    } catch (error) {
      console.error('Error updating pod status:', error)
      toast.error('Failed to update pod status')
    }
  }

  const handleConfirmDelete = async () => {
    if (!podToDelete) return

    try {
      const { error } = await supabase
        .from('pods')
        .delete()
        .eq('id', podToDelete.id)

      if (error) throw error

      toast.success(`Pod "${podToDelete.name}" deleted successfully`)
      setPodToDelete(null)
      setShowDeleteConfirm(false)
      loadPods()
    } catch (error) {
      console.error('Error deleting pod:', error)
      toast.error('Failed to delete pod')
    }
  }

  const handleDeletePod = (pod: Pod) => {
    setPodToDelete(pod)
    setShowDeleteConfirm(true)
  }

  const handleAddExistingUser = async () => {
    if (!editingPod || !selectedUserToAdd) {
      toast.error('Please select a user to add')
      return
    }

    setIsAddingMember(true)
    try {
      const selectedUser = availableUsers.find(u => u.id === selectedUserToAdd)
      if (!selectedUser) {
        toast.error('User not found')
        return
      }

      const { error } = await supabase
        .from('pod_members')
        .insert({
          pod_id: editingPod.id,
          user_id: selectedUserToAdd,
          is_active: true
        })

      if (error) throw error

      toast.success(`${selectedUser.email} added to pod`)
      setSelectedUserToAdd('')
      loadPodMembers(editingPod.id)
    } catch (error) {
      console.error('Error adding user to pod:', error)
      toast.error('Failed to add user to pod')
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleInviteNewUser = async () => {
    if (!editingPod || !inviteEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    setIsInvitingUser(true)
    try {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          firstName: inviteFirstName,
          lastName: inviteLastName,
          podId: editingPod.id // Pass pod_id to auto-add when user accepts
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send invitation')
      }

      const result = await response.json()
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteFirstName('')
      setInviteLastName('')
      setShowInviteForm(false)
    } catch (error) {
      console.error('Error inviting user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation')
    } finally {
      setIsInvitingUser(false)
    }
  }

  const handleRemoveMember = async (podMemberId: string, userEmail: string) => {
    if (!editingPod) return

    try {
      const { error } = await supabase
        .from('pod_members')
        .delete()
        .eq('id', podMemberId)

      if (error) throw error

      toast.success(`${userEmail} removed from pod`)
      loadPodMembers(editingPod.id)
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member')
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
      loadPods()
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pods</h1>
          <p className="text-gray-600 mt-2">
            Manage engagement pods for team amplification
          </p>
        </div>
        <Button onClick={() => setShowCreatePodModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Pod
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search pods by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pod Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredPods.length} of {pods.length} pods
        </span>
        <span>
          Active: {pods.filter(p => p.status === 'active').length} / {pods.length}
        </span>
      </div>

      {/* Pods Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Loading pods...</p>
          </CardContent>
        </Card>
      ) : filteredPods.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No pods found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? 'Try adjusting your search'
                : 'Get started by creating your first pod'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreatePodModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Pod
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
                  <TableHead>Description</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPods.map((pod) => (
                  <TableRow key={pod.id}>
                    <TableCell className="font-medium">
                      <Button
                        variant="ghost"
                        onClick={() => handleOpenEdit(pod)}
                        className="h-auto p-0 text-left font-medium hover:underline"
                      >
                        {pod.name}
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {pod.description || <span className="text-gray-400 italic">No description</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {pod.min_members} - {pod.max_members} members
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={pod.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
                        variant="secondary"
                      >
                        {pod.status === 'active' ? 'Active' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(pod.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePodStatus(pod)}
                          title={pod.status === 'active' ? 'Pause pod' : 'Activate pod'}
                        >
                          {pod.status === 'active' ? '⏸' : '▶'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePod(pod)}
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

      {/* Edit Pod Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Pod</DialogTitle>
            <DialogDescription>
              Update pod information and settings
            </DialogDescription>
          </DialogHeader>

          {editingPod && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editPodName">Pod Name *</Label>
                <Input
                  id="editPodName"
                  value={editPodName}
                  onChange={(e) => setEditPodName(e.target.value)}
                  placeholder="Pod name"
                  disabled={isEditingPod}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPodDescription">Description</Label>
                <Input
                  id="editPodDescription"
                  value={editPodDescription}
                  onChange={(e) => setEditPodDescription(e.target.value)}
                  placeholder="Pod description"
                  disabled={isEditingPod}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editMaxMembers">Max Members</Label>
                <Input
                  id="editMaxMembers"
                  type="number"
                  value={editMaxMembers}
                  onChange={(e) => setEditMaxMembers(e.target.value)}
                  placeholder="50"
                  min="1"
                  max="1000"
                  disabled={isEditingPod}
                />
                <p className="text-xs text-gray-500">
                  Maximum number of members allowed in this pod
                </p>
              </div>

              {/* Members Management Section */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Pod Members ({podMembers.length})</Label>
                  {isLoadingMembers && <span className="text-xs text-gray-500">Loading...</span>}
                </div>

                {/* Current Members List */}
                {podMembers.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                    {podMembers.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{member.users?.email}</div>
                          {member.users?.first_name && (
                            <div className="text-xs text-gray-500">
                              {member.users.first_name} {member.users.last_name || ''}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id, member.users?.email)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 h-7"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {podMembers.length === 0 && !isLoadingMembers && (
                  <p className="text-xs text-gray-500 italic">No members yet</p>
                )}

                {/* Add Existing User Section */}
                <div className="space-y-2">
                  <Label htmlFor="existingUserSelect">Add Existing User</Label>
                  <div className="flex gap-2">
                    <select
                      id="existingUserSelect"
                      value={selectedUserToAdd}
                      onChange={(e) => setSelectedUserToAdd(e.target.value)}
                      disabled={isAddingMember || availableUsers.length === 0}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">
                        {availableUsers.length === 0 ? 'No users available' : 'Select a user...'}
                      </option>
                      {availableUsers.map((user: any) => (
                        <option key={user.id} value={user.id}>
                          {user.email} {user.first_name ? `(${user.first_name} ${user.last_name || ''})` : ''}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={handleAddExistingUser}
                      disabled={isAddingMember || !selectedUserToAdd}
                      size="sm"
                      className="flex-shrink-0"
                    >
                      {isAddingMember ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                </div>

                {/* Invite New User Section */}
                {!showInviteForm ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteForm(true)}
                    className="w-full"
                    size="sm"
                  >
                    + Invite New User
                  </Button>
                ) : (
                  <div className="space-y-2 border rounded-lg p-3 bg-blue-50">
                    <div className="space-y-2">
                      <Label htmlFor="inviteEmail">Email *</Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="user@example.com"
                        disabled={isInvitingUser}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="inviteFirstName">First Name</Label>
                        <Input
                          id="inviteFirstName"
                          value={inviteFirstName}
                          onChange={(e) => setInviteFirstName(e.target.value)}
                          placeholder="John"
                          disabled={isInvitingUser}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inviteLastName">Last Name</Label>
                        <Input
                          id="inviteLastName"
                          value={inviteLastName}
                          onChange={(e) => setInviteLastName(e.target.value)}
                          placeholder="Doe"
                          disabled={isInvitingUser}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowInviteForm(false)
                          setInviteEmail('')
                          setInviteFirstName('')
                          setInviteLastName('')
                        }}
                        disabled={isInvitingUser}
                        size="sm"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleInviteNewUser}
                        disabled={isInvitingUser || !inviteEmail.trim()}
                        size="sm"
                        className="flex-1"
                      >
                        {isInvitingUser ? 'Sending...' : 'Send Invite'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={isEditingPod}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={isEditingPod}>
                  {isEditingPod ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Pod</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{podToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false)
                setPodToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Pod
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
