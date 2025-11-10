'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface DashboardSidebarProps {
  user: any
  client: any
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
  { name: 'Voice Cartridges', href: '/dashboard/cartridges', icon: Zap },
  { name: 'LinkedIn Accounts', href: '/dashboard/linkedin', icon: Linkedin },
  { name: 'Leads', href: '/dashboard/leads', icon: Users2 },
  { name: 'LinkedIn Posts', href: '/dashboard/posts', icon: Linkedin },
  { name: 'DM Sequences', href: '/dashboard/dm-sequences', icon: MessageSquare },
  { name: 'Lead Magnets', href: '/dashboard/lead-magnets', icon: Upload },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardSidebar({ user, client }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

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
