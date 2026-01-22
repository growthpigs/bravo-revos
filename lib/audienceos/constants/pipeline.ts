/**
 * Pipeline Constants
 *
 * Static configuration data for the client pipeline.
 * These were extracted from mock-data.ts during cleanup.
 */

// Pipeline stage names (matches database stages)
export const stages = [
  "Onboarding",
  "Installation",
  "Audit",
  "Live",
  "Needs Support",
  "Off-boarding"
] as const

export type Stage = typeof stages[number]

// Team member display configuration
export const owners = [
  { name: "Brent" as const, avatar: "B", color: "bg-emerald-500" },
  { name: "Roderic" as const, avatar: "R", color: "bg-blue-500" },
  { name: "Trevor" as const, avatar: "T", color: "bg-amber-500" },
  { name: "Chase" as const, avatar: "C", color: "bg-purple-500" },
] as const

export type Owner = typeof owners[number]["name"]

// Health status display types
export type HealthStatus = "Green" | "Yellow" | "Red" | "Blocked"

// Tier types
export type Tier = "Enterprise" | "Core" | "Starter"

// Ticket status for UI display
export const ticketStatuses = ["New", "In Progress", "Waiting on Client", "Resolved"] as const
export type TicketStatus = typeof ticketStatuses[number]
export type TicketPriority = "High" | "Medium" | "Low"
