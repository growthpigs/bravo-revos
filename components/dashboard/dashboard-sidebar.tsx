'use client'

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
  LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface DashboardSidebarProps {
  user: any
  client: any
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
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
    <div className="flex flex-col w-64 bg-white border-r border-slate-200">
      <div className="flex items-center gap-3 p-6 border-b border-slate-200">
        {client?.logo_url ? (
          <img src={client.logo_url} alt={client.name} className="h-8 w-8 rounded" />
        ) : (
          <div className="h-8 w-8 rounded bg-emerald-600 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 truncate">{client?.name}</h2>
          <p className="text-xs text-slate-500">Client Dashboard</p>
        </div>
      </div>

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
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback>
              {user?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.full_name || user?.email}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
