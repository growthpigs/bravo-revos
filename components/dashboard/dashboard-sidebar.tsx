'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  LogOut,
  Zap,
  BookOpen,
  Calendar,
  FlaskConical,
  Package
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isSandboxMode, toggleSandboxMode } from '@/lib/sandbox/sandbox-wrapper'

interface DashboardSidebarProps {
  user: any
  client: any
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scheduled Actions', href: '/dashboard/scheduled', icon: Calendar },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
  { name: 'Voice Cartridges', href: '/dashboard/cartridges', icon: Zap },
  { name: 'Products & Services', href: '/dashboard/products-services', icon: Package },
  { name: 'Offers', href: '/dashboard/offers', icon: Upload },
  { name: 'LinkedIn Accounts', href: '/dashboard/linkedin', icon: Linkedin },
  { name: 'Leads', href: '/dashboard/leads', icon: Users2 },
  { name: 'LinkedIn Posts', href: '/dashboard/posts', icon: Linkedin },
  { name: 'DM Sequences', href: '/dashboard/dm-sequences', icon: MessageSquare },
  { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: BookOpen },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardSidebar({ user, client }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 pt-16">

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}

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

          {/* User Profile Section */}
          <div className="px-3 py-4 mt-12">
            <div className="flex flex-col gap-2 mb-3">
              <p className="text-xs font-medium text-gray-500 truncate">
                {user?.full_name || user?.email}
              </p>
              <p className="text-xs text-gray-400 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-auto text-gray-500 hover:text-gray-600 hover:bg-gray-100 h-8 px-3"
              onClick={handleSignOut}
            >
              <LogOut className="h-3 w-3 mr-2" />
              Sign Out
            </Button>
          </div>
        </nav>
      </ScrollArea>
    </div>
  )
}
