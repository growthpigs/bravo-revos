"use client"

import React, { useEffect } from 'react'
import { motion } from 'motion/react'
import { useDocumentProcessing } from '@/hooks/use-document-processing'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react'

interface ProcessingPanelProps {
  onProcessingComplete?: () => void
}

export function ProcessingPanel({ onProcessingComplete }: ProcessingPanelProps) {
  const { isProcessing, status, error, fetchStatus, startProcessing } = useDocumentProcessing()

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleStartProcessing = async () => {
    try {
      await startProcessing()
      onProcessingComplete?.()
    } catch (error) {
      console.error('Processing failed:', error)
    }
  }

  const totalDocuments = status?.total || 0
  const processedDocuments = (status?.indexed || 0) + (status?.failed || 0)
  const progressPercentage = totalDocuments > 0 ? (processedDocuments / totalDocuments) * 100 : 0

  const getStatusColor = (statusType: string, count: number) => {
    if (count === 0) return 'secondary'

    switch (statusType) {
      case 'indexed':
        return 'default' // green
      case 'pending':
        return 'secondary'
      case 'indexing':
        return 'outline'
      case 'failed':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (statusType: string) => {
    switch (statusType) {
      case 'indexed':
        return <CheckCircle className="w-3 h-3" />
      case 'pending':
        return <Clock className="w-3 h-3" />
      case 'indexing':
        return <Loader2 className="w-3 h-3 animate-spin" />
      case 'failed':
        return <AlertCircle className="w-3 h-3" />
      default:
        return <FileText className="w-3 h-3" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Document Processing</h3>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchStatus}
            disabled={isProcessing}
          >
            <RefreshCw className="w-3 h-3" />
          </Button>

          {status && status.pending > 0 && (
            <Button
              size="sm"
              onClick={handleStartProcessing}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Process {status.pending} Files
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {totalDocuments > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Processing Progress</span>
            <span>{processedDocuments}/{totalDocuments} files</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      )}

      {/* Status Badges */}
      {status && (
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries({
            indexed: status.indexed,
            pending: status.pending,
            indexing: status.indexing,
            failed: status.failed,
          }).map(([statusType, count]) => (
            <Badge
              key={statusType}
              variant={getStatusColor(statusType, count)}
              className="flex items-center gap-1 text-xs"
            >
              {getStatusIcon(statusType)}
              <span className="capitalize">{statusType}: {count}</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Error Message - Handle auth errors gracefully */}
      {error && (
        error.includes('401') || error.includes('500') ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Sign in to manage documents</p>
            <p className="text-xs mt-1">Document processing requires authentication.</p>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm text-destructive">
              <div className="font-medium">Processing Error</div>
              <div className="text-xs mt-1 opacity-90">{error}</div>
            </div>
          </div>
        )
      )}

      {/* Instructions */}
      {status && status.total === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No documents uploaded yet.</p>
          <p className="text-xs">Upload documents to enable AI search.</p>
        </div>
      )}

      {status && status.pending === 0 && status.total > 0 && (
        <div className="text-center py-2 text-muted-foreground">
          <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-600" />
          <p className="text-xs">All documents are processed and ready for search.</p>
        </div>
      )}
    </motion.div>
  )
}