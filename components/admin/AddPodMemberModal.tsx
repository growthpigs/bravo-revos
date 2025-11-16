'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { z } from 'zod'

// Zod validation schema (unipile_account_id optional for self-service onboarding)
const podMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  linkedin_url: z.string().url('Must be a valid URL').refine(
    (url) => url.includes('linkedin.com'),
    'Must be a LinkedIn URL'
  ),
  unipile_account_id: z.string().optional(), // Optional - members connect via onboarding
  client_id: z.string().uuid('Must select a client'),
})

interface PodMember {
  id: string
  client_id: string
  user_id: string
  name: string
  linkedin_url: string
  unipile_account_id: string | null // Nullable - connected via onboarding
  is_active: boolean
  onboarding_status?: string
  last_activity_at: string | null
  created_at: string
  updated_at: string
}

interface Client {
  id: string
  name: string
  slug: string
}

interface AddPodMemberModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editingMember?: PodMember | null
}

interface FormData {
  name: string
  linkedin_url: string
  unipile_account_id: string
  client_id: string
}

interface FormErrors {
  name?: string
  linkedin_url?: string
  unipile_account_id?: string
  client_id?: string
}

export function AddPodMemberModal({
  open,
  onClose,
  onSuccess,
  editingMember = null,
}: AddPodMemberModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    linkedin_url: '',
    unipile_account_id: '',
    client_id: '',
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadClients()
      if (editingMember) {
        setFormData({
          name: editingMember.name,
          linkedin_url: editingMember.linkedin_url,
          unipile_account_id: editingMember.unipile_account_id,
          client_id: editingMember.client_id,
        })
      } else {
        setFormData({
          name: '',
          linkedin_url: '',
          unipile_account_id: '',
          client_id: '',
        })
      }
      setFormErrors({})
    }
  }, [open, editingMember])

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, slug')
        .order('name')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error loading clients:', error)
      toast.error('Failed to load clients')
    }
  }

  const validateForm = (): boolean => {
    try {
      podMemberSchema.parse(formData)
      setFormErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: FormErrors = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as keyof FormErrors] = err.message
          }
        })
        setFormErrors(errors)
      }
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the validation errors')
      return
    }

    setIsSubmitting(true)

    try {
      // Get current user for user_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      if (editingMember) {
        // Update existing member
        const { error } = await supabase
          .from('pod_members')
          .update({
            name: formData.name,
            linkedin_url: formData.linkedin_url,
            unipile_account_id: formData.unipile_account_id,
            client_id: formData.client_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMember.id)

        if (error) throw error
        toast.success('Pod member updated successfully')
      } else {
        // Create new member
        const { error } = await supabase
          .from('pod_members')
          .insert({
            name: formData.name,
            linkedin_url: formData.linkedin_url,
            unipile_account_id: formData.unipile_account_id,
            client_id: formData.client_id,
            user_id: user.id, // Current authenticated user
            is_active: true,
          })

        if (error) throw error
        toast.success('Pod member added successfully')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error saving pod member:', error)
      toast.error(error.message || 'Failed to save pod member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingMember ? 'Edit Pod Member' : 'Add Pod Member'}
          </DialogTitle>
          <DialogDescription>
            {editingMember
              ? 'Update pod member information'
              : 'Add a new team member to participate in pod amplification'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="John Doe"
              className={formErrors.name ? 'border-red-500' : ''}
            />
            {formErrors.name && (
              <p className="text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn URL *</Label>
            <Input
              id="linkedin_url"
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => handleChange('linkedin_url', e.target.value)}
              placeholder="https://www.linkedin.com/in/username"
              className={formErrors.linkedin_url ? 'border-red-500' : ''}
            />
            {formErrors.linkedin_url && (
              <p className="text-sm text-red-600">{formErrors.linkedin_url}</p>
            )}
            <p className="text-xs text-gray-500">
              The member's LinkedIn profile URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unipile_account_id">Unipile Account ID *</Label>
            <Input
              id="unipile_account_id"
              value={formData.unipile_account_id}
              onChange={(e) => handleChange('unipile_account_id', e.target.value)}
              placeholder="acc_abc123xyz"
              className={formErrors.unipile_account_id ? 'border-red-500' : ''}
            />
            {formErrors.unipile_account_id && (
              <p className="text-sm text-red-600">{formErrors.unipile_account_id}</p>
            )}
            <p className="text-xs text-gray-500">
              Unipile account ID for session token management (no passwords stored)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => handleChange('client_id', value)}
            >
              <SelectTrigger className={formErrors.client_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.client_id && (
              <p className="text-sm text-red-600">{formErrors.client_id}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : editingMember
                ? 'Save Changes'
                : 'Add Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
