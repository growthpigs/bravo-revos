'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, Link as LinkIcon, FileText, Library, Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import LeadMagnetLibraryModal from '../lead-magnet-library-modal'

interface StepProps {
  data: any
  onNext: (data: any) => void
  onBack: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

const DELIVERY_METHODS = [
  {
    id: 'upload',
    name: 'File Upload',
    description: 'PDF, DOCX, or ZIP file',
    icon: Upload,
  },
  {
    id: 'link',
    name: 'External Link',
    description: 'Link to a page, Google Drive, or external resource',
    icon: LinkIcon,
  },
  {
    id: 'text',
    name: 'Text/Content',
    description: 'Paste text, HTML, or content directly',
    icon: FileText,
  },
]

export default function LeadMagnetSelectStep({ data, onNext, onBack, isFirstStep }: StepProps) {
  const [libraryModalOpen, setLibraryModalOpen] = useState(false)
  const [isCustom, setIsCustom] = useState<boolean | null>(!!data.libraryId ? false : data.isCustom ? true : null)
  const [formData, setFormData] = useState({
    libraryId: data.libraryId || null,
    isCustom: data.isCustom || false,
    leadMagnetTitle: data.leadMagnetTitle || '',
    deliveryMethod: data.deliveryMethod || 'upload',
    leadMagnetFile: data.leadMagnetFile || null,
    leadMagnetLink: data.leadMagnetLink || '',
    leadMagnetText: data.leadMagnetText || '',
    libraryMagnetTitle: data.libraryMagnetTitle || '',
    libraryMagnetUrl: data.libraryMagnetUrl || '',
    libraryMagnetCategory: data.libraryMagnetCategory || '',
  })
  const [fileName, setFileName] = useState(data.leadMagnetFile?.name || '')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, leadMagnetFile: file })
      setFileName(file.name)
    }
  }

  const handleLibrarySelect = (magnet: any) => {
    const updatedData = {
      ...formData,
      libraryId: magnet.id,
      libraryMagnetTitle: magnet.title,
      libraryMagnetUrl: magnet.url,
      libraryMagnetCategory: magnet.category,
      isCustom: false,
    }
    setLibraryModalOpen(false)
    onNext(updatedData)
  }

  const handleCreateCustom = () => {
    setFormData({
      ...formData,
      libraryId: null,
      libraryMagnetTitle: '',
      libraryMagnetUrl: '',
      libraryMagnetCategory: '',
      isCustom: true,
    })
    setIsCustom(true)
  }

  const handleSubmit = () => {
    // If user chose library magnet, just proceed
    if (!isCustom && formData.libraryId) {
      onNext(formData)
      return
    }

    // If user is creating custom, validate all fields
    if (isCustom) {
      if (!formData.leadMagnetTitle.trim()) {
        alert('Please enter a title for your lead magnet')
        return
      }

      if (formData.deliveryMethod === 'upload' && !formData.leadMagnetFile) {
        alert('Please upload a file')
        return
      }
      if (formData.deliveryMethod === 'link' && !formData.leadMagnetLink.trim()) {
        alert('Please enter a URL')
        return
      }
      if (formData.deliveryMethod === 'text' && !formData.leadMagnetText.trim()) {
        alert('Please enter your content')
        return
      }

      onNext(formData)
      return
    }

    // If neither library nor custom selected, show error
    alert('Please select or create a lead magnet')
  }

  return (
    <div className="space-y-8">
      {/* Step 1: Choose Your Lead Magnet */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-rose-500">1. Choose Your Lead Magnet</h3>
        <p className="text-sm text-slate-600">
          Browse from our library of 108 pre-built magnets or create your own custom one
        </p>

        {isCustom === null && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className="p-6 cursor-pointer transition-all border-2 border-slate-200 hover:border-blue-300 hover:shadow-md"
              onClick={() => setLibraryModalOpen(true)}
            >
              <div className="flex items-start gap-4">
                <Library className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Browse Library</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Choose from 108 pre-built, categorized lead magnets
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3"
                    onClick={() => setLibraryModalOpen(true)}
                  >
                    Open Library
                  </Button>
                </div>
              </div>
            </Card>

            <Card
              className="p-6 cursor-pointer transition-all border-2 border-slate-200 hover:border-emerald-300 hover:shadow-md"
              onClick={handleCreateCustom}
            >
              <div className="flex items-start gap-4">
                <Plus className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Create Custom</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Build your own lead magnet with upload, link, or text content
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={handleCreateCustom}
                  >
                    Create Custom
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Step 2: Title */}
      {isCustom && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-rose-500">2. Lead Magnet Title</h3>
          <p className="text-sm text-slate-600">
            What&apos;s the name of your lead magnet? (e.g., &quot;Ultimate LinkedIn Growth Guide&quot;)
          </p>
          <Input
            id="title"
            placeholder="Enter the title of your lead magnet"
            value={formData.leadMagnetTitle}
            onChange={(e) => setFormData({ ...formData, leadMagnetTitle: e.target.value })}
            className="text-base"
          />
        </div>
      )}

      {/* Step 3: Delivery Method */}
      {isCustom && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-rose-500">3. How Will You Deliver It?</h3>
          <p className="text-sm text-slate-600">
            Choose how to deliver your lead magnet to people who request it
          </p>
          <div className="grid grid-cols-1 gap-3">
            {DELIVERY_METHODS.map((method) => {
              const IconComponent = method.icon
              return (
                <Card
                  key={method.id}
                  className={`p-4 cursor-pointer transition-all border-2 ${
                    formData.deliveryMethod === method.id
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setFormData({ ...formData, deliveryMethod: method.id })}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="delivery"
                      value={method.id}
                      checked={formData.deliveryMethod === method.id}
                      onChange={() => setFormData({ ...formData, deliveryMethod: method.id })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-5 w-5 text-slate-600" />
                        <p className="font-semibold text-slate-900">{method.name}</p>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{method.description}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <Label className="text-base font-semibold">Add Your Lead Magnet Content</Label>

            {formData.deliveryMethod === 'upload' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  Upload your file (PDF, DOCX, or ZIP - max 10MB)
                </p>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                  {fileName ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-900">{fileName}</p>
                        <p className="text-xs text-slate-500">File selected</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, leadMagnetFile: null })
                          setFileName('')
                        }}
                        className="ml-auto text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-700">
                        Click to upload
                      </label>
                      <p className="text-xs text-slate-500 mt-2">or drag and drop</p>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.zip"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            )}

            {formData.deliveryMethod === 'link' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  Paste the URL where they can access your lead magnet
                </p>
                <Input
                  type="url"
                  placeholder="https://example.com/guide or https://drive.google.com/..."
                  value={formData.leadMagnetLink}
                  onChange={(e) => setFormData({ ...formData, leadMagnetLink: e.target.value })}
                  className="text-base"
                />
                <p className="text-xs text-slate-600">
                  Works with: Google Drive links, Dropbox, your website, landing pages, etc.
                </p>
              </div>
            )}

            {formData.deliveryMethod === 'text' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  Paste your content here. Can be plain text, HTML, or formatted content.
                </p>
                <Textarea
                  placeholder="Paste your lead magnet content here..."
                  value={formData.leadMagnetText}
                  onChange={(e) => setFormData({ ...formData, leadMagnetText: e.target.value })}
                  rows={6}
                  className="text-sm font-mono"
                />
                <p className="text-xs text-slate-600">
                  This content will be sent to them when they request it
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={isFirstStep}>
          Back
        </Button>
        <Button type="button" onClick={handleSubmit}>
          Continue
        </Button>
      </div>

      {/* Library Modal */}
      <LeadMagnetLibraryModal
        isOpen={libraryModalOpen}
        onClose={() => setLibraryModalOpen(false)}
        onSelect={handleLibrarySelect}
      />
    </div>
  )
}
