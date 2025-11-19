'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react'

interface SetPasswordModalProps {
  onSuccess: (password: string) => void
  blocking: boolean
}

interface PasswordValidation {
  minLength: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
}

export function SetPasswordModal({ onSuccess, blocking }: SetPasswordModalProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validate password against requirements
  const validation: PasswordValidation = {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }

  const isPasswordValid = validation.minLength && validation.hasNumber && validation.hasSpecialChar
  const passwordsMatch = password === confirmPassword && password.length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate password requirements
    if (!isPasswordValid) {
      setError('Password does not meet all requirements')
      return
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    console.log('[SET_PASSWORD_MODAL] Password validated, calling onSuccess')
    onSuccess(password)
  }

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
            <div className="bg-green-100 p-4 rounded-full">
              <Lock className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Set Your Password</CardTitle>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-12"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Password must contain:</p>
              <div className="space-y-1">
                <RequirementItem
                  met={validation.minLength}
                  text="At least 8 characters"
                />
                <RequirementItem
                  met={validation.hasNumber}
                  text="At least 1 number"
                />
                <RequirementItem
                  met={validation.hasSpecialChar}
                  text="At least 1 special character (!@#$%^&*...)"
                />
                {confirmPassword.length > 0 && (
                  <RequirementItem
                    met={passwordsMatch}
                    text="Passwords match"
                  />
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isPasswordValid || !passwordsMatch}
              className="w-full bg-green-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
            >
              Set Password
            </button>

            {blocking && (
              <p className="text-xs text-gray-500 text-center">
                ⚠️ You must set a password to continue
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-gray-400" />
      )}
      <span className={met ? 'text-green-700' : 'text-gray-600'}>{text}</span>
    </div>
  )
}
