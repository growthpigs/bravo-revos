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
  Users,
  Building2,
  Settings,
  BarChart3,
  UserCircle,
  LogOut,
  Megaphone,
  Activity,
  FileCode,
  UsersRound
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AdminSidebarProps {
  user: any
  agency: any
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'System Health', href: '/admin/system-health', icon: Activity },
  { name: 'Cartridges', href: '/admin/console-config', icon: FileCode },
  { name: 'Clients', href: '/admin/clients', icon: Building2 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Campaigns', href: '/admin/campaigns', icon: Megaphone },
  { name: 'Pods', href: '/admin/pods', icon: UsersRound },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminSidebar({ user, agency }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-screen w-64 bg-white border-r border-gray-200">
      {/* Logo/Agency Header */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-200">
        {agency?.logo_url ? (
          <Image
            src={agency.logo_url}
            alt={agency.name}
            width={32}
            height={32}
            className="h-8 w-8 rounded object-cover"
            unoptimized
          />
        ) : (
          <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 truncate">{agency?.name}</h2>
          <p className="text-xs text-gray-500">Agency Portal</p>
        </div>
      </div>

      {/* Navigation */}
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
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User Info at Bottom - Fixed Position */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback className="bg-blue-600 text-white">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.full_name || user?.email?.split('@')[0] || 'Admin User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email || 'admin@example.com'}
            </p>
            <p className="text-xs text-gray-400 capitalize">
              {user?.role?.replace('_', ' ') || 'Agency Admin'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={handleSignOut}
        >
          <LogOut className="h-3 w-3 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
