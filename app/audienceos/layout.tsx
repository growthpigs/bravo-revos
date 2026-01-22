"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createPortal } from "react-dom"

// Import AudienceOS-specific components from namespaced location
import { ThemeSync } from "@/components/audienceos/theme-sync"

// TODO: Import ChatInterface when wired up
// import { ChatInterface } from "@/components/audienceos/chat/chat-interface"

// Pages where chat should NOT render (auth pages, public pages)
const EXCLUDED_PATHS = [
  "/audienceos/forgot-password",
  "/audienceos/reset-password",
  "/audienceos/invite",
  "/audienceos/onboarding"
]

/**
 * AudienceOS nested layout
 *
 * This layout wraps all /audienceos/* routes. It:
 * 1. Does NOT include <html> or <body> (those are in root layout)
 * 2. Provides AudienceOS-specific context (theme sync, chat)
 * 3. Handles auth redirect for protected routes
 */
export default function AudienceOSLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const router = useRouter()
  const [chatPortalHost, setChatPortalHost] = useState<HTMLElement | null>(null)

  // Initialize portal host after DOM is ready
  useEffect(() => {
    setChatPortalHost(document.body)
  }, [])

  // Determine if chat should be visible
  const shouldShowChat =
    chatPortalHost &&
    !EXCLUDED_PATHS.some((path) => pathname.startsWith(path))

  return (
    <>
      <ThemeSync />
      {children}
      {/* TODO: Enable chat once ChatInterface is properly wired up
      {shouldShowChat && chatPortalHost && createPortal(
        <ChatInterface
          agencyId={'demo-agency'}
          userId={'anonymous'}
          context={null}
        />,
        chatPortalHost
      )}
      */}
    </>
  )
}
