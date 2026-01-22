"use client"

import { forwardRef, type ComponentPropsWithoutRef } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type ButtonVariant = "default" | "ghost" | "outline"

export interface SendToAiButtonProps extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
  /** Context to send to Holy Grail Chat */
  context?: {
    type: "document" | "client" | "ticket" | "email" | "general"
    id?: string
    title?: string
    content?: string
    metadata?: Record<string, unknown>
  }
  /** Button label - defaults to "Send to AI" */
  label?: string
  /** Show icon only (for compact layouts) */
  iconOnly?: boolean
  /** Visual variant */
  variant?: ButtonVariant
}

/**
 * Reusable button to send context to Holy Grail Chat.
 * Used across the app to quickly get AI assistance on any item.
 */
const SendToAiButton = forwardRef<HTMLButtonElement, SendToAiButtonProps>(
  (
    {
      context,
      label = "Send to AI",
      iconOnly = false,
      variant = "default",
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Dispatch custom event to Holy Grail Chat
      if (context) {
        const event = new CustomEvent("sendToHolyGrailChat", {
          detail: context,
          bubbles: true,
        })
        window.dispatchEvent(event)
      }

      // Call any additional onClick handler
      onClick?.(e)
    }

    const baseStyles: Record<ButtonVariant, string> = {
      default: "bg-amber-200 hover:bg-amber-300 text-amber-900 border-amber-300 shadow-sm",
      ghost: "hover:bg-amber-100 text-amber-700",
      outline: "border-amber-300 text-amber-700 hover:bg-amber-50",
    }

    return (
      <Button
        ref={ref}
        type="button"
        variant="outline"
        className={cn(
          baseStyles[variant],
          iconOnly ? "px-2" : "",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        <Sparkles className={cn("h-3.5 w-3.5", !iconOnly && "mr-1.5")} />
        {!iconOnly && <span>{label}</span>}
      </Button>
    )
  }
)

SendToAiButton.displayName = "SendToAiButton"

export { SendToAiButton }
