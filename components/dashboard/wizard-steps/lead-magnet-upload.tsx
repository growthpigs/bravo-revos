'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronRight, ChevronLeft, Upload, File, X } from 'lucide-react'

interface StepProps {
  data: any
  onNext: (data: any) => void
  onBack: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

export default function LeadMagnetUploadStep({ data, onNext, onBack }: StepProps) {
  const [formData, setFormData] = useState({
    leadMagnetTitle: data.leadMagnetTitle || '',
    leadMagnetFile: data.leadMagnetFile || null,
  })
  const [fileName, setFileName] = useState(data.leadMagnetFile?.name || '')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, leadMagnetFile: file })
      setFileName(file.name)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="leadMagnetTitle">Lead Magnet Title</Label>
          <Input
            id="leadMagnetTitle"
            placeholder="e.g., Ultimate LinkedIn Growth Guide"
            value={formData.leadMagnetTitle}
            onChange={(e) => setFormData({ ...formData, leadMagnetTitle: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">Upload File</Label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
            {fileName ? (
              <div className="flex items-center justify-center gap-3">
                <File className="h-8 w-8 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-900">{fileName}</p>
                  <p className="text-xs text-slate-500">File selected</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFormData({ ...formData, leadMagnetFile: null })
                    setFileName('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <Label
                  htmlFor="file"
                  className="cursor-pointer text-sm text-blue-600 hover:text-blue-700"
                >
                  Click to upload
                </Label>
                <p className="text-xs text-slate-500 mt-2">PDF, DOCX, or ZIP (max 10MB)</p>
              </>
            )}
            <Input
              id="file"
              type="file"
              className="hidden"
              accept=".pdf,.docx,.zip"
              onChange={handleFileChange}
              required={!fileName}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit">
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
