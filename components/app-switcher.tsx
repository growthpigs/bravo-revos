"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore, APP_CONFIGS } from "@/stores/app-store"
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
 * App Switcher for RevOS
 *
 * Simple dropdown showing only the OTHER app (audienceOS).
 * Click to switch - no need to show current app in dropdown.
 */
export function AppSwitcher({ collapsed }: AppSwitcherProps) {
  const router = useRouter()
  const { setActiveApp } = useAppStore()

  // This is RevOS - show current app logo
  const activeConfig = APP_CONFIGS['revos']
  // The other app to switch to
  const otherConfig = APP_CONFIGS['audienceos']

  const handleSwitch = () => {
    setActiveApp('audienceos')
    router.push(otherConfig.basePath)
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
            <div
              className="flex items-center"
              style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
            >
              <span className="text-[15px] font-semibold tracking-tight text-gray-900">
                rev
              </span>
              <span
                className="text-[15px] font-light tracking-tight bg-clip-text text-transparent"
                style={{
                  backgroundImage: activeConfig.gradient,
                }}
              >
                OS
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
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
        className="w-[180px]"
      >
        <DropdownMenuItem
          onClick={handleSwitch}
          className="flex items-center justify-between cursor-pointer py-2"
        >
          <span
            className="text-sm text-gray-900"
            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
          >
            <span className="font-semibold">audience</span>
            <span
              className="font-light bg-clip-text text-transparent"
              style={{ backgroundImage: otherConfig.gradient }}
            >
              OS
            </span>
          </span>
          <ArrowUpRight className="w-3 h-3 text-gray-400" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
