"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Check, ArrowUpRight } from "lucide-react"
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

/**
 * App Switcher for Unified Platform
 *
 * Allows switching between RevOS and AudienceOS within the unified platform.
 * Uses router.push() for basePath-compatible navigation (same domain).
 */
export function AppSwitcher({ collapsed }: AppSwitcherProps) {
  const router = useRouter()
  const { setActiveApp } = useAppStore()
  // This deployment is always RevOS
  const activeConfig = APP_CONFIGS['revos']

  const handleAppSwitch = (appId: AppId) => {
    const config = APP_CONFIGS[appId]

    if (config.isNative) {
      // Already on this app, just set state
      setActiveApp(appId)
    } else {
      // Navigate to other app via basePath routing
      // router.push automatically handles basePath
      setActiveApp(appId)
      router.push(config.basePath)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer",
            collapsed ? "p-1.5 justify-center" : "py-2 px-3"
          )}
        >
          {!collapsed ? (
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-semibold tracking-tight text-gray-900">
                rev
              </span>
              <span
                className="text-lg font-light tracking-tight bg-clip-text text-transparent"
                style={{
                  backgroundImage: activeConfig.gradient,
                }}
              >
                OS
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
            </div>
          ) : (
            <span
              className="text-base font-semibold bg-clip-text text-transparent"
              style={{
                backgroundImage: activeConfig.gradient,
              }}
            >
              {activeConfig.shortName}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[220px]"
      >
        {(Object.keys(APP_CONFIGS) as AppId[]).map((appId) => {
          const config = APP_CONFIGS[appId]
          const isActive = config.isNative

          return (
            <DropdownMenuItem
              key={appId}
              onClick={() => handleAppSwitch(appId)}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                isActive && "bg-blue-50"
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
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  {!isActive && (
                    <ArrowUpRight className="w-3 h-3 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">
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
