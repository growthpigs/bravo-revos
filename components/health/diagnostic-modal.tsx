/**
 * Health Diagnostic Modal - Deep Dive Into Service Health
 *
 * Shows:
 * - Current status + response time
 * - Verification checklist (env var, endpoint, code)
 * - Raw diagnostics JSON (collapsible)
 * - File paths + line numbers
 * - Historical status log (last 20 entries)
 * - Response time graph (last 7 days)
 * - "Verify Now" button (triggers fresh check)
 */

'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { HealthCheckResult, HealthStatus } from '@/lib/health-checks/types';

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string | null;
}

export function DiagnosticModal({ isOpen, onClose, serviceName }: DiagnosticModalProps) {
  const [currentStatus, setCurrentStatus] = useState<HealthCheckResult | null>(null);
  const [history, setHistory] = useState<HealthCheckResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRawDiagnostics, setShowRawDiagnostics] = useState(false);

  // Fetch service health data
  useEffect(() => {
    if (!isOpen || !serviceName || serviceName === '__all__') return;

    fetchServiceHealth();
  }, [isOpen, serviceName]);

  const fetchServiceHealth = async () => {
    if (!serviceName || serviceName === '__all__' || serviceName === null) return;

    setIsLoading(true);
    try {
      // Fetch current status
      const statusResponse = await fetch(`/api/health?service=${serviceName}`);
      if (statusResponse.ok) {
        const data: HealthCheckResult = await statusResponse.json();
        setCurrentStatus(data);
      }

      // Fetch history
      const historyResponse = await fetch(
        `/api/health?history=true&service=${serviceName}&limit=20`
      );
      if (historyResponse.ok) {
        const data = await historyResponse.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('[Diagnostic Modal] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyNow = async () => {
    if (!serviceName || serviceName === '__all__' || serviceName === null) return;

    setIsVerifying(true);
    try {
      const response = await fetch('/api/health/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceName }),
      });

      if (response.ok) {
        // Refresh data
        await fetchServiceHealth();
      }
    } catch (error) {
      console.error('[Diagnostic Modal] Verify failed:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  // Handle "View All" click
  if (serviceName === '__all__') {
    return (
      <ModalOverlay onClose={onClose}>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <ModalHeader title="All Services Health" onClose={onClose} />
          <div className="p-6">
            <p className="text-gray-600">
              Select a specific service from the banner to view detailed diagnostics.
            </p>
          </div>
        </div>
      </ModalOverlay>
    );
  }

  if (isLoading || !currentStatus) {
    return (
      <ModalOverlay onClose={onClose}>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <ModalHeader title="Loading..." onClose={onClose} />
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </ModalOverlay>
    );
  }

  const { status, responseTimeMs, verifiedSources, diagnostics, errorMessage, timestamp } =
    currentStatus;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <ModalHeader
          title={`${serviceName} Health Diagnostics`}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Current Status */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Current Status</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Status:</span>
                <StatusBadge status={status} />
              </div>
              {responseTimeMs !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Response Time:</span>
                  <span className="font-mono text-sm">{responseTimeMs}ms</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Last Checked:</span>
                <span className="text-sm">{new Date(timestamp).toLocaleString()}</span>
              </div>
              {errorMessage && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}
            </div>
          </section>

          {/* Verification Checklist */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Verification Sources</h3>
            <div className="space-y-2">
              <VerificationItem
                label="Environment Variable"
                verified={verifiedSources.includes('env_var')}
                details="Checks if required env vars are present and valid"
              />
              <VerificationItem
                label="Endpoint Test"
                verified={verifiedSources.includes('endpoint_test')}
                details="Makes real network request to verify service is reachable"
              />
              <VerificationItem
                label="Code Path Check"
                verified={verifiedSources.includes('code_check')}
                details="Verifies integration code exists and functions are callable"
              />
            </div>
          </section>

          {/* Diagnostics Details */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Diagnostic Data</h3>
              <button
                onClick={() => setShowRawDiagnostics(!showRawDiagnostics)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showRawDiagnostics ? 'Hide Raw JSON' : 'Show Raw JSON'}
              </button>
            </div>

            {showRawDiagnostics ? (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {Object.entries(diagnostics).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between">
                    <span className="text-gray-700 font-mono text-sm">{key}:</span>
                    <span className="text-sm text-right font-mono max-w-md">
                      {typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Code File Paths */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Implementation Files</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <CodeFilePath
                file={`lib/health-checks/verifiers.ts`}
                line={getVerifierLineNumber(serviceName)}
                description={`verify${serviceName ? capitalize(serviceName) : 'Service'}() function`}
              />
              <CodeFilePath
                file="lib/health-checks/orchestrator.ts"
                line={12}
                description="runAllHealthChecks() orchestrator"
              />
              <CodeFilePath
                file="app/api/health/route.ts"
                line={27}
                description="Health check API endpoint"
              />
            </div>
          </section>

          {/* Historical Status */}
          {history.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-3">
                Recent History (Last 20 Checks)
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-600 border-b">
                    <tr>
                      <th className="pb-2">Timestamp</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Response Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {history.map((entry, idx) => (
                      <tr key={idx} className="text-gray-800">
                        <td className="py-1">
                          {new Date(entry.timestamp).toLocaleString()}
                        </td>
                        <td className="py-1">
                          <StatusBadge status={entry.status} size="sm" />
                        </td>
                        <td className="py-1 font-mono">
                          {entry.responseTimeMs !== null
                            ? `${entry.responseTimeMs}ms`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t p-4 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            Data stored in <code className="text-xs bg-gray-200 px-1 rounded">system_health_log</code> table
          </div>
          <button
            onClick={handleVerifyNow}
            disabled={isVerifying}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
            {isVerifying ? 'Verifying...' : 'Verify Now'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

/**
 * Modal overlay with backdrop
 */
function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

/**
 * Modal header with title and close button
 */
function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="border-b p-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold">{title}</h2>
      <button
        onClick={onClose}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

/**
 * Status badge
 */
function StatusBadge({ status, size = 'md' }: { status: HealthStatus; size?: 'sm' | 'md' }) {
  const colors = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-amber-100 text-amber-800',
    unhealthy: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800',
  };

  const icon = {
    healthy: <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
    degraded: <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
    unhealthy: <XCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
    unknown: <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}
    >
      {icon[status]}
      {capitalize(status)}
    </span>
  );
}

/**
 * Verification checklist item
 */
function VerificationItem({
  label,
  verified,
  details,
}: {
  label: string;
  verified: boolean;
  details: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      {verified ? (
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      )}
      <div>
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-600">{details}</div>
      </div>
    </div>
  );
}

/**
 * Code file path display
 */
function CodeFilePath({
  file,
  line,
  description,
}: {
  file: string;
  line: number;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <code className="text-xs font-mono text-blue-600">{file}:{line}</code>
        <div className="text-xs text-gray-600">{description}</div>
      </div>
    </div>
  );
}

/**
 * Helper: Get approximate line number for verifier function
 */
function getVerifierLineNumber(serviceName: string | null): number {
  const lineNumbers: Record<string, number> = {
    supabase: 35,
    redis: 126,
    webhook_worker: 240,
    engagement_worker: 240,
    unipile: 340,
    openai: 450,
    resend: 550,
    environment: 650,
    git: 45, // in git-info.ts
  };
  return lineNumbers[serviceName || ''] || 1;
}

/**
 * Helper: Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
