'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Unplug,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface IntegrationSettingsModalProps {
  integration: {
    id: string
    name: string
    provider: string
    status: 'connected' | 'disconnected' | 'error' | 'syncing'
    lastSync?: string
    accounts?: number
    icon: React.ReactNode
    color: string
  } | null
  isOpen: boolean
  onClose: () => void
  onRefetch: () => void
}

export function IntegrationSettingsModal({
  integration,
  isOpen,
  onClose,
  onRefetch,
}: IntegrationSettingsModalProps) {
  const [isTesting, setIsTesting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  if (!integration) return null

  const statusConfig = {
    connected: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800',
      label: 'Connected',
      variant: 'default' as const,
    },
    disconnected: {
      icon: XCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-950/20',
      borderColor: 'border-gray-200 dark:border-gray-800',
      label: 'Disconnected',
      variant: 'secondary' as const,
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800',
      label: 'Error',
      variant: 'destructive' as const,
    },
    syncing: {
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      label: 'Syncing',
      variant: 'default' as const,
    },
  }

  const config = statusConfig[integration.status]
  const StatusIcon = config.icon

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const response = await fetch(`/api/v1/integrations/${integration.id}/test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to test connection')
      }

      const result = await response.json()
      toast.success('Connection test successful', {
        description: result.message || 'Integration is working correctly',
      })
      onRefetch()
    } catch (error) {
      toast.error('Connection test failed', {
        description: error instanceof Error ? error.message : 'Failed to test connection',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch(`/api/v1/integrations/${integration.id}/sync`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sync integration')
      }

      const result = await response.json()
      toast.success('Sync started', {
        description: result.message || 'Integration is now syncing',
      })
      onRefetch()
    } catch (error) {
      toast.error('Sync failed', {
        description: error instanceof Error ? error.message : 'Failed to start sync',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const response = await fetch(`/api/v1/integrations/${integration.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to disconnect integration')
      }

      toast.success('Integration disconnected', {
        description: `${integration.name} has been disconnected successfully`,
      })
      onRefetch()
      setShowDisconnectDialog(false)
      onClose()
    } catch (error) {
      toast.error('Disconnect failed', {
        description: error instanceof Error ? error.message : 'Failed to disconnect integration',
      })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${integration.color}20` }}
              >
                {integration.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span>{integration.name}</span>
                  <Badge variant={config.variant} className="gap-1">
                    <StatusIcon className="w-3 h-3" />
                    {config.label}
                  </Badge>
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Manage your {integration.name} integration settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Connection Info Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Connection Info</h3>
              <div
                className={cn(
                  'p-4 rounded-lg border',
                  config.bgColor,
                  config.borderColor,
                )}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className={cn('font-medium', config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Last Sync</span>
                    <span className="font-medium">{formatDate(integration.lastSync)}</span>
                  </div>
                  {integration.accounts !== undefined && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Connected Accounts</span>
                      <span className="font-medium">{integration.accounts}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Actions</h3>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleTest}
                  disabled={isTesting || integration.status === 'disconnected'}
                >
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleSync}
                  disabled={isSyncing || integration.status === 'disconnected'}
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>

                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => setShowDisconnectDialog(true)}
                  disabled={integration.status === 'disconnected'}
                >
                  <Unplug className="w-4 h-4" />
                  Disconnect
                </Button>
              </div>
            </div>

            {/* Activity Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Recent Activity</h3>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground p-3 bg-secondary/50 rounded-md">
                  {integration.status === 'connected' && integration.lastSync
                    ? `Last synced ${formatDate(integration.lastSync)}`
                    : integration.status === 'disconnected'
                      ? 'Integration is not connected'
                      : integration.status === 'error'
                        ? 'Connection error - please test connection'
                        : 'Sync in progress...'}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {integration.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your {integration.name} integration. You will need to
              reconnect and re-authorize to use this integration again. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className={cn('bg-destructive text-white hover:bg-destructive/90')}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
