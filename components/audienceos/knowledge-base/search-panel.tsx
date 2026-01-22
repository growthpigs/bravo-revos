"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useDocumentSearch } from '@/hooks/use-document-search'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Loader2,
  FileText,
  MessageCircle,
  Clock,
  X,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchPanelProps {
  className?: string
}

export function SearchPanel({ className }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const { isSearching, results, error, searchDocuments, clearResults } = useDocumentSearch()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) return

    try {
      await searchDocuments(query.trim())
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleClear = () => {
    setQuery('')
    clearResults()
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Ask a question about your documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10"
            disabled={isSearching}
          />
          {(query || results) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={handleClear}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="w-full"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search Documents
            </>
          )}
        </Button>
      </form>

      {/* Error Message - Handle auth errors gracefully */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {error.includes('401') || error.includes('500') ? (
              <div className="text-center py-6 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Sign in to search documents</p>
                <p className="text-xs mt-1">Document search requires authentication.</p>
              </div>
            ) : (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-destructive">
                    <div className="font-medium">Search Failed</div>
                    <div className="text-xs mt-1 opacity-90">{error}</div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Results Header */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Search Results</span>
              <div className="flex items-center gap-1 ml-auto text-xs">
                <Clock className="w-3 h-3" />
                <span>{new Date(results.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Query */}
            <div className="p-3 bg-secondary/50 rounded-md">
              <div className="text-xs text-muted-foreground mb-1">Your question:</div>
              <div className="text-sm font-medium">{results.query}</div>
            </div>

            {/* Answer */}
            <div className="p-4 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Answer</span>
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {results.answer}
              </div>
            </div>

            {/* Documents Searched */}
            {results.documentsSearched.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  <span>Documents searched ({results.documentsSearched.length})</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {results.documentsSearched.map((doc) => (
                    <Badge
                      key={doc.id}
                      variant="outline"
                      className="text-xs"
                      title={doc.title}
                    >
                      <span className="truncate max-w-[120px]">
                        {doc.title}
                      </span>
                      <span className="ml-1 opacity-60">
                        ({doc.category})
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!results && !error && !isSearching && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium mb-1">Search Your Knowledge Base</p>
          <p className="text-xs">
            Ask questions about your uploaded documents.<br />
            The AI will search through indexed files to find answers.
          </p>
        </div>
      )}
    </div>
  )
}