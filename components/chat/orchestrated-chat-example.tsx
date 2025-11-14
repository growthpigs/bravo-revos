'use client';

import React, { useState } from 'react';
import { useOrchestration } from '@/hooks/use-orchestration';
import { InlineButton, InlineButtonGroup } from './inline-button';
import { OrchestrationResponse } from '@/lib/orchestration/response-builder';
import { Loader2 } from 'lucide-react';

/**
 * Example Chat Component with Orchestration Integration
 *
 * This demonstrates how to integrate the useOrchestration hook
 * with a chat interface to enable visible UI automation.
 *
 * Key Features:
 * 1. Automatically executes orchestration instructions from HGC-v2
 * 2. Shows progress indicators during operations
 * 3. Renders inline buttons from responses
 * 4. Handles button actions (navigation, tool execution)
 */
export function OrchestratedChatExample() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize orchestration hook
  const { execute, isExecuting, progress, buttons } = useOrchestration();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Call HGC-v2 API
      const response = await fetch('/api/hgc-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: {
            currentPage: window.location.pathname
          }
        })
      });

      const data: OrchestrationResponse = await response.json();

      // Add assistant response
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

      // Execute orchestration instructions automatically
      // This will:
      // - Navigate to pages
      // - Fill forms
      // - Click buttons
      // - Show progress indicators
      await execute(data);

    } catch (error) {
      console.error('[CHAT_ERROR]', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonAction = async (action: string) => {
    // Handle button actions (e.g., execute AgentKit tool)
    console.log('[BUTTON_ACTION]', action);

    // You would typically call HGC-v2 again with the action
    setIsLoading(true);
    try {
      const response = await fetch('/api/hgc-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          context: {
            currentPage: window.location.pathname
          }
        })
      });

      const data: OrchestrationResponse = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      await execute(data);
    } catch (error) {
      console.error('[ACTION_ERROR]', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`px-4 py-2 rounded-lg max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Show inline buttons from last response */}
        {buttons && buttons.length > 0 && (
          <div className="flex justify-start">
            <InlineButtonGroup>
              {buttons.map((btn, idx) => (
                <InlineButton
                  key={idx}
                  {...btn}
                  onAction={btn.action ? handleButtonAction : undefined}
                />
              ))}
            </InlineButtonGroup>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Progress Indicator (Fixed at bottom) */}
      {isExecuting && progress && (
        <div className="fixed bottom-20 right-4 bg-white shadow-lg rounded-lg p-4 min-w-[300px] border border-gray-200">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm font-medium">{progress}</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask me to help with your LinkedIn campaign..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || isExecuting}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || isExecuting || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Usage Example:
 *
 * 1. Import in your chat page:
 *    import { OrchestratedChatExample } from '@/components/chat/orchestrated-chat-example';
 *
 * 2. Render the component:
 *    <OrchestratedChatExample />
 *
 * 3. HGC-v2 API should return OrchestrationResponse format:
 *    {
 *      response: "Let's create your campaign!",
 *      orchestration: {
 *        navigate: '/dashboard/campaigns/new',
 *        message: 'Opening campaign builder...',
 *        fillFields: [
 *          { id: 'campaign_name', value: 'AI for CTOs', animated: true }
 *        ]
 *      },
 *      buttons: [
 *        { label: 'Create Lead Magnet', action: 'create_lead_magnet' },
 *        { label: 'Skip', variant: 'secondary' }
 *      ]
 *    }
 *
 * The useOrchestration hook will automatically:
 * - Navigate to /dashboard/campaigns/new
 * - Show toast: "Opening campaign builder..."
 * - Wait for page load
 * - Fill the campaign_name field with typing animation
 * - Render the inline buttons
 * - Show progress during each step
 */
