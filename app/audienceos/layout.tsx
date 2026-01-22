"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createPortal } from "react-dom"

// Import AudienceOS-specific components from namespaced location
import { ThemeSync } from "@/components/audienceos/theme-sync"
import { useAuth } from "@/hooks/audienceos/use-auth"

// TODO: Import ChatInterface when wired up
// import { ChatInterface } from "@/components/audienceos/chat/chat-interface"

// Pages that do NOT require authentication
const PUBLIC_PATHS = [
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
  const { isLoading, isAuthenticated } = useAuth()
  const [chatPortalHost, setChatPortalHost] = useState<HTMLElement | null>(null)

  // Check if current path requires authentication
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path))

  // Redirect to login if not authenticated and not on a public path
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicPath) {
      console.warn('[AudienceOS] Not authenticated, redirecting to login')
      router.push('/auth/login?redirect=' + encodeURIComponent(pathname))
    }
  }, [isLoading, isAuthenticated, isPublicPath, pathname, router])

  // Initialize portal host after DOM is ready
  useEffect(() => {
    setChatPortalHost(document.body)
  }, [])

  // Determine if chat should be visible
  const shouldShowChat =
    chatPortalHost &&
    !PUBLIC_PATHS.some((path) => pathname.startsWith(path))

  // Show loading state while checking auth (prevents flash of protected content)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-pulse text-white/50">Loading...</div>
      </div>
    )
  }

  // If not authenticated and not public path, don't render children (redirect happening)
  if (!isAuthenticated && !isPublicPath) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white/50">Redirecting to login...</div>
      </div>
    )
  }

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
