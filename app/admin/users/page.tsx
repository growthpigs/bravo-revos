'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Edit, UserCircle, Mail, Building2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: 'user' | 'super_admin'
  client_id: string | null
  pod_members?: Array<{ id: string; pods: { name: string }[] }>
  last_login_at: string | null
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'user' as 'user' | 'super_admin',
    client_id: ''
  })

  // Invite URL modal state
  const [showInviteUrlModal, setShowInviteUrlModal] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          client_id,
          last_login_at,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[USERS_PAGE] Load error:', {
          code: error.code,
          message: error.message,
          details: error.details,
        })
        throw error
      }

      const transformedData = data || []
      console.log('[USERS_PAGE] Successfully loaded users:', {
        count: transformedData.length,
        timestamp: new Date().toISOString(),
      })

      setUsers(transformedData)
    } catch (error) {
      console.error('[USERS_PAGE] Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(search) ||
          user.first_name?.toLowerCase().includes(search) ||
          user.last_name?.toLowerCase().includes(search)
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }

  const handleOpenEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: (user.role === 'super_admin' ? 'super_admin' : 'user') as 'user' | 'super_admin',
      client_id: user.client_id || ''
    })
    setShowEditModal(true)
  }

  const handleOpenCreate = () => {
    setEditingUser(null)
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      role: 'user',
      client_id: ''
    })
    setShowCreateModal(true)
  }

  const handleSaveUser = async () => {
    try {
      if (!formData.email) {
        toast.error('Email is required')
        return
      }

      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            first_name: formData.first_name || null,
            last_name: formData.last_name || null,
            role: formData.role,
            client_id: formData.client_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id)

        if (error) throw error
        toast.success('User updated successfully')
        setShowEditModal(false)
      } else {
        // Create new user via direct creation API
        const createPayload = {
          email: formData.email,
          firstName: formData.first_name || 'User',
          lastName: formData.last_name || '',
        };

        console.log('[USERS_PAGE] Creating user directly:', {
          email: createPayload.email,
          firstName: createPayload.firstName,
          lastName: createPayload.lastName,
        });

        const response = await fetch('/api/admin/create-user-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload)
        })

        console.log('[USERS_PAGE] API response status:', response.status);

        if (!response.ok) {
          const error = await response.json()
          console.error('[USERS_PAGE] API returned error:', {
            status: response.status,
            error: error.error,
          });
          throw new Error(error.error || 'Failed to create user')
        }

        const result = await response.json()

        console.log('[USERS_PAGE] User created successfully:', {
          userId: result.user_id,
          hasMagicLink: !!result.magic_link,
        });

        // Display the magic link in modal
        setInviteUrl(result.magic_link)
        setShowInviteUrlModal(true)
        setShowCreateModal(false)

        // Reset form
        setFormData({
          email: '',
          first_name: '',
          last_name: '',
          role: 'user',
          client_id: ''
        })

        // Reload users
        loadUsers()
        return
      }

      setShowCreateModal(false)
      loadUsers()
    } catch (error) {
      console.error('Error saving user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save user')
    }
  }

  const handleCopyInviteUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setIsCopied(true)
      toast.success('Invite link copied to clipboard')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Error copying URL:', error)
      toast.error('Failed to copy URL')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-700'
      case 'user':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-2">
            Manage user accounts and permissions
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {/* Users List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Loading users...</p>
          </CardContent>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <UserCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No users found
            </h3>
            <p className="text-gray-600">
              {searchTerm || roleFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first user'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <UserCircle className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.email}
                        </h3>
                        <Badge className={getRoleBadgeColor(user.role)} variant="secondary">
                          {user.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Last login: {formatDate(user.last_login_at)} • Created: {formatDate(user.created_at)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(user)}
                    className="ml-4 flex-shrink-0"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create User Modal */}
      <Dialog
        open={showEditModal || showCreateModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowEditModal(false)
            setShowCreateModal(false)
            setEditingUser(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Create User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Update user information and permissions'
                : 'Create a new user account and generate magic link'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                disabled={!!editingUser}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                User: Standard access • Super Admin: Full administrative access
              </p>
            </div>

          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false)
                setShowCreateModal(false)
                setEditingUser(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite URL Modal */}
      <Dialog open={showInviteUrlModal} onOpenChange={setShowInviteUrlModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Account Created</DialogTitle>
            <DialogDescription>
              Share this magic link with the user to complete their onboarding
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteLink">Magic Link</Label>
              <div className="flex gap-2">
                <Input
                  id="inviteLink"
                  value={inviteUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleCopyInviteUrl}
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                This link expires in 24 hours. When clicked, the user will:
              </p>
              <ol className="text-xs text-gray-600 ml-4 mt-2 space-y-1">
                <li>1. Auto-login to their account</li>
                <li>2. Connect their LinkedIn (required)</li>
                <li>3. Set their password</li>
                <li>4. Access the dashboard</li>
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Copy and paste this link to send via email, Slack, or during your call with the client.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowInviteUrlModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
