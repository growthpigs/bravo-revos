import { useState, useEffect, useCallback } from 'react'

// Types for the detailed client data from API
export interface StageEvent {
  id: string
  from_stage: string | null
  to_stage: string
  moved_at: string
  notes: string | null
  moved_by: {
    id: string
    first_name: string
    last_name: string
  } | null
}

export interface ClientTask {
  id: string
  name: string
  description: string | null
  stage: string | null
  is_completed: boolean
  due_date: string | null
  assigned_to: string | null
  sort_order: number
}

export interface ClientTicket {
  id: string
  number: number
  title: string
  status: string
  priority: string
  category: string
  created_at: string
}

export interface ClientCommunication {
  id: string
  platform: string
  subject: string | null
  content: string
  received_at: string
}

export interface ClientAssignment {
  id: string
  role: string
  user: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

export interface DetailedClient {
  id: string
  agency_id: string
  name: string
  contact_email: string | null
  contact_name: string | null
  stage: string
  health_status: string
  days_in_stage: number
  notes: string | null
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  // Related data
  assignments: ClientAssignment[]
  tickets: ClientTicket[]
  communications: ClientCommunication[]
  stage_events: StageEvent[]
  tasks: ClientTask[]
}

interface UseClientDetailResult {
  client: DetailedClient | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useClientDetail(clientId: string | null): UseClientDetailResult {
  const [client, setClient] = useState<DetailedClient | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchClient = useCallback(async () => {
    if (!clientId) {
      setClient(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/v1/clients/${clientId}`, { credentials: 'include' })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to view client details')
        } else if (response.status === 404) {
          setError('Client not found')
        } else {
          setError('Failed to load client details')
        }
        setClient(null)
        return
      }

      const { data } = await response.json()
      setClient(data)
    } catch (err) {
      console.error('Error fetching client:', err)
      setError('Failed to load client details')
      setClient(null)
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  return {
    client,
    isLoading,
    error,
    refetch: fetchClient,
  }
}
