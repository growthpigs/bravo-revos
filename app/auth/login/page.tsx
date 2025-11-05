'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * TEMPORARY AUTH BYPASS - Development Only
 *
 * Authentication is temporarily disabled to unblock feature development.
 * This page allows direct access to the dashboard without credentials.
 *
 * DO NOT DEPLOY TO PRODUCTION without re-implementing authentication.
 * See: docs/projects/bravo-revos/AUTH_BYPASS_TEMPORARY.md
 * Task: AUTH-FIX in Archon
 */
export default function LoginPage() {
  const router = useRouter()

  const handleEnterApp = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Bravo revOS</CardTitle>
          <CardDescription>
            Development Mode - Authentication Bypassed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Development Mode:</strong> Authentication is temporarily disabled.
              Click below to access the application.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={handleEnterApp} className="w-full">
            Enter App
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
