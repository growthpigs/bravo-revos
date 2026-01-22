"use client"

import React from "react"
import { cn } from "@/lib/utils"
import {
  MessageSquare,
  Tag,
  User,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Paperclip,
  AtSign,
} from "lucide-react"

export type ActivityType =
  | "comment"
  | "status_change"
  | "priority_change"
  | "assignment"
  | "created"
  | "resolved"
  | "attachment"
  | "mention"

interface ActivityItem {
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

interface ActivityFeedProps {
  activities: ActivityItem[]
  className?: string
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  comment: <MessageSquare className="w-3.5 h-3.5" />,
  status_change: <ArrowRight className="w-3.5 h-3.5" />,
  priority_change: <Tag className="w-3.5 h-3.5" />,
  assignment: <User className="w-3.5 h-3.5" />,
  created: <AlertCircle className="w-3.5 h-3.5" />,
  resolved: <CheckCircle className="w-3.5 h-3.5" />,
  attachment: <Paperclip className="w-3.5 h-3.5" />,
  mention: <AtSign className="w-3.5 h-3.5" />,
}

const activityColors: Record<ActivityType, string> = {
  comment: "bg-blue-500/10 text-blue-500",
  status_change: "bg-purple-500/10 text-purple-500",
  priority_change: "bg-orange-500/10 text-orange-500",
  assignment: "bg-cyan-500/10 text-cyan-500",
  created: "bg-emerald-500/10 text-emerald-500",
  resolved: "bg-emerald-500/10 text-emerald-500",
  attachment: "bg-slate-500/10 text-slate-400",
  mention: "bg-pink-500/10 text-pink-500",
}

function getActivityDescription(activity: ActivityItem): React.ReactNode {
  switch (activity.type) {
    case "comment":
      return (
        <div>
          <span className="text-muted-foreground">commented</span>
          {activity.content && (
            <p className="mt-1.5 text-sm text-foreground bg-secondary/50 rounded-md px-3 py-2">
              {activity.content}
            </p>
          )}
        </div>
      )
    case "status_change":
      return (
        <span className="text-muted-foreground">
          changed status from{" "}
          <span className="text-foreground">{activity.metadata?.from}</span> to{" "}
          <span className="text-foreground">{activity.metadata?.to}</span>
        </span>
      )
    case "priority_change":
      return (
        <span className="text-muted-foreground">
          changed priority from{" "}
          <span className="text-foreground">{activity.metadata?.from}</span> to{" "}
          <span className="text-foreground">{activity.metadata?.to}</span>
        </span>
      )
    case "assignment":
      return (
        <span className="text-muted-foreground">
          assigned to{" "}
          <span className="text-foreground">{activity.metadata?.to}</span>
        </span>
      )
    case "created":
      return <span className="text-muted-foreground">created this ticket</span>
    case "resolved":
      return <span className="text-muted-foreground">resolved this ticket</span>
    case "attachment":
      return (
        <span className="text-muted-foreground">
          attached{" "}
          <span className="text-foreground">{activity.metadata?.fileName}</span>
        </span>
      )
    case "mention":
      return (
        <span className="text-muted-foreground">
          mentioned{" "}
          <span className="text-foreground">@{activity.metadata?.mentioned}</span>
        </span>
      )
    default:
      return <span className="text-muted-foreground">{activity.content}</span>
  }
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {activities.map((activity, index) => (
        <div key={activity.id} className="relative flex gap-3 pb-4">
          {/* Timeline line */}
          {index < activities.length - 1 && (
            <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
          )}

          {/* Icon */}
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              activityColors[activity.type]
            )}
          >
            {activityIcons[activity.type]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">
                {activity.actor.name}
              </span>
              {getActivityDescription(activity)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activity.timestamp}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Comment input component
interface CommentInputProps {
  onSubmit?: (content: string) => void
  placeholder?: string
}

export function CommentInput({
  onSubmit,
  placeholder = "Write a comment...",
}: CommentInputProps) {
  const [value, setValue] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim() && onSubmit) {
      onSubmit(value.trim())
      setValue("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors cursor-pointer"
      >
        Send
      </button>
    </form>
  )
}
