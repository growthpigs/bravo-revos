/**
 * Hook for managing client assignments for Member users
 * Used by ClientAssignmentModal in Settings > Team Members
 */

import { useState, useCallback } from 'react'
import type { MemberClientAccess } from '@/types/rbac'

interface AssignmentWithClient extends MemberClientAccess {
  client: {
    id: string
    name: string
    company_name: string | null
    logo_url: string | null
  } | null
}

interface AvailableClient {
  id: string
  name: string
  company_name: string | null
  logo_url: string | null
}

interface UseClientAssignmentReturn {
  assignments: AssignmentWithClient[]
  availableClients: AvailableClient[]
  isLoading: boolean
  error: string | null
  fetchAssignments: () => Promise<void>
  fetchAvailableClients: () => Promise<void>
  assignClient: (clientId: string, permission: 'read' | 'write') => Promise<boolean>
  updatePermission: (assignmentId: string, permission: 'read' | 'write') => Promise<boolean>
  removeAssignment: (assignmentId: string) => Promise<boolean>
}

export function useClientAssignment(memberId: string): UseClientAssignmentReturn {
  const [assignments, setAssignments] = useState<AssignmentWithClient[]>([])
  const [availableClients, setAvailableClients] = useState<AvailableClient[]>([])
  const [loadingCount, setLoadingCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Derived loading state - true when any operation is in progress
  const isLoading = loadingCount > 0

  // Fetch current assignments for the member
  const fetchAssignments = useCallback(async () => {
    if (!memberId) return

    setLoadingCount((c) => c + 1)
    setError(null)

    try {
      const params = new URLSearchParams({ user_id: memberId })
      const res = await fetch(`/api/v1/rbac/client-access?${params}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch assignments')
      }

      const { data } = await res.json()
      setAssignments(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments')
      console.error('[useClientAssignment] fetchAssignments error:', err)
    } finally {
      setLoadingCount((c) => c - 1)
    }
  }, [memberId])

  // Fetch all agency clients (to show available options)
  const fetchAvailableClients = useCallback(async () => {
    setLoadingCount((c) => c + 1)

    try {
      const res = await fetch('/api/v1/clients?limit=100', {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to fetch clients')
      }

      const { data } = await res.json()
      setAvailableClients(data || [])
    } catch (err) {
      console.error('[useClientAssignment] fetchAvailableClients error:', err)
    } finally {
      setLoadingCount((c) => c - 1)
    }
  }, [])

  // Assign a client to the member
  const assignClient = useCallback(
    async (clientId: string, permission: 'read' | 'write'): Promise<boolean> => {
      setError(null)

      try {
        const res = await fetch('/api/v1/rbac/client-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            user_id: memberId,
            client_id: clientId,
            permission,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to assign client')
        }

        const { data: newAssignment } = await res.json()
        setAssignments((prev) => [newAssignment, ...prev])
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to assign client')
        console.error('[useClientAssignment] assignClient error:', err)
        return false
      }
    },
    [memberId]
  )

  // Update permission level for an assignment
  const updatePermission = useCallback(
    async (assignmentId: string, permission: 'read' | 'write'): Promise<boolean> => {
      setError(null)

      try {
        const res = await fetch(`/api/v1/rbac/client-access/${assignmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ permission }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update permission')
        }

        const { data: updated } = await res.json()
        setAssignments((prev) =>
          prev.map((a) => (a.id === assignmentId ? updated : a))
        )
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update permission')
        console.error('[useClientAssignment] updatePermission error:', err)
        return false
      }
    },
    []
  )

  // Remove a client assignment
  const removeAssignment = useCallback(
    async (assignmentId: string): Promise<boolean> => {
      setError(null)

      try {
        const res = await fetch(`/api/v1/rbac/client-access/${assignmentId}`, {
          method: 'DELETE',
          credentials: 'include',
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to remove assignment')
        }

        setAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove assignment')
        console.error('[useClientAssignment] removeAssignment error:', err)
        return false
      }
    },
    []
  )

  return {
    assignments,
    availableClients,
    isLoading,
    error,
    fetchAssignments,
    fetchAvailableClients,
    assignClient,
    updatePermission,
    removeAssignment,
  }
}
