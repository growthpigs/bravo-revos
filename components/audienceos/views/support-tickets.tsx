"use client"

import React, { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useSlideTransition } from "@/hooks/use-slide-transition"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import { cn } from "@/lib/utils"
import {
  InboxItem,
  TicketDetailPanel,
  ListHeader,
  type Ticket,
} from "@/components/linear"
import { useTicketStore, type Ticket as StoreTicket } from "@/stores/ticket-store"
import {
  Inbox,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

// Map store status to UI status
function mapStatus(storeStatus: string): "open" | "in_progress" | "waiting" | "resolved" {
  switch (storeStatus) {
    case "new": return "open"
    case "in_progress": return "in_progress"
    case "waiting_client": return "waiting"
    case "resolved": return "resolved"
    default: return "open"
  }
}

// Transform store tickets to component format
function transformStoreTicket(storeTicket: StoreTicket): Ticket {
  return {
    id: storeTicket.id,
    title: storeTicket.title,
    description: storeTicket.description || "",
    client: {
      name: storeTicket.client?.name || "Unknown Client",
      initials: storeTicket.client?.name?.substring(0, 2).toUpperCase() || "UC",
      color: "bg-blue-600",
    },
    priority: storeTicket.priority as "low" | "medium" | "high" | "urgent",
    status: mapStatus(storeTicket.status),
    assignee: storeTicket.assignee ? {
      name: `${storeTicket.assignee.first_name || ""} ${storeTicket.assignee.last_name || ""}`.trim() || "Unassigned",
      initials: `${storeTicket.assignee.first_name?.[0] || ""}${storeTicket.assignee.last_name?.[0] || ""}`.toUpperCase() || "U",
      color: "bg-emerald-500",
    } : undefined,
    createdAt: new Date(storeTicket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    updatedAt: new Date(storeTicket.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    dueDate: storeTicket.due_date ? new Date(storeTicket.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
    tags: [],
    activities: [],
  }
}

type FilterTab = "all" | "open" | "in_progress" | "waiting" | "resolved"

interface FilterTabConfig {
  id: FilterTab
  label: string
  icon: React.ReactNode
  count: number
}

export function SupportTickets() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)

  const slideTransition = useSlideTransition()
  const { toast } = useToast()

  // Get tickets from store
  const { tickets: storeTickets, fetchTickets, isLoading: _isLoading } = useTicketStore()

  // Fetch tickets on mount
  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // Load ticket notes when a ticket is selected
  useEffect(() => {
    if (!selectedTicket) return

    const loadTicketNotes = async () => {
      setIsLoadingNotes(true)
      try {
        const response = await fetch(
          `/api/v1/tickets/${selectedTicket.id}/notes`,
          { credentials: 'include' }
        )

        if (response.ok) {
          const { data: notes } = await response.json()

          // Transform notes to activity items
          const activities = notes.map((note: any) => ({
            id: note.id,
            type: 'comment' as const,
            actor: {
              name: `${note.author?.first_name || ''} ${note.author?.last_name || ''}`.trim() || 'Unknown',
              initials: `${note.author?.first_name?.[0] || ''}${note.author?.last_name?.[0] || ''}`.toUpperCase() || 'U',
              color: 'bg-blue-600',
            },
            timestamp: new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            content: note.content,
          }))

          // Update selected ticket with loaded notes
          setSelectedTicket((prev) => prev ? { ...prev, activities } : null)
        }
      } catch (error) {
        console.error('Failed to load ticket notes:', error)
      } finally {
        setIsLoadingNotes(false)
      }
    }

    loadTicketNotes()
  }, [selectedTicket?.id])

  // Transform store tickets to display format
  const displayTickets = useMemo(() => {
    return storeTickets.map(transformStoreTicket)
  }, [storeTickets])

  // Calculate counts
  const counts = useMemo(() => {
    return {
      all: displayTickets.length,
      open: displayTickets.filter((t) => t.status === "open").length,
      in_progress: displayTickets.filter((t) => t.status === "in_progress").length,
      waiting: displayTickets.filter((t) => t.status === "waiting").length,
      resolved: displayTickets.filter((t) => t.status === "resolved").length,
    }
  }, [displayTickets])

  const filterTabs: FilterTabConfig[] = [
    { id: "all", label: "All", icon: <Inbox className="w-4 h-4" />, count: counts.all },
    { id: "open", label: "Open", icon: <AlertCircle className="w-4 h-4" />, count: counts.open },
    { id: "in_progress", label: "In Progress", icon: <Clock className="w-4 h-4" />, count: counts.in_progress },
    { id: "waiting", label: "Waiting", icon: <Clock className="w-4 h-4" />, count: counts.waiting },
    { id: "resolved", label: "Resolved", icon: <CheckCircle className="w-4 h-4" />, count: counts.resolved },
  ]

  // Filter tickets
  const filteredTickets = useMemo(() => {
    let tickets = displayTickets

    // Apply status filter
    if (activeFilter !== "all") {
      tickets = tickets.filter((t) => {
        const status = t.status.replace(" ", "_")
        return status === activeFilter
      })
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      tickets = tickets.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.client.name.toLowerCase().includes(query) ||
          t.id.toLowerCase().includes(query)
      )
    }

    return tickets
  }, [activeFilter, searchQuery, displayTickets])

  const handleComment = async (content: string) => {
    if (!selectedTicket || !content.trim()) return

    setIsSubmittingComment(true)
    try {
      const response = await fetchWithCsrf(
        `/api/v1/tickets/${selectedTicket.id}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: content.trim(),
            is_internal: false,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to post comment')
      }

      toast({
        title: 'Comment posted',
        description: 'Your comment has been added to the ticket.',
        variant: 'default',
      })

      // Reload notes for the selected ticket to show the new comment
      const notesResponse = await fetch(
        `/api/v1/tickets/${selectedTicket.id}/notes`,
        { credentials: 'include' }
      )

      if (notesResponse.ok) {
        const { data: notes } = await notesResponse.json()
        const activities = notes.map((note: any) => ({
          id: note.id,
          type: 'comment' as const,
          actor: {
            name: `${note.author?.first_name || ''} ${note.author?.last_name || ''}`.trim() || 'Unknown',
            initials: `${note.author?.first_name?.[0] || ''}${note.author?.last_name?.[0] || ''}`.toUpperCase() || 'U',
            color: 'bg-blue-600',
          },
          timestamp: new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          content: note.content,
        }))

        setSelectedTicket((prev) => prev ? { ...prev, activities } : null)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to post comment'
      toast({
        title: 'Error posting comment',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleStatusChange = async (newStatus: "open" | "in_progress" | "waiting" | "resolved" | "closed") => {
    if (!selectedTicket) return

    // Map UI status to API status
    const statusMap: Record<string, string> = {
      'open': 'new',
      'in_progress': 'in_progress',
      'waiting': 'waiting_client',
      'resolved': 'resolved',
      'closed': 'resolved',
    }

    try {
      const response = await fetchWithCsrf(`/api/v1/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusMap[newStatus] }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update status')
      }

      // Update local state
      setSelectedTicket((prev) => prev ? { ...prev, status: newStatus } : null)

      toast({
        title: 'Status updated',
        description: `Ticket status changed to ${newStatus}`,
        variant: 'default',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update status'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handlePriorityChange = async (newPriority: "low" | "medium" | "high" | "urgent") => {
    if (!selectedTicket) return

    try {
      const response = await fetchWithCsrf(`/api/v1/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ priority: newPriority }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update priority')
      }

      // Update local state
      setSelectedTicket((prev) => prev ? { ...prev, priority: newPriority } : null)

      toast({
        title: 'Priority updated',
        description: `Ticket priority changed to ${newPriority}`,
        variant: 'default',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update priority'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Ticket list - shrinks when detail panel is open */}
      <motion.div
        initial={false}
        animate={{ width: selectedTicket ? 280 : "100%" }}
        transition={slideTransition}
        className="flex flex-col border-r border-border overflow-hidden"
        style={{ minWidth: selectedTicket ? 280 : undefined, flexShrink: selectedTicket ? 0 : undefined }}
      >
        <ListHeader
          title="Support Tickets"
          count={filteredTickets.length}
          onSearch={!selectedTicket ? setSearchQuery : undefined}
          searchValue={!selectedTicket ? searchQuery : undefined}
          searchPlaceholder="Search tickets..."
        />

        {/* Filter tabs - hide when compact */}
        {!selectedTicket && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                  activeFilter === tab.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className="text-xs text-muted-foreground">({tab.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Ticket list - natural flow */}
        <div className="flex-1">
          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => (
              <InboxItem
                key={ticket.id}
                id={ticket.id}
                title={ticket.title}
                preview={ticket.description}
                client={ticket.client}
                priority={ticket.priority}
                status={ticket.status}
                timestamp={ticket.updatedAt}
                unread={ticket.status === "open"}
                selected={selectedTicket?.id === ticket.id}
                compact={!!selectedTicket}
                onClick={() => setSelectedTicket(ticket)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Inbox className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No tickets found</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Ticket detail panel */}
      <AnimatePresence mode="wait">
        {selectedTicket && (
          <motion.div
            key="ticket-detail-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={slideTransition}
            className="flex-1 flex flex-col bg-background overflow-hidden"
          >
            <TicketDetailPanel
              ticket={selectedTicket}
              onClose={() => setSelectedTicket(null)}
              onComment={handleComment}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
