"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import { StageConfirmModal } from "@/components/stage-confirm-modal"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  X,
  Copy,
  Pencil,
  Calendar,
  Tag,
  FolderKanban,
  Send,
  Paperclip,
  MoreVertical,
  ExternalLink,
  FolderOpen,
  ArrowRight,
  UserPlus,
  Trash2,
  Loader2,
} from "lucide-react"

interface ClientDetailPanelProps {
  client: {
    id: string
    name: string
    stage: string
    health: "Green" | "Yellow" | "Red" | "Blocked"
    owner: {
      name: string
      initials: string
      color: string
    }
    tier: string
    daysInStage: number
    blocker?: string | null
    statusNote?: string | null
  }
  onClose: () => void
}

function getHealthBadgeStyle(health: string) {
  switch (health) {
    case "Green":
      return "bg-status-green/20 text-status-green border-status-green/30"
    case "Yellow":
      return "bg-status-yellow/20 text-status-yellow border-status-yellow/30"
    case "Red":
      return "bg-status-red/20 text-status-red border-status-red/30"
    case "Blocked":
      return "bg-status-blocked/20 text-status-blocked border-status-blocked/30"
    default:
      return ""
  }
}

function getTierBadgeStyle(tier: string) {
  switch (tier) {
    case "Enterprise":
      return "bg-status-green/20 text-status-green border-status-green/30"
    case "Core":
      return "bg-primary/20 text-primary border-primary/30"
    case "Starter":
      return "bg-muted text-muted-foreground border-border"
    default:
      return ""
  }
}

interface Note {
  id: string
  text: string
  author: string
  timestamp: Date
}

