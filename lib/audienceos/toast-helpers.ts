import { toast } from "sonner"

/**
 * Toast helper functions with consistent styling
 * Based on Linear/Codia patterns
 */

interface ToastOptions {
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
}

/**
 * Success toast with green styling
 * Use for: completed actions, saved changes, successful operations
 */
export function toastSuccess(title: string, options?: ToastOptions) {
  return toast.success(title, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  })
}

/**
 * Error toast with red styling
 * Use for: failed operations, validation errors, API errors
 */
export function toastError(title: string, options?: ToastOptions) {
  return toast.error(title, {
    description: options?.description,
    duration: options?.duration ?? 6000,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  })
}

/**
 * Warning toast with amber styling
 * Use for: potential issues, confirmations needed, approaching limits
 */
export function toastWarning(title: string, options?: ToastOptions) {
  return toast.warning(title, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  })
}

/**
 * Info toast with blue styling
 * Use for: updates, tips, non-critical information
 */
export function toastInfo(title: string, options?: ToastOptions) {
  return toast.info(title, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  })
}

/**
 * Loading toast that can be updated
 * Use for: async operations, uploads, processing
 *
 * @example
 * const id = toastLoading("Uploading file...")
 * // After operation completes:
 * toast.success("File uploaded!", { id })
 * // Or on error:
 * toast.error("Upload failed", { id })
 */
export function toastLoading(title: string) {
  return toast.loading(title)
}

/**
 * Promise toast that shows loading → success/error
 *
 * @example
 * toastPromise(
 *   saveClient(data),
 *   {
 *     loading: "Saving client...",
 *     success: "Client saved!",
 *     error: "Failed to save client"
 *   }
 * )
 */
export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: unknown) => string)
  }
) {
  return toast.promise(promise, messages)
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId)
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  toast.dismiss()
}
