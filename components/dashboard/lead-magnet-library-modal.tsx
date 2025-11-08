'use client'

import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, X } from 'lucide-react'

interface LeadMagnet {
  id: string
  title: string
  description: string
  url: string
  category: string
  is_active: boolean
}

interface LeadMagnetLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (magnet: LeadMagnet) => void
}

const CATEGORIES = [
  'All',
  'LinkedIn & Growth',
  'AI & Automation',
  'Sales & Outreach',
  'Content Creation',
  'Email & Nurturing',
  'Offer & Positioning',
  'B2B Strategy',
  'Tools & Systems',
  'General',
]

const CATEGORY_COLORS: Record<string, string> = {
  'LinkedIn & Growth': 'bg-blue-100 text-blue-800',
  'AI & Automation': 'bg-purple-100 text-purple-800',
  'Sales & Outreach': 'bg-orange-100 text-orange-800',
  'Content Creation': 'bg-green-100 text-green-800',
  'Email & Nurturing': 'bg-pink-100 text-pink-800',
  'Offer & Positioning': 'bg-red-100 text-red-800',
  'B2B Strategy': 'bg-indigo-100 text-indigo-800',
  'Tools & Systems': 'bg-cyan-100 text-cyan-800',
  'General': 'bg-slate-100 text-slate-800',
}

export default function LeadMagnetLibraryModal({
  isOpen,
  onClose,
  onSelect,
}: LeadMagnetLibraryModalProps) {
  const [magnets, setMagnets] = useState<LeadMagnet[]>([])
  const [filteredMagnets, setFilteredMagnets] = useState<LeadMagnet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const fetchMagnets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/lead-magnets')
      if (!response.ok) {
        throw new Error('Failed to fetch lead magnets')
      }

      const result = await response.json()
      setMagnets(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('[LEAD_MAGNET_LIBRARY] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch lead magnets when modal opens
  useEffect(() => {
    if (isOpen && magnets.length === 0) {
      fetchMagnets()
    }
  }, [fetchMagnets, isOpen, magnets.length])

  // Filter magnets when search or category changes
  useEffect(() => {
    let filtered = magnets

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((m) => m.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query)
      )
    }

    setFilteredMagnets(filtered)
  }, [magnets, searchQuery, selectedCategory])

  const handleSelect = (magnet: LeadMagnet) => {
    onSelect(magnet)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse Lead Magnet Library</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Results count */}
          <div className="text-sm text-slate-600">
            {loading ? 'Loading...' : `${filteredMagnets.length} result${filteredMagnets.length !== 1 ? 's' : ''}`}
          </div>

          {/* Magnets Grid */}
          {error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-red-600 font-semibold mb-2">Error loading library</p>
                <p className="text-sm text-slate-600 mb-4">{error}</p>
                <Button onClick={fetchMagnets} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-600">Loading magnets...</p>
            </div>
          ) : filteredMagnets.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-slate-600 font-semibold mb-2">No magnets found</p>
                <p className="text-sm text-slate-500">
                  Try adjusting your search or filter
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                {filteredMagnets.map((magnet) => (
                  <Card
                    key={magnet.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-blue-300 group"
                    onClick={() => handleSelect(magnet)}
                  >
                    <div className="space-y-2">
                      {/* Category Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <Badge className={CATEGORY_COLORS[magnet.category] || CATEGORY_COLORS['General']}>
                          {magnet.category}
                        </Badge>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {magnet.title}
                      </h3>

                      {/* Description */}
                      {magnet.description && (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {magnet.description}
                        </p>
                      )}

                      {/* URL Preview */}
                      {magnet.url && (
                        <p className="text-xs text-slate-500 truncate hover:text-slate-700">
                          {magnet.url}
                        </p>
                      )}

                      {/* Select Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelect(magnet)
                        }}
                        size="sm"
                        className="w-full mt-2"
                        variant="outline"
                      >
                        Select
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
