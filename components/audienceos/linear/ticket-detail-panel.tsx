"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ActivityFeed, CommentInput, type ActivityType } from "./activity-feed"
import { type TicketPriority, type TicketStatus } from "./inbox-item"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import {
  X,
  MoreHorizontal,
  ExternalLink,
  Clock,
  User,
  Tag,
  Building2,
  Calendar,
  AlertCircle,
  Edit,
  Copy,
  Trash2,
  UserPlus,
  Flag,
  CircleDot,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

interface TicketActivity {
  id: string
  type: ActivityType
  actor: {
    name: string
    initials: string
    color?: string
  }
  timestamp: string
  content?: string
  metadata?: {
    from?: string
    to?: string
    fileName?: string
    mentioned?: string
  }
}

interface Ticket {
  id: string
  title: string
  description: string
  client: {
    name: string
    initials: string
    color?: string
  }
  priority: TicketPriority
  status: TicketStatus
  assignee?: {
    name: string
    initials: string
    color?: string
  }
  createdAt: string
  updatedAt: string
  dueDate?: string
  tags?: string[]
  activities: TicketActivity[]
}

interface TicketDetailPanelProps {
  ticket: Ticket
  onClose: () => void
  onStatusChange?: (status: TicketStatus) => void
  onPriorityChange?: (priority: TicketPriority) => void
  onComment?: (content: string) => void
  className?: string
}

const priorityColors: Record<TicketPriority, string> = {
  urgent: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
}

const statusColors: Record<TicketStatus, string> = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  waiting: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  closed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
}

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
}

const priorityLabels: Record<TicketPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
}

export function TicketDetailPanel({
  ticket,
  onClose,
  onStatusChange,
  onPriorityChange,
  onComment,
  className,
}: TicketDetailPanelProps) {
  const { toast } = useToast()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)

  // Handler functions
  const handleEdit = () => {
    // TODO: Open edit modal
    console.log("Edit ticket:", ticket.id)
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/tickets/${ticket.id}`
    navigator.clipboard.writeText(url)
    toast({
      title: "Copied",
      description: "Ticket link copied to clipboard",
      variant: "default",
    })
  }

  const handleAssign = async (assigneeName: string) => {
    setIsAssigning(true)
    try {
      // Map assignee names to IDs (in a real app, these would come from a user list)
      const assigneeMap: Record<string, string> = {
        "Brent": "d5f1e5c2-1234-5678-abcd-ef0123456789",
        "Roderic": "e6g2f6d3-2345-6789-bcde-f10234567890",
        "Trevor": "f7h3g7e4-3456-7890-cdef-f21345678901",
        "Chase": "a8i4h8f5-4567-8901-def0-f32456789012",
      }

      const assigneeId = assigneeMap[assigneeName]
      if (!assigneeId) {
        throw new Error("Invalid assignee")
      }

      const response = await fetchWithCsrf(`/api/v1/tickets/${ticket.id}`, {
        method: "PATCH",
        body: JSON.stringify({ assignee_id: assigneeId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to assign ticket")
      }

      toast({
        title: "Ticket assigned",
        description: `Assigned to ${assigneeName}`,
        variant: "default",
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to assign ticket"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetchWithCsrf(`/api/v1/tickets/${ticket.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete ticket")
      }

      toast({
        title: "Ticket deleted",
        description: "The ticket has been removed",
        variant: "default",
      })
      setShowDeleteModal(false)
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete ticket"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteModal(true)
  }

  const handleOpenExternal = () => {
    window.open(`/tickets/${ticket.id}`, '_blank')
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-l border-border",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">#{ticket.id}</span>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded border font-medium",
              statusColors[ticket.status]
            )}
          >
            {statusLabels[ticket.status]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenExternal}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CircleDot className="w-4 h-4 mr-2" />
                  Change Status
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onStatusChange?.("open")}>Open</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange?.("in_progress")}>In Progress</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange?.("waiting")}>Waiting</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange?.("resolved")}>Resolved</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange?.("closed")}>Closed</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Flag className="w-4 h-4 mr-2" />
                  Change Priority
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onPriorityChange?.("urgent")}>Urgent</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPriorityChange?.("high")}>High</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPriorityChange?.("medium")}>Medium</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPriorityChange?.("low")}>Low</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign to
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleAssign("Brent")}>Brent</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAssign("Roderic")}>Roderic</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAssign("Trevor")}>Trevor</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAssign("Chase")}>Chase</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title and description */}
        <div className="px-4 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {ticket.title}
          </h2>
          <p className="text-sm text-muted-foreground">{ticket.description}</p>
        </div>

        {/* Properties - using fixed-width label pattern */}
        <div className="px-4 py-4 border-b border-border">
          <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2.5 items-center">
            {/* Client */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>Client</span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className={cn("h-5 w-5", ticket.client.color || "bg-primary")}>
                <AvatarFallback
                  className={cn(
                    "text-[10px] font-medium text-primary-foreground",
                    ticket.client.color || "bg-primary"
                  )}
                >
                  {ticket.client.initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground">{ticket.client.name}</span>
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Assignee</span>
            </div>
            {ticket.assignee ? (
              <div className="flex items-center gap-2">
                <Avatar
                  className={cn("h-5 w-5", ticket.assignee.color || "bg-primary")}
                >
                  <AvatarFallback
                    className={cn(
                      "text-[10px] font-medium text-primary-foreground",
                      ticket.assignee.color || "bg-primary"
                    )}
                  >
                    {ticket.assignee.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground">
                  {ticket.assignee.name}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Unassigned</span>
            )}

            {/* Priority */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>Priority</span>
            </div>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded border font-medium w-fit",
                priorityColors[ticket.priority]
              )}
            >
              {priorityLabels[ticket.priority]}
            </span>

            {/* Due date */}
            {ticket.dueDate && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Due date</span>
                </div>
                <span className="text-sm text-foreground">{ticket.dueDate}</span>
              </>
            )}

            {/* Created */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Created</span>
            </div>
            <span className="text-sm text-foreground">{ticket.createdAt}</span>

            {/* Tags */}
            {ticket.tags && ticket.tags.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="w-4 h-4" />
                  <span>Tags</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {ticket.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="px-4 py-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Activity</h3>
          <ActivityFeed activities={ticket.activities} />
        </div>
      </div>

      {/* Comment input */}
      <div className="px-4 py-3 border-t border-border">
        <CommentInput onSubmit={onComment} placeholder="Add a comment..." />
      </div>

      {/* Delete confirmation modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export type { Ticket, TicketActivity }
