"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Check } from "lucide-react"
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

/**
 * App Switcher - OpenAI style
 * Clean dropdown showing all apps with checkmark on current selection
 */
export function AppSwitcher({ collapsed }: AppSwitcherProps) {
  const router = useRouter()
  const { activeApp, setActiveApp } = useAppStore()

  const handleSwitch = (appId: AppId) => {
    if (appId === activeApp) return
    setActiveApp(appId)
    router.push(APP_CONFIGS[appId].basePath)
  }

  const currentApp = APP_CONFIGS[activeApp] || APP_CONFIGS['audienceos']

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 hover:bg-secondary/50 rounded-md transition-colors cursor-pointer",
            collapsed ? "p-1.5 justify-center" : "py-1 px-2"
          )}
        >
          {!collapsed ? (
            <>
              <span className="text-[14px] font-medium text-foreground">
                {currentApp.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </>
          ) : (
            <span className="text-[14px] font-semibold text-foreground">
              {currentApp.shortName}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="w-[200px] p-1 border-0 shadow-lg"
      >
        {(Object.keys(APP_CONFIGS) as AppId[]).map((appId) => {
          const config = APP_CONFIGS[appId]
          const isCurrent = appId === activeApp

          return (
            <DropdownMenuItem
              key={appId}
              onClick={() => handleSwitch(appId)}
              className={cn(
                "flex items-center justify-between cursor-pointer px-2 py-1.5 rounded-sm",
                isCurrent && "bg-secondary/50"
              )}
            >
              <span className="text-[14px] text-foreground">
                {config.name}
              </span>
              {isCurrent && (
                <Check className="w-4 h-4 text-foreground" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
