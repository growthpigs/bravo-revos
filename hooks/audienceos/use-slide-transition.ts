"use client"

import { useReducedMotion } from "motion/react"

/**
 * Shared hook for panel slide animations with reduced motion support.
 * Used across views that have expandable/collapsible detail panels.
 *
 * @returns Transition config object for Framer Motion
 */
export function useSlideTransition() {
  const prefersReducedMotion = useReducedMotion()

  return prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }
}
