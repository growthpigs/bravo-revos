"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { X, Plus, Diamond, CheckCircle, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================
// Milestone List (Project/Onboarding Milestones)
// ============================================================
export interface Milestone {
  id: string
  name: string
  assignee?: {
    name: string
    initials: string
    color?: string
  }
  completed?: boolean
}

interface MilestoneListProps {
  milestones: Milestone[]
  onChange: (milestones: Milestone[]) => void
  placeholder?: string
  addLabel?: string
  showAssignee?: boolean
  showCompletion?: boolean
  className?: string
}

export function MilestoneList({
  milestones,
  onChange,
  placeholder = "Milestone name",
  addLabel = "Add milestone",
  showAssignee = true,
  showCompletion = false,
  className,
}: MilestoneListProps) {
  const addMilestone = () => {
    onChange([...milestones, { id: Date.now().toString(), name: "" }])
  }

  const updateMilestone = (id: string, name: string) => {
    onChange(milestones.map((m) => (m.id === id ? { ...m, name } : m)))
  }

  const removeMilestone = (id: string) => {
    onChange(milestones.filter((m) => m.id !== id))
  }

  const toggleComplete = (id: string) => {
    onChange(milestones.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m)))
  }

  return (
    <div className={cn("space-y-3", className)}>
      {milestones.map((milestone) => (
        <div key={milestone.id} className="flex items-center gap-3 group">
          {showCompletion ? (
            <button
              type="button"
              onClick={() => toggleComplete(milestone.id)}
              className={cn(
                "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                milestone.completed
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/30 hover:border-primary"
              )}
            >
              {milestone.completed && <CheckCircle className="w-3 h-3" />}
            </button>
          ) : (
            <Diamond className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}

          <Input
            type="text"
            value={milestone.name}
            placeholder={placeholder}
            className={cn(
              "flex-1",
              milestone.completed && "line-through text-muted-foreground"
            )}
            onChange={(e) => updateMilestone(milestone.id, e.target.value)}
          />

          {showAssignee && (
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback
                className={cn(
                  "text-xs",
                  milestone.assignee?.color || "bg-muted"
                )}
              >
                {milestone.assignee?.initials || "?"}
              </AvatarFallback>
            </Avatar>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={() => removeMilestone(milestone.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-primary"
        onClick={addMilestone}
      >
        <Plus className="h-4 w-4 mr-1" />
        {addLabel}
      </Button>
    </div>
  )
}

// ============================================================
// Checklist (Simple Todo List)
// ============================================================
export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

interface ChecklistProps {
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
  placeholder?: string
  addLabel?: string
  className?: string
}

export function Checklist({
  items,
  onChange,
  placeholder = "Add item",
  addLabel = "Add item",
  className,
}: ChecklistProps) {
  const addItem = () => {
    onChange([...items, { id: Date.now().toString(), text: "", completed: false }])
  }

  const updateItem = (id: string, text: string) => {
    onChange(items.map((i) => (i.id === id ? { ...i, text } : i)))
  }

  const toggleItem = (id: string) => {
    onChange(items.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)))
  }

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id))
  }

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 group">
          <button
            type="button"
            onClick={() => toggleItem(item.id)}
            className={cn(
              "flex-shrink-0 w-4 h-4 rounded border transition-colors",
              item.completed
                ? "bg-primary border-primary"
                : "border-muted-foreground/30 hover:border-primary"
            )}
          >
            {item.completed && (
              <svg className="w-4 h-4 text-primary-foreground" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
              </svg>
            )}
          </button>

          <Input
            type="text"
            value={item.text}
            placeholder={placeholder}
            className={cn(
              "flex-1 h-8",
              item.completed && "line-through text-muted-foreground"
            )}
            onChange={(e) => updateItem(item.id, e.target.value)}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => removeItem(item.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-8"
        onClick={addItem}
      >
        <Plus className="h-3 w-3 mr-1" />
        {addLabel}
      </Button>
    </div>
  )
}

// ============================================================
// Sortable List (with drag handles)
// ============================================================
export interface SortableItem {
  id: string
  content: string
}

interface SortableListProps {
  items: SortableItem[]
  onChange: (items: SortableItem[]) => void
  placeholder?: string
  addLabel?: string
  className?: string
}

export function SortableList({
  items,
  onChange,
  placeholder = "Item",
  addLabel = "Add item",
  className,
}: SortableListProps) {
  const addItem = () => {
    onChange([...items, { id: Date.now().toString(), content: "" }])
  }

  const updateItem = (id: string, content: string) => {
    onChange(items.map((i) => (i.id === id ? { ...i, content } : i)))
  }

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id))
  }

  const _moveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...items]
    const [movedItem] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, movedItem)
    onChange(newItems)
  }

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, _index) => (
        <div key={item.id} className="flex items-center gap-2 group">
          <div className="cursor-grab text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </div>

          <Input
            type="text"
            value={item.content}
            placeholder={placeholder}
            className="flex-1"
            onChange={(e) => updateItem(item.id, e.target.value)}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => removeItem(item.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-primary"
        onClick={addItem}
      >
        <Plus className="h-4 w-4 mr-1" />
        {addLabel}
      </Button>
    </div>
  )
}
