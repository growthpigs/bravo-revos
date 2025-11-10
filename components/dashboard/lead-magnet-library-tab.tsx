'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ExternalLink, Zap, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface LibraryMagnet {
  id: string
  title: string
  description: string | null
  url: string
  category: string | null
}

const CATEGORIES = [
  'All',
  'AI & Automation',
  'LinkedIn & Growth',
  'Sales & Outreach',
  'Email & Nurturing',
  'Tools & Systems',
  'General',
  'Content Creation'
]

export function LibraryTab() {
  const router = useRouter()
  const [magnets, setMagnets] = useState<LibraryMagnet[]>([])
  const [filteredMagnets, setFilteredMagnets] = useState<LibraryMagnet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  useEffect(() => {
    loadMagnets()
  }, [])

  useEffect(() => {
    filterMagnets()
  }, [magnets, searchTerm, selectedCategory])

  const loadMagnets = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/lead-magnets')
      if (!response.ok) throw new Error('Failed to load')

      const { data } = await response.json()
      setMagnets(data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load library')
    } finally {
      setIsLoading(false)
    }
  }

  const filterMagnets = () => {
    let filtered = magnets

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(m => m.category === selectedCategory)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search)
      )
    }

    setFilteredMagnets(filtered)
  }

  const handlePreview = (url: string) => {
    window.open(url, '_blank')
  }

  const handleUseInCampaign = (magnet: LibraryMagnet) => {
    router.push(`/dashboard/campaigns/new?library_magnet_id=${magnet.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search library templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredMagnets.length} of {magnets.length} templates
        </span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Loading library...</p>
          </CardContent>
        </Card>
      ) : filteredMagnets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">
              {searchTerm || selectedCategory !== 'All'
                ? 'No templates found. Try adjusting filters.'
                : 'No templates available.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMagnets.map(magnet => (
            <Card key={magnet.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                      {magnet.title}
                    </h3>
                    {magnet.description && (
                      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                        {magnet.description}
                      </p>
                    )}
                    {magnet.category && (
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {magnet.category}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(magnet.url)}
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUseInCampaign(magnet)}
                      className="flex-1"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Use
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-blue-900 mb-2">About the Library</h3>
          <p className="text-sm text-blue-800">
            Browse 98 pre-built lead magnet templates across 8 categories. Click "Preview" to see the template, or "Use" to add it to a campaign.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