export function ClientDetailPanel({ client, onClose }: ClientDetailPanelProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [isEditing, setIsEditing] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [notes, setNotes] = useState<Note[]>(() => {
    // Initialize with statusNote if it exists
    if (client.statusNote) {
      return [{
        id: '1',
        text: client.statusNote,
        author: client.owner.name,
        timestamp: new Date()
      }]
    }
    return []
  })

  // Modal state
  const [showStageModal, setShowStageModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSendingNote, setIsSendingNote] = useState(false)

  // Handler functions
  const handleEdit = () => {
    setIsEditing(!isEditing)
    // Toggle edit mode for inline editing
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(client.id)
    toast({
      title: "Copied",
      description: "Client ID copied to clipboard",
      variant: "default",
    })
  }

  const handleOpen = () => {
    // Open client in detail view
    router.push(`/clients/${client.id}`)
  }

  const handleMove = () => {
    // Open stage picker modal
    setShowStageModal(true)
  }

  const handleAssign = () => {
    // TODO: Open owner picker modal
    console.log("Assign client:", client.id)
  }

  const handleDelete = () => {
    // Open delete confirmation modal
    setShowDeleteModal(true)
  }

  const handleConfirmMove = async (notes?: string) => {
    setIsMoving(true)
    try {
      const response = await fetchWithCsrf(`/api/v1/clients/${client.id}/stage`, {
        method: "PUT",
        body: JSON.stringify({ stage: client.stage }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to move client")
      }

      toast({
        title: "Client moved",
        description: `Client moved to ${client.stage}`,
        variant: "default",
      })

      setShowStageModal(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to move client"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsMoving(false)
    }
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetchWithCsrf(`/api/v1/clients/${client.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete client")
      }

      toast({
        title: "Client deleted",
        description: "Client has been deactivated",
        variant: "default",
      })

      setShowDeleteModal(false)
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete client"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSendNote = async () => {
    if (!noteText.trim()) return

    setIsSendingNote(true)
    const newNote: Note = {
      id: Date.now().toString(),
      text: noteText.trim(),
      author: client.owner.name,
      timestamp: new Date()
    }

    try {
      // Add note to list immediately (optimistic update)
      setNotes(prev => [newNote, ...prev])
      setNoteText("")

      // Save note to API
      const response = await fetchWithCsrf(`/api/v1/clients/${client.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ text: newNote.text })
      })

      if (!response.ok) {
        throw new Error('Failed to save note')
      }

      const savedNote = await response.json()
      // Update with server-generated ID if needed
      setNotes(prev => prev.map(n => n.id === newNote.id ? { ...n, id: savedNote.id } : n))

      toast({
        title: "Note saved",
        description: "Your note has been added to the client",
        variant: "default",
      })
    } catch (error) {
      // Revert optimistic update on error
      setNotes(prev => prev.filter(n => n.id !== newNote.id))
      setNoteText(newNote.text)

      const errorMessage = error instanceof Error ? error.message : 'Failed to save note'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSendingNote(false)
    }
  }

  const handleAttachment = () => {
    // TODO: Open file picker
    console.log("Attach file")
  }

  const handleAddLabel = () => {
    // TODO: Open label picker
    console.log("Add label")
  }

  const handleSetDueDate = () => {
    // TODO: Open date picker
    console.log("Set due date")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white", client.owner.color)}>
            {client.owner.initials}
          </div>
          <span className="text-sm text-foreground truncate">{client.name}</span>
          <span className="text-xs text-muted-foreground">{client.id}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopy}>
            <Copy className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleOpen}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEdit}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMove}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Move
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAssign}>
                <UserPlus className="w-4 h-4 mr-2" />
                Assign
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Properties - using fixed-width label pattern */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">Properties</h3>

        <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2.5 items-center">
          {/* Stage */}
          <span className="text-xs text-muted-foreground">Stage</span>
          <span className="text-sm text-foreground">{client.stage}</span>

          {/* Health */}
          <span className="text-xs text-muted-foreground">Health</span>
          <span>
            <Badge variant="outline" className={cn("text-xs", getHealthBadgeStyle(client.health))}>
              {client.health}
            </Badge>
          </span>

          {/* Owner */}
          <span className="text-xs text-muted-foreground">Owner</span>
          <div className="flex items-center gap-2">
            <Avatar className={cn("h-6 w-6", client.owner.color)}>
              <AvatarFallback className={cn(client.owner.color, "text-xs font-medium text-white")}>
                {client.owner.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{client.owner.name}</span>
          </div>

          {/* Days in stage */}
          <span className="text-xs text-muted-foreground">Days in Stage</span>
          <span className={cn(
            "text-sm tabular-nums",
            client.daysInStage > 4 ? "text-status-red font-medium" : ""
          )}>
            {client.daysInStage}
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">Labels</h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", getTierBadgeStyle(client.tier))}>
              {client.tier}
            </Badge>
          </div>

          {client.blocker && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-status-red/20 text-status-red border-status-red/30">
                {client.blocker}
              </Badge>
            </div>
          )}

          <button
            onClick={handleAddLabel}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Tag className="w-4 h-4" />
            <span className="text-xs">Add label</span>
          </button>
        </div>
      </div>

      {/* Project */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">Project</h3>

        <div className="flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-primary" />
          <span className="text-sm">Client Pipeline</span>
        </div>
      </div>

      {/* Due Date */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">Due Date</h3>

        <button
          onClick={handleSetDueDate}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Set due date</span>
        </button>
      </div>

      {/* Notes */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium mb-3">Notes</h3>

          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="p-3 rounded bg-secondary/50 border border-border">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{note.text}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {note.author} • {note.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet</p>
          )}
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-start gap-2">
            <Avatar className={cn("h-6 w-6 mt-1", client.owner.color)}>
              <AvatarFallback className={cn(client.owner.color, "text-xs font-medium text-white")}>
                {client.owner.initials}
              </AvatarFallback>
            </Avatar>
            <Textarea
              placeholder="Add a note... (Shift+Enter for new line)"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendNote()
                }
              }}
              className="flex-1 min-h-[80px] max-h-[200px] resize-none text-sm"
              rows={3}
            />
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={handleAttachment}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
                onClick={handleSendNote}
                disabled={!noteText.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Confirmation Modal */}
      <StageConfirmModal
        open={showStageModal}
        onOpenChange={setShowStageModal}
        clientName={client.name}
        fromStage={client.stage as any}
        toStage={client.stage as any}
        onConfirm={handleConfirmMove}
        onCancel={() => setShowStageModal(false)}
      />

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <span className="font-medium">{client.name}</span>? This action can be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteModal(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
