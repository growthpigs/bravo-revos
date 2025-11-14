import React from 'react';
import { Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface DocumentTableViewProps {
  documents: Document[];
  onView: (document: Document) => void;
  onDelete?: (documentId: string) => Promise<void>;
}

export function DocumentTableView({
  documents,
  onView,
  onDelete,
}: DocumentTableViewProps) {
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation();
    if (!onDelete) return;

    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setIsDeleting(documentId);
    try {
      await onDelete(documentId);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-32">Created</TableHead>
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const formattedDate = new Date(doc.created_at).toLocaleDateString(
              'en-US',
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }
            );

            const fileTypeLabel =
              doc.file_type === 'markdown'
                ? 'Markdown'
                : doc.file_type === 'pdf'
                  ? 'PDF'
                  : doc.file_type === 'url'
                    ? 'URL'
                    : 'Document';

            return (
              <TableRow
                key={doc.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onView(doc)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{doc.title}</p>
                    {doc.description && (
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {fileTypeLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {formattedDate}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(e, doc.id)}
                        disabled={isDeleting === doc.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
