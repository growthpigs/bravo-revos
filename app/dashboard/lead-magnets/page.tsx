'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Download, FileText, Search } from 'lucide-react'
import { toast } from 'sonner'
import { LibraryTab } from '@/components/dashboard/lead-magnet-library-tab'
import { LeadMagnetAnalytics } from '@/components/dashboard/lead-magnet-analytics'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface LeadMagnet {
  id: string
  client_id: string
  name: string
  description: string | null
  file_path: string
  file_size: number | null
  file_type: string | null
  thumbnail_url: string | null
  download_count: number
  tags: string[] | null
  created_at: string
  updated_at: string
}

export default function LeadMagnetsPage() {
  const [leadMagnets, setLeadMagnets] = useState<LeadMagnet[]>([])
  const [filteredMagnets, setFilteredMagnets] = useState<LeadMagnet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [campaignUsageMap, setCampaignUsageMap] = useState<Record<string, number>>({})

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMagnet, setEditingMagnet] = useState<LeadMagnet | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [magnetToDelete, setMagnetToDelete] = useState<LeadMagnet | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadLeadMagnets()
  }, [])

  useEffect(() => {
    filterMagnets()
  }, [leadMagnets, searchTerm])

  const loadLeadMagnets = async () => {
    try {
      setIsLoading(true)

      // Get current user and client_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', user.id)
        .single()

      if (!userData?.client_id) throw new Error('No client associated with user')

      // Fetch lead magnets for this client
      const { data, error } = await supabase
        .from('lead_magnets')
        .select('*')
        .eq('client_id', userData.client_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeadMagnets(data || [])
    } catch (error) {
      console.error('Error loading lead magnets:', error)
      toast.error('Failed to load lead magnets')
    } finally {
      setIsLoading(false)
    }
  }

  const filterMagnets = () => {
    if (!searchTerm) {
      setFilteredMagnets(leadMagnets)
      return
    }

    const search = searchTerm.toLowerCase()
    const filtered = leadMagnets.filter(
      (magnet) =>
        magnet.name.toLowerCase().includes(search) ||
        magnet.description?.toLowerCase().includes(search) ||
        magnet.tags?.some(tag => tag.toLowerCase().includes(search))
    )
    setFilteredMagnets(filtered)
  }

  const handleOpenCreate = () => {
    setEditingMagnet(null)
    setFormData({ name: '', description: '', tags: '' })
    setSelectedFile(null)
    setShowCreateModal(true)
  }

  const handleOpenEdit = (magnet: LeadMagnet) => {
    setEditingMagnet(magnet)
    setFormData({
      name: magnet.name,
      description: magnet.description || '',
      tags: magnet.tags?.join(', ') || ''
    })
    setSelectedFile(null)
    setShowEditModal(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip'
    ]

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: PDF, DOCX, PPTX, ZIP')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size: 10MB')
      return
    }

    setSelectedFile(file)
  }

  const uploadFile = async (clientId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${clientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('lead-magnets')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    return fileName
  }

  const handleSave = async () => {
    try {
      if (!formData.name) {
        toast.error('Lead magnet name is required')
        return
      }

      if (!editingMagnet && !selectedFile) {
        toast.error('Please select a file to upload')
        return
      }

      setIsUploading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', user.id)
        .single()

      if (!userData?.client_id) throw new Error('No client associated with user')

      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      if (editingMagnet) {
        // Update existing lead magnet
        let filePath = editingMagnet.file_path
        let fileSize = editingMagnet.file_size
        let fileType = editingMagnet.file_type

        // If new file selected, upload and delete old
        if (selectedFile) {
          // Upload new file
          filePath = await uploadFile(userData.client_id, selectedFile)
          fileSize = selectedFile.size
          fileType = selectedFile.type

          // Delete old file
          const { error: deleteError } = await supabase.storage
            .from('lead-magnets')
            .remove([editingMagnet.file_path])

          if (deleteError) console.error('Error deleting old file:', deleteError)
        }

        const { error } = await supabase
          .from('lead_magnets')
          .update({
            name: formData.name,
            description: formData.description || null,
            file_path: filePath,
            file_size: fileSize,
            file_type: fileType,
            tags,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMagnet.id)

        if (error) throw error
        toast.success('Lead magnet updated successfully')
      } else {
        // Create new lead magnet
        if (!selectedFile) throw new Error('File required')

        // Upload file
        const filePath = await uploadFile(userData.client_id, selectedFile)

        const { error } = await supabase
          .from('lead_magnets')
          .insert({
            client_id: userData.client_id,
            name: formData.name,
            description: formData.description || null,
            file_path: filePath,
            file_size: selectedFile.size,
            file_type: selectedFile.type,
            tags,
            download_count: 0
          })

        if (error) throw error
        toast.success('Lead magnet created successfully')
      }

      setShowCreateModal(false)
      setShowEditModal(false)
      loadLeadMagnets()
    } catch (error: any) {
      console.error('Error saving lead magnet:', error)
      toast.error(error.message || 'Failed to save lead magnet')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteClick = (magnet: LeadMagnet) => {
    setMagnetToDelete(magnet)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!magnetToDelete) return

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('lead-magnets')
        .remove([magnetToDelete.file_path])

      if (storageError) console.error('Error deleting file:', storageError)

      // Delete from database
      const { error } = await supabase
        .from('lead_magnets')
        .delete()
        .eq('id', magnetToDelete.id)

      if (error) throw error

      toast.success('Lead magnet deleted successfully')
      setDeleteDialogOpen(false)
      setMagnetToDelete(null)
      loadLeadMagnets()
    } catch (error) {
      console.error('Error deleting lead magnet:', error)
      toast.error('Failed to delete lead magnet')
    }
  }

  const handleDownload = async (magnet: LeadMagnet) => {
    try {
      const { data, error } = await supabase.storage
        .from('lead-magnets')
        .download(magnet.file_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = magnet.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Increment download count
      await supabase.rpc('increment_download_count', { lead_magnet_id: magnet.id })
      loadLeadMagnets()

      toast.success('Download started')
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Failed to download file')
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '0 KB'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileText className="h-12 w-12 text-gray-400" />
    if (fileType.includes('pdf')) return <FileText className="h-12 w-12 text-red-500" />
    if (fileType.includes('word')) return <FileText className="h-12 w-12 text-blue-500" />
    if (fileType.includes('presentation')) return <FileText className="h-12 w-12 text-orange-500" />
    if (fileType.includes('zip')) return <FileText className="h-12 w-12 text-purple-500" />
    return <FileText className="h-12 w-12 text-gray-400" />
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Magnets</h1>
          <p className="text-muted-foreground mt-2">
            Browse library templates or manage your custom uploads
          </p>
        </div>
      </div>

      {/* Analytics */}
      <LeadMagnetAnalytics
        onDataLoaded={(data) => setCampaignUsageMap(data.campaignUsageMap)}
      />

      {/* Tabs */}
      <Tabs defaultValue="library" className="space-y-6">
        <TabsList>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="custom">My Custom Magnets</TabsTrigger>
        </TabsList>

        {/* Library Tab */}
        <TabsContent value="library">
          <LibraryTab />
        </TabsContent>

        {/* Custom Magnets Tab */}
        <TabsContent value="custom" className="space-y-6">
          {/* New Lead Magnet Button */}
          <div className="flex justify-end">
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              New Lead Magnet
            </Button>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Lead Magnets Count */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredMagnets.length} of {leadMagnets.length} lead magnets
            </span>
          </div>

          {/* Lead Magnets Grid */}
          {isLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">Loading lead magnets...</p>
              </CardContent>
            </Card>
          ) : filteredMagnets.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'No lead magnets found' : 'No lead magnets yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm
                    ? 'Try adjusting your search'
                    : 'Create your first lead magnet to start capturing leads'}
                </p>
                {!searchTerm && (
                  <Button onClick={handleOpenCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Lead Magnet
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMagnets.map((magnet) => (
                <Card key={magnet.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col h-full">
                      {/* File Icon */}
                      <div className="flex items-center justify-center h-24 bg-gray-50 rounded-lg mb-4">
                        {getFileIcon(magnet.file_type)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 mb-4">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-2">
                          {magnet.name}
                        </h3>
                        {magnet.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {magnet.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatFileSize(magnet.file_size)}</span>
                          <span>•</span>
                          <span>{magnet.download_count} downloads</span>
                          {campaignUsageMap[magnet.id] && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-medium">
                                Used in {campaignUsageMap[magnet.id]} campaign{campaignUsageMap[magnet.id] > 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>
                        {magnet.tags && magnet.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {magnet.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {magnet.tags.length > 3 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                                +{magnet.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(magnet)}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(magnet)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(magnet)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info Section */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-green-900 mb-2">What are Lead Magnets?</h3>
              <p className="text-sm text-green-800 mb-3">
                Lead magnets are valuable resources (PDFs, documents, templates, or guides) that you
                offer in exchange for contact information. They help you build your email list and
                nurture leads.
              </p>
              <p className="text-sm text-green-800">
                <strong>Supported formats:</strong> PDF, DOCX, PPTX, ZIP (max 10MB)
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Dialog
        open={showCreateModal || showEditModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false)
            setShowEditModal(false)
            setEditingMagnet(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMagnet ? 'Edit Lead Magnet' : 'Create New Lead Magnet'}
            </DialogTitle>
            <DialogDescription>
              {editingMagnet
                ? 'Update lead magnet information and file'
                : 'Upload a new lead magnet file'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Lead Magnet Name *</Label>
              <Input
                id="name"
                placeholder="2024 Marketing Guide"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="A comprehensive guide to modern marketing strategies..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="marketing, guide, 2024"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">
                File {editingMagnet ? '(optional - leave empty to keep current)' : '*'}
              </Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.docx,.pptx,.zip"
                onChange={handleFileSelect}
              />
              <p className="text-xs text-gray-500">
                Supported: PDF, DOCX, PPTX, ZIP • Max 10MB
              </p>
              {selectedFile && (
                <p className="text-sm text-green-600">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
              {editingMagnet && !selectedFile && (
                <p className="text-sm text-gray-600">
                  Current file: {formatFileSize(editingMagnet.file_size)}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                setShowEditModal(false)
                setEditingMagnet(null)
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isUploading}>
              {isUploading
                ? 'Uploading...'
                : editingMagnet
                ? 'Save Changes'
                : 'Create Lead Magnet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Lead Magnet?"
        description={`This will permanently delete "${magnetToDelete?.name}" and cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}
