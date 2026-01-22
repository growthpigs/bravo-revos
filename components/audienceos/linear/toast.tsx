"use client"

import React, { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { CheckCircle, AlertCircle, AlertTriangle, Info, X, RefreshCw } from "lucide-react"

export type ToastVariant = "success" | "error" | "warning" | "info" | "default"

export interface ToastProps {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: (id: string) => void
  onRetry?: () => void
}

const variantStyles: Record<ToastVariant, { bg: string; icon: string; iconBg: string }> = {
  success: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    icon: "text-emerald-500",
    iconBg: "bg-emerald-500/20",
  },
  error: {
    bg: "bg-red-500/10 border-red-500/20",
    icon: "text-red-500",
    iconBg: "bg-red-500/20",
  },
  warning: {
    bg: "bg-yellow-500/10 border-yellow-500/20",
    icon: "text-yellow-500",
    iconBg: "bg-yellow-500/20",
  },
  info: {
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: "text-blue-500",
    iconBg: "bg-blue-500/20",
  },
  default: {
    bg: "bg-secondary border-border",
    icon: "text-muted-foreground",
    iconBg: "bg-muted",
  },
}

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4" />,
  error: <AlertCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
  default: <Info className="w-4 h-4" />,
}

export function Toast({
  id,
  title,
  description,
  variant = "default",
  duration = 5000,
  action,
  onDismiss,
  onRetry,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const styles = variantStyles[variant]

  const handleDismiss = useCallback(() => {
    setIsLeaving(true)
    setTimeout(() => {
      onDismiss?.(id)
    }, 200)
  }, [id, onDismiss])

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(enterTimer)
  }, [])

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, handleDismiss])

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm",
        "transition-all duration-200 ease-out",
        styles.bg,
        isVisible && !isLeaving
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2"
      )}
      role="alert"
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
          styles.iconBg,
          styles.icon
        )}
      >
        {variantIcons[variant]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium text-primary hover:underline mt-1"
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            aria-label="Retry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// Toast container component
interface ToastContainerProps {
  toasts: ToastProps[]
  onDismiss: (id: string) => void
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center"
}

const positionStyles: Record<ToastContainerProps["position"] & string, string> = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
}

export function ToastContainer({
  toasts,
  onDismiss,
  position = "bottom-right",
}: ToastContainerProps) {
  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)]",
        positionStyles[position]
      )}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
