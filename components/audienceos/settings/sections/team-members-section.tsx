"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Link2,
  Copy,
  Check,
  Download,
  ChevronDown,
  ChevronLeft,
  Calendar,
  Github,
  Slack,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { UserInvitationModal } from "@/components/settings/modals/user-invitation-modal"
import { ClientAssignmentModal } from "@/components/settings/modals/client-assignment-modal"
import { toast } from "sonner"
import type { TeamMember } from "@/types/settings"
import { RoleHierarchyLevel } from "@/types/rbac"

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

// Member colors based on name hash for consistent avatars
const MEMBER_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-indigo-500",
]

function getMemberColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length]
}

// ============================================================================
// Member Profile View Component
// ============================================================================

interface MemberProfileProps {
  member: TeamMember
  onBack: () => void
  onUpdate: (member: TeamMember) => void
}

function MemberProfile({ member, onBack, onUpdate }: MemberProfileProps) {
  const [firstName, setFirstName] = useState(member.first_name)
  const [lastName, setLastName] = useState(member.last_name)
  const [nickname, setNickname] = useState(member.first_name.toLowerCase())
  const [role, setRole] = useState(member.role)
  const [isSaving, setIsSaving] = useState(false)

  const fullName = member.full_name ?? `${member.first_name} ${member.last_name}`
  const avatarColor = getMemberColor(fullName)

  const hasChanges =
    firstName !== member.first_name ||
    lastName !== member.last_name ||
    role !== member.role

  const handleSave = async () => {
    if (!hasChanges) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/v1/settings/users/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          role: role,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }

      const updated = await response.json()
      toast.success('Profile updated successfully')
      onUpdate({ ...member, ...updated })
      onBack()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to members
        </button>
        <h2 className="text-lg font-medium text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Manage team member profile
        </p>
      </div>

      {/* Profile Picture Section */}
      <div className="border border-border rounded-lg p-6">
        <p className="text-sm text-muted-foreground mb-4">Profile picture</p>
        <div className="flex justify-center">
          <Avatar className={`h-32 w-32 ${avatarColor}`}>
            <AvatarFallback className="text-white text-4xl font-medium">
              {getInitials(member.first_name, member.last_name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Profile Form */}
      <div className="border border-border rounded-lg divide-y divide-border">
        {/* Email - read only */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Email</Label>
          </div>
          <Input
            value={member.email}
            disabled
            className="max-w-[280px] bg-secondary/50"
          />
        </div>

        {/* Full Name */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Full name</Label>
          </div>
          <div className="flex gap-2 max-w-[280px]">
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="flex-1"
            />
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="flex-1"
            />
          </div>
        </div>

        {/* Nickname */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Nickname</Label>
            <p className="text-sm text-muted-foreground">
              How they appear in mentions
            </p>
          </div>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="max-w-[280px]"
          />
        </div>

        {/* Role */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Role</Label>
            <p className="text-sm text-muted-foreground">
              Permissions level in workspace
            </p>
          </div>
          <Select value={role} onValueChange={(v) => setRole(v as "owner" | "admin" | "manager" | "member")}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Connected Integrations */}
      <div className="border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <p className="text-sm text-muted-foreground">Personal integrations</p>
        </div>

        <div className="divide-y divide-border">
          {/* Google Calendar */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-secondary">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Google Calendar</p>
                <p className="text-sm text-muted-foreground">
                  Display out of office status
                </p>
              </div>
            </div>
            <Button variant="ghost" className="text-primary">
              Connect →
            </Button>
          </div>

          {/* Slack */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-secondary">
                <Slack className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Slack</p>
                <p className="text-sm text-muted-foreground">
                  Receive notifications in Slack
                </p>
              </div>
            </div>
            <Button variant="ghost" className="text-primary">
              Connect →
            </Button>
          </div>

          {/* GitHub */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-secondary">
                <Github className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">GitHub</p>
                <p className="text-sm text-muted-foreground">
                  Link activity with account
                </p>
              </div>
            </div>
            <Button variant="ghost" className="text-primary">
              Connect →
            </Button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Team Members Section
// ============================================================================

export function TeamMembersSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteLinkEnabled, setInviteLinkEnabled] = useState(false)
  const [copied, setCopied] = useState(false)
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "admin" | "manager" | "member">("all")
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)
  const [memberForClientAccess, setMemberForClientAccess] = useState<TeamMember | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // API state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch team members from API
  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/v1/settings/users', {
        credentials: 'include',
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch team members')
      }
      const data = await response.json()
      setTeamMembers(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Handle member update (from profile edit)
  const handleMemberUpdate = (updated: TeamMember) => {
    setTeamMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
  }

  // Handle member removal
  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    setIsRemoving(true)
    try {
      const response = await fetch(`/api/v1/settings/users/${memberToRemove.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove user')
      }

      toast.success(`${memberToRemove.first_name} has been removed from the workspace`)
      setTeamMembers(prev => prev.filter(m => m.id !== memberToRemove.id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove user')
    } finally {
      setIsRemoving(false)
      setMemberToRemove(null)
    }
  }

  // Filter members by search and role
  const filteredMembers = teamMembers.filter((member) => {
    const search = searchQuery.toLowerCase()
    const matchesSearch =
      member.first_name.toLowerCase().includes(search) ||
      member.last_name.toLowerCase().includes(search) ||
      member.email.toLowerCase().includes(search)

    const matchesRole = roleFilter === "all" || member.role === roleFilter

    return matchesSearch && matchesRole
  })

  const inviteLink = "https://app.audienceos.com/join/abc123xyz"

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = () => {
    // In production, this would generate and download a CSV
    console.log("Exporting members list...")
  }

  // Show profile view if a member is selected
  if (selectedMember) {
    return (
      <MemberProfile
        member={selectedMember}
        onBack={() => setSelectedMember(null)}
        onUpdate={handleMemberUpdate}
      />
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={fetchMembers}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section Header - Linear style */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">Members</h2>
        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite people
        </Button>
      </div>

      {/* Invite Link Section - Linear style */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-secondary">
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Invite link</p>
              <p className="text-sm text-muted-foreground">
                {inviteLinkEnabled
                  ? "Anyone with this link can join your workspace"
                  : "Enable to allow anyone with the link to join"
                }
              </p>
            </div>
          </div>
          <Switch
            checked={inviteLinkEnabled}
            onCheckedChange={setInviteLinkEnabled}
          />
        </div>

        {inviteLinkEnabled && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-secondary rounded-md text-sm text-muted-foreground truncate">
              {inviteLink}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy link
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filter Row - Linear style */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 min-w-[100px]">
              {roleFilter === "all" ? "All" : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRoleFilter("all")}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("owner")}>
              Owner
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("admin")}>
              Admin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("manager")}>
              Manager
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("member")}>
              Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Members List - Linear style clean rows */}
      <div className="border border-border rounded-lg divide-y divide-border">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            onClick={() => setSelectedMember(member)}
            className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Avatar className={`h-8 w-8 ${getMemberColor(member.full_name ?? `${member.first_name} ${member.last_name}`)}`}>
                <AvatarFallback className="text-white text-sm font-medium">
                  {getInitials(member.first_name, member.last_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant={member.role === "admin" ? "default" : "secondary"}
                className="capitalize"
              >
                {member.role}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                    Edit profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>Change role</DropdownMenuItem>
                  {/* Show "Manage Client Access" only for Members (hierarchy_level=4) */}
                  {member.hierarchy_level === RoleHierarchyLevel.MEMBER && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setMemberForClientAccess(member)
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Client Access
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>View activity</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMemberToRemove(member)
                    }}
                  >
                    Remove from workspace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No members found matching your search.
          </div>
        )}
      </div>

      {/* Export Section - Linear style */}
      <button
        onClick={handleExport}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Download className="h-4 w-4" />
        Export members list
      </button>

      {/* Invitation Modal */}
      <UserInvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          fetchMembers() // Refresh members list after invite
        }}
      />

      {/* Client Assignment Modal (for Members only) */}
      <ClientAssignmentModal
        isOpen={!!memberForClientAccess}
        onClose={() => setMemberForClientAccess(null)}
        member={memberForClientAccess}
        onSuccess={() => {
          // Could refresh member list if showing client count badges
        }}
      />

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.first_name} {memberToRemove?.last_name} from the workspace?
              This action will revoke their access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
