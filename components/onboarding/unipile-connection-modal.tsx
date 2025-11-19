'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Linkedin } from 'lucide-react'

interface UnipileConnectionModalProps {
  blocking: boolean
}

export function UnipileConnectionModal({ blocking }: UnipileConnectionModalProps) {
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
            onClick={async () => {
              try {
                console.log('[UNIPILE_MODAL] Connect LinkedIn clicked - calling API')

                // Call the create-hosted-link API to get Unipile OAuth URL
                const response = await fetch('/api/unipile/create-hosted-link', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    provider: 'linkedin',
                    onboarding: true, // Flag to indicate this is onboarding flow
                  }),
                })

                if (!response.ok) {
                  const error = await response.json()
                  console.error('[UNIPILE_MODAL] API error:', error)
                  alert('Failed to generate LinkedIn connection link. Please try again.')
                  return
                }

                const data = await response.json()
                console.log('[UNIPILE_MODAL] Got auth URL, redirecting...')

                // Redirect to Unipile OAuth page
                // After OAuth, Unipile will redirect back to /onboard-new?step=linkedin-success
                // and call the /api/unipile/notify webhook
                window.location.href = data.authUrl
              } catch (error) {
                console.error('[UNIPILE_MODAL] Error:', error)
                alert('An unexpected error occurred. Please try again.')
              }
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
