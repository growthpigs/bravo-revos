'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AuthDebugPage() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('Test123456!')
  const [newPassword, setNewPassword] = useState('NewPassword123!')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Test current authentication
  const testAuth = async () => {
    setLoading(true)
    setResult(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setResult({
          success: false,
          message: `Auth failed: ${error.message}`,
          details: error
        })
      } else {
        // Get user details
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        setResult({
          success: true,
          message: 'Authentication successful!',
          user: data.user,
          userData: userData
        })

        // Sign out after test
        await supabase.auth.signOut()
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: `Error: ${err.message}`,
        details: err
      })
    } finally {
      setLoading(false)
    }
  }

  // Create new test user
  const createTestUser = async () => {
    setLoading(true)
    setResult(null)

    try {
      // First, sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: newPassword,
        options: {
          data: {
            email_confirmed: true, // Auto-confirm for testing
          }
        }
      })

      if (signUpError) {
        setResult({
          success: false,
          message: `Sign up failed: ${signUpError.message}`,
          details: signUpError
        })
        return
      }

      // Create user record in users table
      if (authData.user) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            agency_id: null, // Or set a test agency ID if you have one
            role: 'client_admin', // Default role
            first_name: 'Test',
            last_name: 'User',
            is_active: true
          })

        if (insertError) {
          setResult({
            success: false,
            message: `User record creation failed: ${insertError.message}`,
            details: insertError
          })
        } else {
          setResult({
            success: true,
            message: `User created successfully! Use password: ${newPassword}`,
            user: authData.user
          })
        }
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: `Error: ${err.message}`,
        details: err
      })
    } finally {
      setLoading(false)
    }
  }

  // Get current session
  const checkSession = async () => {
    setLoading(true)
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setResult({
          success: true,
          message: 'Active session found',
          session: session,
          userData: userData
        })
      } else {
        setResult({
          success: false,
          message: 'No active session'
        })
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: `Error: ${err.message}`,
        details: err
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Debug Tool</CardTitle>
            <CardDescription>
              Test authentication and create working test users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Authentication */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">Test Authentication</h3>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Current password"
                />
              </div>
              <Button onClick={testAuth} disabled={loading}>
                Test Login
              </Button>
            </div>

            {/* Create New User */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">Create New Test User</h3>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password for test user"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                This will create a new user with email: {email}
              </p>
              <Button onClick={createTestUser} disabled={loading} variant="secondary">
                Create Test User
              </Button>
            </div>

            {/* Check Session */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">Check Current Session</h3>
              <Button onClick={checkSession} disabled={loading} variant="outline">
                Check Session
              </Button>
            </div>

            {/* Results */}
            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">{result.message}</p>
                    {result.details && (
                      <pre className="text-xs overflow-auto p-2 bg-muted rounded">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                    {result.user && (
                      <div className="text-sm">
                        <p>User ID: {result.user.id}</p>
                        <p>Email: {result.user.email}</p>
                      </div>
                    )}
                    {result.userData && (
                      <div className="text-sm">
                        <p>Role: {result.userData.role}</p>
                        <p>Agency ID: {result.userData.agency_id || 'None'}</p>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">1. First, try "Test Login" with your current credentials</p>
            <p className="text-sm">2. If that fails, click "Create Test User" to create a fresh user</p>
            <p className="text-sm">3. Note the password shown after creation</p>
            <p className="text-sm">4. Use those credentials to log in at /auth/login</p>
            <p className="text-sm text-muted-foreground">
              Default test credentials: test@example.com / NewPassword123!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}