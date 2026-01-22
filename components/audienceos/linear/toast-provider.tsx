"use client"

import React, { createContext, useContext, useCallback, useState } from "react"
import { ToastContainer, type ToastProps, type ToastVariant } from "./toast"

type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center"

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  onRetry?: () => void
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  warning: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastCount = 0

function generateId() {
  return `toast-${++toastCount}-${Date.now()}`
}

interface ToastProviderProps {
  children: React.ReactNode
  position?: ToastPosition
  maxToasts?: number
}

export function ToastProvider({
  children,
  position = "bottom-right",
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
  }, [])

  const toast = useCallback(
    (options: ToastOptions): string => {
      const id = generateId()
      const newToast: ToastProps = {
        id,
        ...options,
        onDismiss: dismiss,
      }

      setToasts((prev) => {
        const updated = [newToast, ...prev]
        // Limit number of toasts
        if (updated.length > maxToasts) {
          return updated.slice(0, maxToasts)
        }
        return updated
      })

      return id
    },
    [dismiss, maxToasts]
  )

  const success = useCallback(
    (title: string, description?: string) => {
      return toast({ title, description, variant: "success" })
    },
    [toast]
  )

  const error = useCallback(
    (title: string, description?: string) => {
      return toast({ title, description, variant: "error", duration: 8000 })
    },
    [toast]
  )

  const warning = useCallback(
    (title: string, description?: string) => {
      return toast({ title, description, variant: "warning" })
    },
    [toast]
  )

  const info = useCallback(
    (title: string, description?: string) => {
      return toast({ title, description, variant: "info" })
    },
    [toast]
  )

  return (
    <ToastContext.Provider
      value={{ toast, success, error, warning, info, dismiss, dismissAll }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} position={position} />
    </ToastContext.Provider>
  )
}

export function useLinearToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useLinearToast must be used within a ToastProvider")
  }
  return context
}
