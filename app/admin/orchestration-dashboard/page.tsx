'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OrchestrationResult {
  success: boolean;
  activitiesScheduled?: number;
  strategy?: any;
  error?: string;
}

export default function OrchestrationDashboard() {
  const [campaignId, setCampaignId] = useState('');
  const [podId, setPodId] = useState('');
  const [postId, setPostId] = useState('');
  const [messageText, setMessageText] = useState('Hi, I have a framework that helps with scaling.');
  const [messageGoal, setMessageGoal] = useState('engagement');
  const [topic, setTopic] = useState('How to scale your leadership team');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const orchestratePost = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/agentkit/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'orchestrate_post',
          postId,
          campaignId,
          podId,
        }),
      });
      const data = await response.json();
      setResult({ ...data, timestamp: new Date().toISOString() });
    } catch (err: any) {
      setResult({ success: false, error: err.message, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  const optimizeMessage = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/agentkit/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize_message',
          campaignId,
          messageType: 'dm_initial',
          originalMessage: messageText,
          goal: messageGoal,
        }),
      });
      const data = await response.json();
      setResult({ ...data, timestamp: new Date().toISOString() });
    } catch (err: any) {
      setResult({ success: false, error: err.message, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  const analyzePerformance = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/agentkit/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_performance',
          campaignId,
          timeRange: '7d',
        }),
      });
      const data = await response.json();
      setResult({ ...data, timestamp: new Date().toISOString() });
    } catch (err: any) {
      setResult({ success: false, error: err.message, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  const generatePost = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/agentkit/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_post',
          campaignId,
          topic,
        }),
      });
      const data = await response.json();
      setResult({ ...data, timestamp: new Date().toISOString() });
    } catch (err: any) {
      setResult({ success: false, error: err.message, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>F-01 AgentKit Campaign Orchestration Dashboard</CardTitle>
            <CardDescription>
              Test the AI-powered campaign orchestration, message optimization, performance analysis, and content generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Common Parameters */}
            <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
              <h3 className="font-semibold">Campaign & Pod Setup</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Campaign ID</Label>
                  <Input
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    placeholder="e.g., campaign-uuid"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pod ID</Label>
                  <Input
                    value={podId}
                    onChange={(e) => setPodId(e.target.value)}
                    placeholder="e.g., pod-uuid"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Post ID</Label>
                  <Input
                    value={postId}
                    onChange={(e) => setPostId(e.target.value)}
                    placeholder="e.g., post-uuid"
                  />
                </div>
              </div>
            </div>

            {/* Orchestrate Post */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">1. Orchestrate Post (Core F-01 Feature)</h3>
              <p className="text-sm text-muted-foreground">
                AI decides engagement strategy for a new post
              </p>
              <Button onClick={orchestratePost} disabled={loading || !campaignId || !podId || !postId}>
                Orchestrate Post
              </Button>
            </div>

            {/* Optimize Message */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">2. Optimize Message</h3>
              <p className="text-sm text-muted-foreground">
                AI improves message copy for better engagement
              </p>
              <div className="space-y-2">
                <Label>Original Message</Label>
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Message to optimize"
                />
              </div>
              <div className="space-y-2">
                <Label>Goal</Label>
                <select
                  value={messageGoal}
                  onChange={(e) => setMessageGoal(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="engagement">Engagement</option>
                  <option value="conversion">Conversion</option>
                  <option value="awareness">Awareness</option>
                </select>
              </div>
              <Button onClick={optimizeMessage} disabled={loading || !campaignId}>
                Optimize Message
              </Button>
            </div>

            {/* Analyze Performance */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">3. Analyze Performance</h3>
              <p className="text-sm text-muted-foreground">
                AI analyzes campaign performance and provides recommendations
              </p>
              <Button onClick={analyzePerformance} disabled={loading || !campaignId}>
                Analyze Performance
              </Button>
            </div>

            {/* Generate Post */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">4. Generate Post Content</h3>
              <p className="text-sm text-muted-foreground">
                AI creates engaging LinkedIn post with trigger words
              </p>
              <div className="space-y-2">
                <Label>Topic</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Post topic"
                />
              </div>
              <Button onClick={generatePost} disabled={loading || !campaignId}>
                Generate Post
              </Button>
            </div>

            {/* Results */}
            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'}>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">
                      {result.success ? '✅ Success' : '❌ Failed'}
                    </p>
                    {result.error && (
                      <p className="text-sm text-red-700">{result.error}</p>
                    )}
                    {result.activitiesScheduled !== undefined && (
                      <p className="text-sm">Activities Scheduled: {result.activitiesScheduled}</p>
                    )}
                    {result.strategy && (
                      <pre className="text-xs overflow-auto p-2 bg-slate-100 rounded max-h-64">
                        {JSON.stringify(result.strategy, null, 2)}
                      </pre>
                    )}
                    {result.optimizedMessage && (
                      <div className="text-sm space-y-2">
                        <p><strong>Optimized:</strong> {result.optimizedMessage}</p>
                        {result.variants && (
                          <div>
                            <strong>Variants:</strong>
                            <ul className="list-disc pl-5">
                              {result.variants.map((v: string, i: number) => (
                                <li key={i}>{v}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.confidence !== undefined && (
                          <p><strong>Confidence:</strong> {(result.confidence * 100).toFixed(0)}%</p>
                        )}
                      </div>
                    )}
                    {result.analysis && (
                      <pre className="text-xs overflow-auto p-2 bg-slate-100 rounded max-h-64">
                        {JSON.stringify(result.analysis, null, 2)}
                      </pre>
                    )}
                    {result.postContent && (
                      <pre className="text-xs overflow-auto p-2 bg-slate-100 rounded max-h-64">
                        {JSON.stringify(result.postContent, null, 2)}
                      </pre>
                    )}
                    {result.timestamp && (
                      <p className="text-xs text-muted-foreground">
                        Timestamp: {new Date(result.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>1. Enter your Campaign ID, Pod ID, and Post ID at the top</p>
            <p>2. Click any button to test that F-01 feature</p>
            <p>3. Results appear below showing AI decisions and recommendations</p>
            <p>4. All tests call real OpenAI GPT-4o API</p>
            <p>5. Database records are created for all orchestration decisions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
