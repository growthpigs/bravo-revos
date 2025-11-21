'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  Megaphone,
  Users2,
  Settings,
  Linkedin,
  Webhook,
  Upload,
  MessageSquare,
  MessageCircle,
  Zap,
  BookOpen,
  Calendar,
  FlaskConical,
  Package,
  Rocket,
  Activity,
  Gift,
  Search,
  BarChart,
  Key,
  Database,
  Layers,
  FileText
} from 'lucide-react'
import { isSandboxMode, toggleSandboxMode } from '@/lib/sandbox/sandbox-wrapper'

interface DashboardSidebarProps {
  user: any
  client: any
}

interface MenuItem {
  icon: any
  label: string
  href: string
  badge?: string
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

const menuSections: MenuSection[] = [
  {
    title: "OUTREACH",
    items: [
      { icon: FileText, label: "Posts", href: "/dashboard/posts" },
      { icon: Rocket, label: "Campaigns", href: "/dashboard/campaigns" },
      { icon: Users2, label: "Pod Activity", href: "/dashboard/pod-activity", badge: "NEW" },
      { icon: MessageSquare, label: "Inbox", href: "/dashboard/inbox", badge: "Soon" },
      { icon: Activity, label: "Activity Feed", href: "/dashboard/activity", badge: "Soon" }
    ]
  },
  {
    title: "AI TRAINING",
    items: [
      { icon: Package, label: "Products & Services", href: "/dashboard/products-services" },
      { icon: Gift, label: "Offers", href: "/dashboard/offers", badge: "NEW" },
      { icon: MessageCircle, label: "Prompts", href: "/dashboard/prompts", badge: "Soon" },
      { icon: Layers, label: "Cartridges", href: "/dashboard/cartridges" }
    ]
  },
  {
    title: "FIND & MANAGE",
    items: [
      { icon: Search, label: "Lead Finder", href: "/dashboard/leads/finder", badge: "Soon" },
      { icon: Users2, label: "Leads", href: "/dashboard/leads" },
      { icon: BarChart, label: "Analytics", href: "/dashboard/analytics", badge: "Soon" }
    ]
  },
  {
    title: "DEVELOPER",
    items: [
      { icon: Key, label: "API Keys", href: "/dashboard/api-keys", badge: "Soon" },
      { icon: Webhook, label: "Webhooks", href: "/dashboard/webhooks" },
      { icon: Database, label: "Knowledge Base", href: "/dashboard/knowledge-base" },
      { icon: Activity, label: "System Health", href: "/dashboard/system-health" }
    ]
  }
]

export default function DashboardSidebar({ user, client }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [sandboxEnabled, setSandboxEnabled] = useState(false)

  useEffect(() => {
    setSandboxEnabled(isSandboxMode())
  }, [])

  const handleToggleSandbox = () => {
    const newMode = toggleSandboxMode()
    setSandboxEnabled(newMode)
    // Reload page to apply sandbox mode changes
    window.location.reload()
  }

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 pt-16">

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-7">
          {menuSections.map((section) => (
            <div key={section.title}>
              {/* Section Title */}
              <h3 className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </h3>

              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-900 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>

                      {item.badge && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase",
                          item.badge === "NEW"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-200 text-gray-500"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Divider */}
          <div className="my-4 border-t border-gray-200"></div>

          {/* Sandbox Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleSandbox}
            className={cn(
              'w-full justify-start gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              sandboxEnabled
                ? 'bg-yellow-50 text-yellow-900 hover:bg-yellow-100'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <FlaskConical className={cn(
              'h-5 w-5 flex-shrink-0',
              sandboxEnabled ? 'text-yellow-600' : ''
            )} />
            <span>Sandbox Mode</span>
            <span className={cn(
              'ml-auto text-xs font-semibold px-2 py-0.5 rounded',
              sandboxEnabled
                ? 'bg-yellow-200 text-yellow-800'
                : 'bg-gray-200 text-gray-600'
            )}>
              {sandboxEnabled ? 'ON' : 'OFF'}
            </span>
          </Button>

          <div className="my-4 border-t border-gray-200"></div>
        </nav>
      </ScrollArea>

      {/* Bottom Section - Book a Demo + User Profile */}
      <div className="mt-auto border-t border-gray-200 bg-white">
        {/* Book a Demo Button */}
        <div className="p-3">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm font-medium"
            disabled
          >
            <Calendar className="h-4 w-4 mr-2" />
            Book a Demo
          </Button>
        </div>

        {/* User Profile Section */}
        <div className="p-3 pt-0">
          {/* Clickable User Profile Card */}
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                {user?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() ||
                 user?.email?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
