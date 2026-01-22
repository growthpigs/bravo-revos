import type { MinimalClient, UIHealthStatus, Stage } from "@/types/client"

/**
 * Calculate priority score for a client.
 * Higher score = needs more attention = appears first in list.
 *
 * Key insight: urgency should DECAY for external blockers.
 * A DNS issue on day 1 is "we're waiting" but on day 20 it's "their problem".
 */
export function calculateClientPriority(client: MinimalClient): number {
  // Base health score (higher = needs attention)
  const healthScores: Record<UIHealthStatus, number> = {
    Red: 100,
    Yellow: 60,
    Blocked: 40,
    Green: 10,
  }
  const healthScore = healthScores[client.health]

  // Blocker context - external vs internal
  const externalBlockers = ["WAITING ON DNS", "WAITING ON ACCESS"]
  const internalBlockers = ["DATA LAYER ERROR", "CODE NOT INSTALLED"]

  let actionabilityMultiplier = 1.0

  if (client.blocker) {
    if (externalBlockers.includes(client.blocker)) {
      // External: urgency DECAYS over time
      // Day 1: 0.5, Day 5: 0.36, Day 20: 0.28
      actionabilityMultiplier = 0.5 / (1 + Math.log10(client.daysInStage + 1))
    } else if (internalBlockers.includes(client.blocker)) {
      // Internal: urgency GROWS over time - our problem, fix it
      // Day 1: 1.1, Day 5: 1.5, Day 10: 2.0
      actionabilityMultiplier = 1 + client.daysInStage * 0.1
    }
  } else {
    // No blocker: days in stage increases urgency moderately
    // Stale items need a push
    actionabilityMultiplier = 1 + client.daysInStage * 0.05
  }

  // Bonus for open support tickets (active issues)
  const ticketBonus = (client.supportTickets || 0) * 5

  return healthScore * actionabilityMultiplier + ticketBonus
}

// Health priority for sorting (lower = more urgent)
const healthOrder: Record<UIHealthStatus, number> = {
  Red: 0,
  Yellow: 1,
  Blocked: 2,
  Green: 3,
}

// Stage order for sorting (workflow progression)
const stageOrder: Record<Stage, number> = {
  Onboarding: 0,
  Installation: 1,
  Audit: 2,
  Live: 3,
  "Needs Support": 4,
  "Off-boarding": 5,
}

export type SortMode = "priority" | "health" | "stage" | "owner" | "days" | "name"

/**
 * Sort clients by the specified mode
 */
export function sortClients<T extends MinimalClient>(clients: T[], mode: SortMode): T[] {
  return [...clients].sort((a, b) => {
    switch (mode) {
      case "priority":
        // Higher priority first
        return calculateClientPriority(b) - calculateClientPriority(a)

      case "health":
        // Most urgent health first (Red > Yellow > Blocked > Green)
        return healthOrder[a.health] - healthOrder[b.health]

      case "stage":
        // Earlier stages first
        return stageOrder[a.stage] - stageOrder[b.stage]

      case "owner":
        // Alphabetical by owner name
        return a.owner.localeCompare(b.owner)

      case "days":
        // Most days first (longest waiting)
        return b.daysInStage - a.daysInStage

      case "name":
        // Alphabetical by client name
        return a.name.localeCompare(b.name)

      default:
        return 0
    }
  })
}

/**
 * Sort clients by priority (highest first) - convenience alias
 */
export function sortClientsByPriority<T extends MinimalClient>(clients: T[]): T[] {
  return sortClients(clients, "priority")
}
