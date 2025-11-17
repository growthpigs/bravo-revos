'use client';

import { useState } from 'react';
import { ChatKitWrapper } from '@/components/chat/ChatKitWrapper';

/**
 * ChatKit Test Page
 *
 * Purpose: Verify ChatKit integration works BEFORE touching FloatingChatBar
 *
 * What to test:
 * 1. Does ChatKit render?
 * 2. Does session creation work?
 * 3. Does workflow execute?
 * 4. What data structure comes back?
 * 5. What events fire?
 *
 * How to test:
 * 1. Start dev server: npm run dev
 * 2. Visit: http://localhost:3002/test-chatkit
 * 3. Open browser console (Cmd+Option+J)
 * 4. Type a message and press Enter
 * 5. Watch console for [TEST_CHATKIT] logs
 */
export default function TestChatKitPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log('[TEST_CHATKIT]', message);
    setLogs(prev => [...prev, logMessage]);
  };

  const handleMessage = (message: any) => {
    addLog(`📩 Message received: ${JSON.stringify(message, null, 2)}`);
  };

  const handleComplete = (result: any) => {
    addLog(`✅ Workflow complete: ${JSON.stringify(result, null, 2)}`);
  };

  const handleError = (error: Error) => {
    addLog(`❌ Error: ${error.message}`);
  };

  const topicWorkflowId = process.env.NEXT_PUBLIC_TOPIC_GENERATION_WORKFLOW_ID ||
                          'wf_691add48a50881908ddb38929e401e7e0c39f3da1d1ca993';
  const postWorkflowId = process.env.NEXT_PUBLIC_POST_GENERATION_WORKFLOW_ID ||
                         'wf_691ae10f742c819099472795dc6995a7062240a5334648ba';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">ChatKit Integration Test</h1>
          <p className="text-gray-600 mb-4">
            Testing ChatKit connection to OpenAI Agent Builder workflows
          </p>

          {/* Workflow Selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Select a workflow to test:</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedWorkflow(topicWorkflowId);
                  addLog(`🚀 Loading Topic Generation workflow: ${topicWorkflowId}`);
                }}
                disabled={selectedWorkflow === topicWorkflowId}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedWorkflow === topicWorkflowId
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Topic Generation
              </button>
              <button
                onClick={() => {
                  setSelectedWorkflow(postWorkflowId);
                  addLog(`🚀 Loading Post Writer workflow: ${postWorkflowId}`);
                }}
                disabled={selectedWorkflow === postWorkflowId}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedWorkflow === postWorkflowId
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Post Writer
              </button>
              {selectedWorkflow && (
                <button
                  onClick={() => {
                    setSelectedWorkflow(null);
                    setLogs([]);
                    addLog('🔄 Reset test');
                  }}
                  className="px-4 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="font-medium text-blue-900">Status:</p>
            <p className="text-blue-700">
              {selectedWorkflow
                ? `✅ Workflow loaded: ${selectedWorkflow.substring(0, 20)}...`
                : '⏸️ No workflow selected - choose one above to begin'}
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: ChatKit Component */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">ChatKit Component</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[400px]">
              {selectedWorkflow ? (
                <ChatKitWrapper
                  workflowId={selectedWorkflow}
                  onMessage={handleMessage}
                  onComplete={handleComplete}
                  onError={handleError}
                  className="h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>Select a workflow to test</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Logs */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Event Log</h2>
            <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-xs h-[400px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No events yet. Select a workflow and interact with ChatKit.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1 whitespace-pre-wrap break-all">
                    {log}
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Also check browser console (Cmd+Option+J) for detailed logs
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-2">🧪 Testing Checklist</h3>
          <ul className="space-y-1 text-sm text-yellow-800">
            <li>✓ Select a workflow (Topic Generation or Post Writer)</li>
            <li>✓ Check if ChatKit renders (should see OpenAI chat interface)</li>
            <li>✓ Try typing a message and pressing Enter</li>
            <li>✓ Watch the Event Log for responses</li>
            <li>✓ Check browser console for [TEST_CHATKIT] logs</li>
            <li>✓ Verify workflow executes (should see AI response)</li>
            <li>✓ Note the data structure in console logs</li>
            <li>✓ Test error handling (disconnect network, see what happens)</li>
          </ul>
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4 text-xs text-gray-600 font-mono">
          <p className="font-semibold mb-2">Debug Info:</p>
          <p>Topic Workflow ID: {topicWorkflowId}</p>
          <p>Post Workflow ID: {postWorkflowId}</p>
          <p>Current Selection: {selectedWorkflow || 'None'}</p>
          <p>Session Endpoint: /api/chatkit/session</p>
          <p>OpenAI ChatKit Beta: v1</p>
        </div>
      </div>
    </div>
  );
}
