'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Linkedin } from 'lucide-react'

interface UnipileConnectionModalProps {
  onSuccess: (unipileAccountId: string) => void
  blocking: boolean
}

export function UnipileConnectionModal({ onSuccess, blocking }: UnipileConnectionModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        // If blocking, prevent closing by clicking outside
        if (!blocking) {
          e.stopPropagation()
        }
      }}
    >
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="border-b border-gray-100 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <Linkedin className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Connect Your LinkedIn</CardTitle>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-900 font-medium">
              To get started, we need to connect your LinkedIn account
            </p>
            <p className="text-sm text-gray-600">
              This allows us to help you manage your LinkedIn presence and engagement
            </p>
          </div>

          <button
            onClick={() => {
              // TODO: Implement proper Unipile OAuth flow
              // For now, simulate connection
              console.log('[UNIPILE_MODAL] Connect LinkedIn clicked')

              // In production, this would:
              // 1. Redirect to /api/linkedin/auth?onboarding=true
              // 2. Unipile OAuth flow completes
              // 3. Returns to /onboard-new?unipile_account_id=xyz
              // 4. onSuccess callback stores the ID

              // Simulating successful connection for now
              const mockUnipileId = `unipile_${Date.now()}`
              onSuccess(mockUnipileId)
            }}
            className="w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            Connect LinkedIn Account
          </button>

          {blocking && (
            <p className="text-xs text-gray-500 text-center">
              ⚠️ You must connect LinkedIn to continue
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
