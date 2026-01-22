"use client"

import React, { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function DisplayPreferencesSection() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Wait for client-side hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = async (newTheme: "light" | "dark") => {
    try {
      setIsSaving(true)

      // Update theme locally
      setTheme(newTheme)

      // Save to API
      const response = await fetch("/api/v1/settings/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: "display",
          preferences: {
            theme: newTheme,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save theme preference")
      }

      toast({
        title: "Theme updated",
        description: `Switched to ${newTheme} mode`,
      })
    } catch (error) {
      console.error("Failed to save theme preference:", error)
      toast({
        title: "Error",
        description: "Failed to save theme preference",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Display Settings</h2>
        <p className="text-gray-600 dark:text-slate-400">Customize the appearance of your workspace</p>
      </div>

      {/* Theme Section */}
      <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Theme</h3>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">Choose your preferred color theme</p>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          {/* Light Theme Button */}
          <button
            onClick={() => handleThemeChange("light")}
            disabled={isSaving}
            className={`flex items-center justify-center gap-3 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer ${
              theme === "light"
                ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"
            } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Sun className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">Light</div>
              <div className="text-xs text-gray-600 dark:text-slate-400">Clean, bright interface</div>
            </div>
          </button>

          {/* Dark Theme Button */}
          <button
            onClick={() => handleThemeChange("dark")}
            disabled={isSaving}
            className={`flex items-center justify-center gap-3 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer ${
              theme === "dark"
                ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"
            } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Moon className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">Dark</div>
              <div className="text-xs text-gray-600 dark:text-slate-400">Easy on the eyes</div>
            </div>
          </button>
        </div>

        {isSaving && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving preference...
          </div>
        )}
      </div>
    </div>
  )
}
