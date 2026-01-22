"use client"

import React from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown, Check, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore, APP_CONFIGS, type AppId } from "@/stores/app-store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AppSwitcherProps {
  collapsed?: boolean
}

export function AppSwitcher({ collapsed }: AppSwitcherProps) {
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
                className="flex items-center gap-1.5"
                style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
              >
                <span className="text-[17px] font-semibold tracking-tight text-foreground dark:text-white">
                  audience
                </span>
                <span
                  className="text-[17px] font-light tracking-tight bg-clip-text text-transparent"
                  style={{
                    backgroundImage: activeConfig.gradient,
                  }}
                >
                  OS
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
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
            if (config.url) {
              // External app - redirect to its deployment
              window.location.href = config.url
            } else {
              // Native app - just set active (already here)
              setActiveApp(appId)
            }
          }

          return (
            <DropdownMenuItem
              key={appId}
              onClick={handleClick}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                isActive && "bg-primary/5"
              )}
            >
              <span
                className="text-lg"
                role="img"
                aria-label={config.name}
              >
                {config.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="font-medium bg-clip-text text-transparent"
                    style={{
                      backgroundImage: config.gradient,
                    }}
                  >
                    {config.name}
                  </span>
                  {isActive && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                  {config.url && (
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
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
