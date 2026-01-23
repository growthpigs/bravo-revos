"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/audienceos/utils"
import { useAppStore, APP_CONFIGS } from "@/stores/audienceos/app-store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/audienceos/ui/dropdown-menu"

interface AppSwitcherProps {
  collapsed?: boolean
}

/**
 * App Switcher for AudienceOS
 *
 * Simple dropdown showing only the OTHER app (revOS).
 * Click to switch - no need to show current app in dropdown.
 */
export function AppSwitcher({ collapsed }: AppSwitcherProps) {
  const router = useRouter()
  const { setActiveApp } = useAppStore()

  // This is AudienceOS - show current app logo
  const activeConfig = APP_CONFIGS['audienceos']
  // The other app to switch to
  const otherConfig = APP_CONFIGS['revos']

  const handleSwitch = () => {
    setActiveApp('revos')
    router.push(otherConfig.basePath)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 hover:bg-secondary/50 rounded-md transition-colors cursor-pointer",
            collapsed ? "p-1.5 justify-center" : "py-1.5 px-2"
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {!collapsed ? (
              <motion.div
                key="full-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center"
                style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
              >
                <span className="text-[15px] font-semibold tracking-tight text-foreground dark:text-white">
                  audience
                </span>
                <span
                  className="text-[15px] font-light tracking-tight bg-clip-text text-transparent"
                  style={{
                    backgroundImage: activeConfig.gradient,
                  }}
                >
                  OS
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              </motion.div>
            ) : (
              <motion.span
                key="short-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[15px] font-semibold bg-clip-text text-transparent"
                style={{
                  backgroundImage: activeConfig.gradient,
                }}
              >
                {activeConfig.shortName}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="min-w-0 w-auto p-1"
      >
        <DropdownMenuItem
          onClick={handleSwitch}
          className="cursor-pointer px-3 py-2"
        >
          <span
            className="text-[15px]"
            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
          >
            <span className="font-semibold text-foreground">rev</span>
            <span
              className="font-light bg-clip-text text-transparent"
              style={{ backgroundImage: otherConfig.gradient }}
            >
              OS
            </span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
