import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Save } from 'lucide-react';

interface DocumentPanelProps {
  documentTitle: string;
  documentContent: string;
  onSaveContent: (newContent: string) => void;
  onPostLinkedIn: () => void;
  isPosted: boolean;
  onSaveToCampaign: () => void;
}

export function DocumentPanel({
  documentTitle,
  documentContent,
  onSaveContent,
  onPostLinkedIn,
  isPosted,
  onSaveToCampaign,
}: DocumentPanelProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState(documentContent);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Sync local edited content when document content changes
  useEffect(() => {
    setEditedContent(documentContent);
  }, [documentContent]);

  const handleSaveEdit = () => {
    onSaveContent(editedContent);
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(documentContent);
    setIsEditMode(false);
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(documentContent);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="h-full overflow-hidden bg-white flex flex-col">
      {/* Document Header */}
      <div className="h-14 px-6 bg-gray-50 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">{documentTitle}</h2>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 text-xs font-medium bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                aria-label="Save changes"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 text-xs font-medium bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition-colors"
                aria-label="Cancel editing"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditMode(true)}
                className="px-3 py-1 text-xs font-medium bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition-colors"
                aria-label="Edit document"
              >
                Edit
              </button>
              <button
                onClick={onPostLinkedIn}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${ 
                  isPosted
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                aria-label={isPosted ? "Posted" : "Post to LinkedIn"}
                disabled={!documentContent || isPosted || isEditMode}
              >
                {isPosted ? 'Posted ✓' : 'Post to LinkedIn'}
              </button>
              <button
                onClick={handleCopyContent}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                aria-label={copiedFeedback ? "Copied!" : "Copy document"}
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={onSaveToCampaign}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                aria-label="Save document"
                title="Save to knowledge base (optionally link to campaign)"
                disabled={isEditMode}
              >
                <Save className="w-4 h-4 text-gray-600" />
              </button>
            </>
          )}
        </div>
      </div>
      {/* Document Content Area */}
      <div className="flex-1 overflow-y-auto">
        {isEditMode ? (
          // Edit mode - show textarea with markdown
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full p-6 text-sm text-gray-700 font-mono border-0 rounded-none focus:outline-none resize-none bg-white"
            placeholder="Enter your markdown content here..."
            spellCheck="false"
          />
        ) : (
          // View mode - show formatted markdown (left-justified)
          <div className="px-16 pb-12" style={{ paddingTop: '100px' }}>
            <div className="max-w-4xl text-left">
              {documentContent ? (
                // Check if this is the placeholder text
                documentContent.startsWith('[') && documentContent.endsWith(']') ? (
                  <p className="font-mono text-xs uppercase tracking-wide text-gray-400">
                    {documentContent}
                  </p>
                ) : (
                  <div className="prose prose-lg max-w-none text-left">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-6xl font-bold mb-8 text-gray-900">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-5xl font-bold mb-3 mt-6 text-gray-900">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-4xl font-semibold mb-2 mt-4 text-gray-900">{children}</h3>
                        ),
                        p: ({ children }) => (
                          <p className="text-lg leading-normal mb-2 text-gray-700">{children}</p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-bold text-gray-900">{children}</strong>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc ml-6 mb-2 space-y-1 text-gray-700">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal ml-6 mb-2 space-y-1 text-gray-700">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-gray-700">{children}</li>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">{children}</blockquote>
                        ),
                        hr: () => null,
                      }}
                    >
                      {documentContent}
                    </ReactMarkdown>
                  </div>
                )
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
