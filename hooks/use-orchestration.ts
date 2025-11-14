'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { NavigationAPI } from '@/lib/orchestration/navigation-api';
import { FormControlAPI } from '@/lib/orchestration/form-control-api';
import {
  OrchestrationResponse,
  InlineButtonConfig
} from '@/lib/orchestration/response-builder';

export interface UseOrchestrationReturn {
  /**
   * Execute orchestration instructions from HGC-v2 response
   */
  execute: (response: OrchestrationResponse) => Promise<void>;

  /**
   * Whether orchestration is currently executing
   */
  isExecuting: boolean;

  /**
   * Current progress message (null when not executing)
   */
  progress: string | null;

  /**
   * Buttons to render from the last response
   */
  buttons?: InlineButtonConfig[];
}

/**
 * useOrchestration Hook
 *
 * Listens for orchestration responses from HGC-v2 and executes:
 * - Navigation commands using NavigationAPI
 * - Form fills using FormControlAPI
 * - Button clicks
 * - Wait instructions
 *
 * Also manages progress indicators during execution.
 *
 * Example usage in chat component:
 * ```tsx
 * const { execute, isExecuting, progress, buttons } = useOrchestration();
 *
 * // When receiving HGC-v2 response
 * await execute(hgcResponse);
 *
 * // Show progress
 * {isExecuting && <ProgressIndicator message={progress} />}
 *
 * // Render buttons
 * {buttons?.map(btn => <InlineButton key={btn.label} {...btn} />)}
 * ```
 */
export function useOrchestration(): UseOrchestrationReturn {
  const router = useRouter();
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [buttons, setButtons] = useState<InlineButtonConfig[] | undefined>();

  // Initialize APIs with memoization
  const navigationAPI = useMemo(() => new NavigationAPI(router), [router]);
  const formAPI = useMemo(() => new FormControlAPI(), []);

  /**
   * Execute orchestration instructions
   */
  const execute = useCallback(
    async (response: OrchestrationResponse) => {
      // Update buttons immediately
      setButtons(response.buttons);

      // If no orchestration instructions, return early
      if (!response.orchestration) {
        return;
      }

      const { orchestration } = response;

      try {
        setIsExecuting(true);

        // Step 1: Navigate if specified
        if (orchestration.navigate) {
          setProgress(`Navigating to ${orchestration.navigate}...`);
          await navigationAPI.navigateTo(
            orchestration.navigate,
            orchestration.message
          );
        }

        // Step 2: Wait if specified
        if (orchestration.wait) {
          setProgress('Waiting for page to load...');
          await new Promise(resolve => setTimeout(resolve, orchestration.wait));
        }

        // Step 3: Fill form fields if specified
        if (orchestration.fillFields && orchestration.fillFields.length > 0) {
          setProgress(
            `Filling fields (0/${orchestration.fillFields.length})...`
          );

          for (let i = 0; i < orchestration.fillFields.length; i++) {
            const field = orchestration.fillFields[i];
            setProgress(
              `Filling fields (${i + 1}/${orchestration.fillFields.length})...`
            );

            await formAPI.fillField(field.id, field.value, {
              animated: field.animated
            });

            // Small delay between fields for visibility
            if (i < orchestration.fillFields.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        }

        // Step 4: Click button if specified
        if (orchestration.clickButton) {
          setProgress('Clicking button...');
          await formAPI.clickButton(orchestration.clickButton);
        }

        // Success - clear progress
        setProgress(null);
      } catch (error) {
        console.error('[ORCHESTRATION_ERROR]', error);
        // Clear progress even on error
        setProgress(null);
      } finally {
        setIsExecuting(false);
      }
    },
    [navigationAPI, formAPI]
  );

  return {
    execute,
    isExecuting,
    progress,
    buttons
  };
}
