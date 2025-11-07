'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ChevronRight, ChevronLeft, Upload, Link as LinkIcon, FileText, Library, Plus } from 'lucide-react'
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

// Pre-defined lead magnet templates
const LEAD_MAGNET_TEMPLATES = [
  {
    id: 'guide',
    name: 'Guide/Resource',
    description: 'E-book, checklist, or comprehensive guide',
    triggerExample: 'GUIDE',
  },
  {
    id: 'webinar',
    name: 'Webinar Recording',
    description: 'Video webinar or masterclass',
    triggerExample: 'WEBINAR',
  },
  {
    id: 'checklist',
    name: 'Checklist/Template',
    description: 'Actionable checklist or template',
    triggerExample: 'CHECKLIST',
  },
  {
    id: 'case-study',
    name: 'Case Study',
    description: 'Success story or case study',
    triggerExample: 'CASESTUDY',
  },
  {
    id: 'tool',
    name: 'Tool/Calculator',
    description: 'Interactive tool or calculator',
    triggerExample: 'TOOL',
  },
  {
    id: 'assessment',
    name: 'Assessment/Quiz',
    description: 'Self-assessment or quiz',
    triggerExample: 'ASSESSMENT',
  },
]

// Delivery methods for the lead magnet
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
  const [isCustom, setIsCustom] = useState(!data.libraryId)
  const [formData, setFormData] = useState({
    libraryId: data.libraryId || null,
    leadMagnetTemplate: data.leadMagnetTemplate || '',
    leadMagnetTitle: data.leadMagnetTitle || '',
    customTriggerWord: data.customTriggerWord || '',
    deliveryMethod: data.deliveryMethod || 'upload',
    // File upload
    leadMagnetFile: data.leadMagnetFile || null,
    // External link
    leadMagnetLink: data.leadMagnetLink || '',
    // Text content
    leadMagnetText: data.leadMagnetText || '',
    // Library magnet fields
    libraryMagnetTitle: data.libraryMagnetTitle || '',
    libraryMagnetUrl: data.libraryMagnetUrl || '',
    libraryMagnetCategory: data.libraryMagnetCategory || '',
  })
  const [fileName, setFileName] = useState(data.leadMagnetFile?.name || '')

  const selectedTemplate = LEAD_MAGNET_TEMPLATES.find(t => t.id === formData.leadMagnetTemplate)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, leadMagnetFile: file })
      setFileName(file.name)
    }
  }

  const handleLibrarySelect = (magnet: any) => {
    setFormData({
      ...formData,
      libraryId: magnet.id,
      libraryMagnetTitle: magnet.title,
      libraryMagnetUrl: magnet.url,
      libraryMagnetCategory: magnet.category,
    })
    setIsCustom(false)
    setLibraryModalOpen(false)
  }

  const handleCreateCustom = () => {
    setFormData({
      ...formData,
      libraryId: null,
      libraryMagnetTitle: '',
      libraryMagnetUrl: '',
      libraryMagnetCategory: '',
    })
    setIsCustom(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate based on whether using library or custom
    if (!isCustom && !formData.libraryId) {
      alert('Please select a lead magnet from the library')
      return
    }

    if (isCustom) {
      if (!formData.leadMagnetTemplate || !formData.leadMagnetTitle) {
        alert('Please select a template and enter a title')
        return
      }

      // Validate delivery method has content
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
    }

    onNext(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        {/* Browse vs Create Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">1. Choose Your Lead Magnet</Label>
          <p className="text-sm text-slate-600">
            Browse from our library of 108 pre-built magnets or create your own custom one
          </p>

          {/* If not selected yet, show both options */}
          {!isCustom && !formData.libraryId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Browse Library Option */}
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
                      onClick={(e) => {
                        e.stopPropagation()
                        setLibraryModalOpen(true)
                      }}
                    >
                      Open Library
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Create Custom Option */}
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCreateCustom()
                      }}
                    >
                      Create Custom
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* If library selected, show selected magnet */}
          {!isCustom && formData.libraryId && (
            <Card className="p-4 bg-blue-50 border-2 border-blue-200">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">Selected from Library:</p>
                <p className="text-base font-semibold text-blue-600">{formData.libraryMagnetTitle}</p>
                <p className="text-xs text-slate-600">{formData.libraryMagnetCategory}</p>
                {formData.libraryMagnetUrl && (
                  <p className="text-xs text-slate-500 truncate">{formData.libraryMagnetUrl}</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData({ ...formData, libraryId: null })
                  }}
                >
                  Change Selection
                </Button>
              </div>
            </Card>
          )}

          {/* Template Selection - only shown if creating custom */}
          {isCustom && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select Magnet Type</Label>
              <p className="text-sm text-slate-600">
                This determines how people will request your lead magnet via DM
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {LEAD_MAGNET_TEMPLATES.map((template) => (
                  <Card
                    key={template.id}
                    className={`p-4 cursor-pointer transition-all border-2 ${
                      formData.leadMagnetTemplate === template.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setFormData({ ...formData, leadMagnetTemplate: template.id })}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={formData.leadMagnetTemplate === template.id}
                        onChange={() => setFormData({ ...formData, leadMagnetTemplate: template.id })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{template.name}</p>
                        <p className="text-sm text-slate-600">{template.description}</p>
                        <p className="text-xs text-blue-600 mt-2">
                          Trigger: <span className="font-mono font-bold">{template.triggerExample}</span>
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {isCustom && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCustom(false)
                setFormData({ ...formData, libraryId: null })
              }}
            >
              Back to Browse/Create
            </Button>
          )}
        </div>

        {/* Lead Magnet Title - Only for custom */}
        {isCustom && (
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold">
              2. Lead Magnet Title
            </Label>
            <p className="text-sm text-slate-600">
              What&apos;s the name of your lead magnet? (e.g., &quot;Ultimate LinkedIn Growth Guide&quot;)
            </p>
            <Input
              id="title"
              placeholder="Enter the title of your lead magnet"
              value={formData.leadMagnetTitle}
              onChange={(e) => setFormData({ ...formData, leadMagnetTitle: e.target.value })}
              required
              className="text-base"
            />
          </div>
        )}

        {/* Delivery Method Selection - Only for custom */}
        {isCustom && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">3. How Will You Deliver It?</Label>
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
          </div>
        )}

        {/* Delivery Method Content - Only for custom */}
        {isCustom && formData.leadMagnetTemplate && (
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <Label className="text-base font-semibold">Add Your Lead Magnet Content</Label>

            {/* File Upload */}
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
                  <input
                    type="file"
                    id="fileInput"
                    className="hidden"
                    accept=".pdf,.docx,.zip"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            )}

            {/* External Link */}
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

            {/* Text Content */}
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
        )}

        {/* Custom Trigger Word (Optional) - Only for custom */}
        {isCustom && selectedTemplate && (
          <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Label htmlFor="trigger" className="text-base font-semibold text-blue-900">
              4. Customize Trigger Word (Optional)
            </Label>
            <p className="text-sm text-blue-800">
              By default, people will type <span className="font-mono font-bold">{selectedTemplate.triggerExample}</span> to request your {selectedTemplate.name.toLowerCase()}.
              You can customize this if needed.
            </p>
            <Input
              id="trigger"
              placeholder={selectedTemplate.triggerExample}
              value={formData.customTriggerWord}
              onChange={(e) => setFormData({ ...formData, customTriggerWord: e.target.value.toUpperCase() })}
              className="text-base font-mono"
            />
            {formData.customTriggerWord && (
              <p className="text-xs text-blue-700 mt-2">
                ✓ People will type <span className="font-mono font-bold">{formData.customTriggerWord}</span> to get your lead magnet
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={isFirstStep}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit">
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Library Modal */}
      <LeadMagnetLibraryModal
        isOpen={libraryModalOpen}
        onClose={() => setLibraryModalOpen(false)}
        onSelect={handleLibrarySelect}
      />
    </form>
  )
}
