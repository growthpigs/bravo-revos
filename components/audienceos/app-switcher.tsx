"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown, Check, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/audienceos/utils"
import { useAppStore, APP_CONFIGS, type AppId } from "@/stores/audienceos/app-store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/audienceos/ui/dropdown-menu"

interface AppSwitcherProps {
  collapsed?: boolean
}

export function AppSwitcher({ collapsed }: AppSwitcherProps) {
  const router = useRouter()
  const { setActiveApp } = useAppStore()
  // This deployment is always AudienceOS - the switcher just links to other apps
  const activeConfig = APP_CONFIGS['audienceos']

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
        className="w-[220px]"
      >
        {(Object.keys(APP_CONFIGS) as AppId[]).map((appId) => {
          const config = APP_CONFIGS[appId]
          const isActive = config.isNative // Show as active if this is the native app

          const handleClick = () => {
            if (config.isNative) {
              // Already on this app, just set state
              setActiveApp(appId)
            } else {
              // Navigate to other app via basePath routing (same domain)
              setActiveApp(appId)
              router.push(config.basePath)
            }
          }

          // Format name as "revOS" or "audienceOS"
          const formattedName = appId === 'revos' ? (
            <span style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
              <span className="font-semibold">rev</span>
              <span className="font-light">OS</span>
            </span>
          ) : (
            <span style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
              <span className="font-semibold">audience</span>
              <span className="font-light">OS</span>
            </span>
          )

          return (
            <DropdownMenuItem
              key={appId}
              onClick={handleClick}
              className={cn(
                "flex items-center gap-2 cursor-pointer py-2",
                isActive && "bg-primary/5"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">
                    {formattedName}
                  </span>
                  {isActive && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                  {!isActive && (
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {config.description}
                </p>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
