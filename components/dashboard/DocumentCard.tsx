import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Document {
  id: string;
  title: string;
  description?: string;
  content: string;
  file_type: string;
  created_at: string;
  created_by?: string;
  metadata?: Record<string, any>;
}

interface DocumentCardProps {
  document: Document;
  onView: (document: Document) => void;
  onDelete?: (documentId: string) => Promise<void>;
}

export function DocumentCard({ document, onView, onDelete }: DocumentCardProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;

    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(document.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = new Date(document.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const contentPreview = document.description || document.content.substring(0, 150);

  return (
    <Card
      className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onView(document)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-1">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {document.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{formattedDate}</p>
            </div>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-gray-600 line-clamp-3">
          {contentPreview}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-3 border-t">
        <Badge variant="outline" className="text-xs">
          {document.file_type === 'markdown'
            ? 'Markdown'
            : document.file_type === 'pdf'
              ? 'PDF'
              : document.file_type === 'url'
                ? 'URL'
                : 'Document'}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onView(document);
          }}
          className="text-blue-600 hover:text-blue-700"
        >
          View →
        </Button>
      </CardFooter>
    </Card>
  );
}
