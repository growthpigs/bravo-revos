/**
 * G-01: Real-time Metrics Subscription
 * Subscribes to pod_activities changes via Supabase realtime
 */

import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

const LOG_PREFIX = '[REALTIME_MONITORING]';

export interface RealtimeUpdate {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  activityId: string;
  status: string;
  podId: string;
  timestamp: string;
}

export interface MetricsCallback {
  (update: RealtimeUpdate): void;
}

let activeSubscription: RealtimeChannel | null = null;
let callbacks: Set<MetricsCallback> = new Set();

/**
 * Subscribe to pod_activities realtime updates
 */
export function subscribeToMetrics(callback: MetricsCallback): () => void {
  callbacks.add(callback);

  // Start subscription if not already running
  if (!activeSubscription) {
    setupRealtimeSubscription();
  }

  // Return unsubscribe function
  return () => {
    callbacks.delete(callback);

    // Cleanup subscription if no more listeners
    if (callbacks.size === 0 && activeSubscription) {
      cleanupRealtimeSubscription();
    }
  };
}

/**
 * Setup realtime subscription to pod_activities table
 */
function setupRealtimeSubscription(): void {
  try {
    const supabase = createClient();

    activeSubscription = supabase
      .channel('public:pod_activities')
      .on(
        'postgres_changes',
        {
          event: '*', // All events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'pod_activities',
        },
        (payload: any) => {
          const update: RealtimeUpdate = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            activityId: (payload.new?.id || payload.old?.id) as string || 'unknown',
            status: (payload.new?.status || payload.old?.status) as string || 'unknown',
            podId: (payload.new?.pod_id || payload.old?.pod_id) as string || 'unknown',
            timestamp: new Date().toISOString(),
          };

          // Notify all callbacks
          callbacks.forEach((callback) => {
            try {
              callback(update);
            } catch (error) {
              console.error(`${LOG_PREFIX} Callback error:`, error);
            }
          });

          console.log(
            `${LOG_PREFIX} Activity ${update.eventType}: ${update.activityId} → ${update.status}`
          );
        }
      )
      .subscribe((status) => {
        console.log(`${LOG_PREFIX} Subscription status: ${status}`);
      });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error setting up subscription:`, error);
  }
}

/**
 * Cleanup realtime subscription
 */
function cleanupRealtimeSubscription(): void {
  if (activeSubscription) {
    activeSubscription.unsubscribe();
    activeSubscription = null;
    console.log(`${LOG_PREFIX} Subscription cleaned up`);
  }
}

/**
 * Unsubscribe all listeners and cleanup
 */
export function unsubscribeAll(): void {
  callbacks.clear();
  cleanupRealtimeSubscription();
}
