"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GripVertical, Trash2, Loader2 } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Database } from "@/types/database"

type IntakeFormField = Database['public']['Tables']['intake_form_field']['Row']
type FieldType = Database['public']['Enums']['field_type']

interface FieldRowProps {
  field: IntakeFormField
  onUpdate: (id: string, data: Partial<IntakeFormField>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isUpdating: boolean
}

export function FieldRow({ field, onUpdate, onDelete, isUpdating }: FieldRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(field.id)
    setIsDeleting(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg border bg-card group ${
        isDragging ? "opacity-50 shadow-lg z-50" : ""
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Field Label */}
      <div className="flex-1 min-w-0">
        <Input
          value={field.field_label}
          onChange={(e) => onUpdate(field.id, { field_label: e.target.value })}
          placeholder="Field Label"
          className="h-7 text-xs"
          disabled={isUpdating}
        />
      </div>

      {/* Field Type */}
      <div className="w-24">
        <Select
          value={field.field_type}
          onValueChange={(value: FieldType) => onUpdate(field.id, { field_type: value })}
          disabled={isUpdating}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text" className="text-xs">Text</SelectItem>
            <SelectItem value="email" className="text-xs">Email</SelectItem>
            <SelectItem value="url" className="text-xs">URL</SelectItem>
            <SelectItem value="number" className="text-xs">Number</SelectItem>
            <SelectItem value="textarea" className="text-xs">Textarea</SelectItem>
            <SelectItem value="select" className="text-xs">Select</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Placeholder */}
      <div className="flex-1 min-w-0">
        <Input
          value={field.placeholder || ""}
          onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
          placeholder="Placeholder"
          className="h-7 text-xs text-muted-foreground"
          disabled={isUpdating}
        />
      </div>

      {/* Required Toggle */}
      <div className="flex items-center gap-1.5 min-w-[70px]">
        <Switch
          checked={field.is_required}
          onCheckedChange={(checked) => onUpdate(field.id, { is_required: checked })}
          disabled={isUpdating}
          className="scale-90"
        />
        <span className="text-[10px] text-muted-foreground">Required</span>
      </div>

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleDelete}
        disabled={isDeleting || isUpdating}
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4 text-destructive" />
        )}
      </Button>
    </div>
  )
}
