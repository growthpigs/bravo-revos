"use client"

import { useEffect } from "react"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { FieldRow } from "./field-row"
import { FormPreview } from "./form-preview"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2, FileText } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

export function FormBuilder() {
  const {
    fields,
    isLoadingFields,
    isSavingField,
    fetchFields,
    createField,
    updateField,
    deleteField,
    reorderFields,
  } = useOnboardingStore()

  // Set up drag sensors with minimal distance to start
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const handleAddField = () => {
    const maxSortOrder = Math.max(...fields.map((f) => f.sort_order), 0)
    // Optimistic - store handles instant UI update
    createField({
      field_label: "New Field",
      field_type: "text",
      placeholder: "",
      is_required: false,
      sort_order: maxSortOrder + 1,
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order)
      const oldIndex = sortedFields.findIndex((f) => f.id === active.id)
      const newIndex = sortedFields.findIndex((f) => f.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedFields = arrayMove(sortedFields, oldIndex, newIndex)
        // Update sort_order for each field
        const updates = reorderedFields.map((field, index) => ({
          id: field.id,
          sort_order: index + 1,
        }))
        reorderFields(updates)
      }
    }
  }

  if (isLoadingFields && fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-[150px]">
      {/* Left: Field List (2/3 width) */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Intake Form Fields</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Customize the fields clients fill out during onboarding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No fields configured</p>
              <p className="text-sm">Add your first field to get started</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedFields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedFields.map((field) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    onUpdate={updateField}
                    onDelete={deleteField}
                    isUpdating={isSavingField}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleAddField}
            disabled={isSavingField}
          >
            {isSavingField ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" />
            )}
            Add Field
          </Button>
        </CardContent>
      </Card>

      {/* Right: Form Preview (1/3 width) */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Form Preview</CardTitle>
          <CardDescription className="text-xs">
            Preview how the intake form will appear to clients
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <FormPreview fields={fields} />
        </CardContent>
      </Card>
    </div>
  )
}
