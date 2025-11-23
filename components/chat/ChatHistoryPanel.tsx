import React from 'react';
import { Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  messages: any[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatHistoryPanelProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onDeleteAllConversations: () => void;
}

export function ChatHistoryPanel({
  conversations,
  currentConversationId,
  onLoadConversation,
  onDeleteConversation,
  onDeleteAllConversations,
}: ChatHistoryPanelProps) {

  // Helper: Get conversations grouped by time
  const getGroupedConversations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: Record<string, Conversation[]> = {
      'Today': [],
      'Yesterday': [],
      'Last 7 days': [],
      'Older': [],
    };

    conversations.forEach(conv => {
      const convDate = new Date(conv.updatedAt);
      const convDateOnly = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());

      if (convDateOnly.getTime() === today.getTime()) {
        groups['Today'].push(conv);
      } else if (convDateOnly.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(conv);
      } else if (convDateOnly.getTime() >= weekAgo.getTime()) {
        groups['Last 7 days'].push(conv);
      } else {
        groups['Older'].push(conv);
      }
    });

    return groups;
  };

  const groupedConversations = getGroupedConversations();
  const hasAnyConversations = Object.values(groupedConversations).some(group => group.length > 0);

  return (
    <div className="h-full flex flex-col bg-gray-50 border-l border-gray-200">
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">History</h3>
        <button
          onClick={onDeleteAllConversations}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          aria-label="Delete all"
          title="Delete all conversations"
        >
          <Trash2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedConversations).map(([timeGroup, convs]) =>
          convs.length > 0 ? (
            <div key={timeGroup}>
              <div className="px-3 pt-3 pb-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {timeGroup}
                </h4>
              </div>

              {convs.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => onLoadConversation(conv.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs hover:bg-gray-200 transition-colors group flex items-center justify-between",
                    currentConversationId === conv.id ? "bg-gray-200 text-gray-900 font-medium" : "text-gray-700"
                  )}
                >
                  <span className="truncate flex-1">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-300 rounded"
                    aria-label="Delete conversation"
                  >
                    <X className="w-3 h-3 text-gray-600" />
                  </button>
                </button>
              ))}
            </div>
          ) : null
        )}

        {hasAnyConversations && (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-gray-500">End of history</p>
          </div>
        )}
      </div>
    </div>
  );
}
