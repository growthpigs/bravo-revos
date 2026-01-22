"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FormField {
  id: string
  field_label: string
  field_type: string
  placeholder: string | null
  is_required: boolean
  options?: unknown
}

interface DynamicFormFieldsProps {
  fields: FormField[]
  values: Record<string, string>
  onChange: (fieldId: string, value: string) => void
  disabled?: boolean
  darkMode?: boolean
}

export function DynamicFormFields({
  fields,
  values,
  onChange,
  disabled = false,
  darkMode = false,
}: DynamicFormFieldsProps) {
  const sortedFields = [...fields].sort((a, b) => {
    // Fields may have sort_order if available
    const aOrder = (a as { sort_order?: number }).sort_order ?? 0
    const bOrder = (b as { sort_order?: number }).sort_order ?? 0
    return aOrder - bOrder
  })

  const baseInputClass = darkMode
    ? "bg-slate-950 border-slate-700 text-slate-100"
    : ""

  const baseLabelClass = darkMode
    ? "text-slate-300"
    : ""

  const renderField = (field: FormField) => {
    const value = values[field.id] || ""

    switch (field.field_type) {
      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            rows={3}
            className={baseInputClass}
          />
        )
      case "select": {
        const options = Array.isArray(field.options) ? field.options : []
        return (
          <Select
            value={value}
            onValueChange={(v) => onChange(field.id, v)}
            disabled={disabled}
          >
            <SelectTrigger className={baseInputClass}>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string | { value: string; label: string }, idx: number) => {
                const optValue = typeof opt === "string" ? opt : opt.value
                const optLabel = typeof opt === "string" ? opt : opt.label
                return (
                  <SelectItem key={idx} value={optValue}>
                    {optLabel}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )
      }
      case "email":
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            className={baseInputClass}
          />
        )
      case "url":
        return (
          <Input
            type="url"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            className={baseInputClass}
          />
        )
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            className={baseInputClass}
          />
        )
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            className={baseInputClass}
          />
        )
    }
  }

  if (sortedFields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No form fields configured</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedFields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label className={`flex items-center gap-1 ${baseLabelClass}`}>
            {field.field_label}
            {field.is_required && (
              <span className="text-red-500">*</span>
            )}
          </Label>
          {renderField(field)}
        </div>
      ))}
    </div>
  )
}

// Hook to manage form state
export function useDynamicFormState(fields: FormField[]) {
  const [values, setValues] = useState<Record<string, string>>({})

  const handleChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  const isValid = () => {
    return fields
      .filter((f) => f.is_required)
      .every((f) => {
        const value = values[f.id]
        return value && value.trim() !== ""
      })
  }

  const getResponses = () => {
    return Object.entries(values).map(([field_id, value]) => ({
      field_id,
      value,
    }))
  }

  return {
    values,
    handleChange,
    isValid,
    getResponses,
  }
}
