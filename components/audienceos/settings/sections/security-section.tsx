"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { useAuthStore } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Shield,
  Plus,
  MoreVertical,
  Trash2,
  Lock,
  Key,
  Smartphone,
  Globe,
  Cloud,
  ChevronRight,
  Sparkles,
  LogOut,
} from "lucide-react"

interface AllowedDomain {
  id: string
  domain: string
  addedOn: string
  addedBy: string
}

interface Session {
  id: string
  device: string
  location: string
  lastActive: string
  current: boolean
}

const initialDomains: AllowedDomain[] = [
  { id: "1", domain: "acme-agency.com", addedOn: "Dec 15, 2024", addedBy: "Admin" },
  { id: "2", domain: "acme-marketing.io", addedOn: "Jan 2, 2025", addedBy: "Admin" },
]

const initialSessions: Session[] = [
  { id: "1", device: "Chrome on MacOS", location: "San Francisco, CA", lastActive: "Now", current: true },
  { id: "2", device: "Safari on iPhone", location: "San Francisco, CA", lastActive: "2 hours ago", current: false },
  { id: "3", device: "Firefox on Windows", location: "New York, NY", lastActive: "3 days ago", current: false },
]

export function SecuritySection() {
  const router = useRouter()
  const { user } = useAuthStore()
  const isAdmin = user?.role === "admin" || user?.role === "owner"

  const [domains, setDomains] = useState<AllowedDomain[]>(initialDomains)
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [allowInvites, setAllowInvites] = useState(false)
  const [googleSso, setGoogleSso] = useState(true)
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [addDomainOpen, setAddDomainOpen] = useState(false)
  const [newDomain, setNewDomain] = useState("")
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleAddDomain = () => {
    if (newDomain.trim()) {
      setDomains([
        ...domains,
        {
          id: Date.now().toString(),
          domain: newDomain.trim(),
          addedOn: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          addedBy: "You",
        },
      ])
      setNewDomain("")
      setAddDomainOpen(false)
    }
  }

  const handleRemoveDomain = (id: string) => {
    setDomains(domains.filter((d) => d.id !== id))
  }

  const handleRevokeSession = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id))
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)

      // Create Supabase client
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Sign out
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('[Logout] Error:', error)
        // Still redirect even on error
      }

      // Redirect to login
      router.push('/login')
    } catch (error) {
      console.error('[Logout] Failed:', error)
      // Redirect anyway
      router.push('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="text-sm text-muted-foreground">
          Manage your workspace security and how members authenticate
        </p>
      </div>

      {/* Admin-only sections */}
      {isAdmin && (
        <>
          {/* Allowed Email Domains */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Allowed Email Domains
                  </CardTitle>
                  <CardDescription>
                    Anyone with an email at these domains can sign up for this workspace
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAddDomainOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add domain
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {domains.map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-center justify-between p-3 bg-muted/50 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{domain.domain}</p>
                      <p className="text-xs text-muted-foreground">
                        Added on {domain.addedOn} by {domain.addedBy}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemoveDomain(domain.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove domain
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
                {domains.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No domains configured. Add a domain to restrict signups.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Access Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Access Controls
              </CardTitle>
              <CardDescription>Configure who can access your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow users to send invites</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow organization members to invite new users to this workspace
                  </p>
                </div>
                <Switch checked={allowInvites} onCheckedChange={setAllowInvites} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require two-factor authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require all users to enable 2FA before accessing the workspace
                  </p>
                </div>
                <Switch checked={twoFactorRequired} onCheckedChange={setTwoFactorRequired} />
              </div>
            </CardContent>
          </Card>

          {/* Third-party App Management - Upgrade Card */}
          <Card className="border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Third-party App Management</CardTitle>
                    <CardDescription>
                      View and manage approved OAuth applications for your workspace
                    </CardDescription>
                  </div>
                </div>
                <Button variant="outline" className="bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upgrade your subscription to enable admins to view and manage approved OAuth applications.
              </p>
              <Button variant="link" className="px-0 mt-2 text-blue-600 dark:text-blue-400">
                Read more
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* SSO Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                Single Sign-On
              </CardTitle>
              <CardDescription>Configure SSO providers for your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Google</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow logins through Google single sign-on
                  </p>
                </div>
                <Switch checked={googleSso} onCheckedChange={setGoogleSso} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SAML</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow logins through your SAML identity provider
                  </p>
                </div>
                <Button variant="default" size="sm">
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Manage devices that are currently signed in to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-md">
                        <Cloud className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{session.device}</p>
                          {session.current && (
                            <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {session.location} · Last active {session.lastActive}
                        </p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Sign Out - Available to all users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </CardTitle>
          <CardDescription>
            Sign out of your account on this device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </Button>
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={addDomainOpen} onOpenChange={setAddDomainOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Allowed Domain</DialogTitle>
            <DialogDescription>
              Users with email addresses at this domain will be able to sign up.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddDomain()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDomainOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDomain}>Add Domain</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
