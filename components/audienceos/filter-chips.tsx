"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { X, Search, User, AlertTriangle, Ban, Filter } from "lucide-react"
import { type Stage, type HealthStatus, type Owner } from "@/types/pipeline"
import { stages, owners } from "@/lib/constants/pipeline"
import { cn } from "@/lib/utils"

export interface PipelineFilters {
  stage: Stage | "all"
  health: HealthStatus | "all"
  owner: Owner | "all"
  search: string
  showMyClients: boolean
  showAtRisk: boolean
  showBlocked: boolean
}

interface FilterChipsProps {
  filters: PipelineFilters
  onFilterChange: <K extends keyof PipelineFilters>(key: K, value: PipelineFilters[K]) => void
  onClearFilters: () => void
  currentUser?: Owner
  activeFilterCount: number
}

export function FilterChips({
  filters,
  onFilterChange,
  onClearFilters,
  currentUser: _currentUser = "Brent",
  activeFilterCount,
}: FilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={filters.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
          className="pl-9 h-9 bg-secondary/30"
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange("search", "")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2">
        {/* My Clients */}
        <Button
          variant={filters.showMyClients ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-8 gap-1.5",
            filters.showMyClients ? "" : "bg-transparent"
          )}
          onClick={() => onFilterChange("showMyClients", !filters.showMyClients)}
        >
          <User className="h-3.5 w-3.5" />
          My Clients
        </Button>

        {/* At Risk */}
        <Button
          variant={filters.showAtRisk ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-8 gap-1.5",
            filters.showAtRisk
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-transparent hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/50"
          )}
          onClick={() => onFilterChange("showAtRisk", !filters.showAtRisk)}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          At Risk
        </Button>

        {/* Blocked */}
        <Button
          variant={filters.showBlocked ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-8 gap-1.5",
            filters.showBlocked
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-transparent hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/50"
          )}
          onClick={() => onFilterChange("showBlocked", !filters.showBlocked)}
        >
          <Ban className="h-3.5 w-3.5" />
          Blocked
        </Button>
      </div>

      {/* Dropdowns */}
      <div className="flex items-center gap-2">
        {/* Stage Filter */}
        <Select
          value={filters.stage}
          onValueChange={(value) => onFilterChange("stage", value as Stage | "all")}
        >
          <SelectTrigger className="h-8 w-[140px] bg-secondary/30">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Health Filter */}
        <Select
          value={filters.health}
          onValueChange={(value) => onFilterChange("health", value as HealthStatus | "all")}
        >
          <SelectTrigger className="h-8 w-[120px] bg-secondary/30">
            <SelectValue placeholder="Health" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Health</SelectItem>
            <SelectItem value="Green">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Green
              </div>
            </SelectItem>
            <SelectItem value="Yellow">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                Yellow
              </div>
            </SelectItem>
            <SelectItem value="Red">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                Red
              </div>
            </SelectItem>
            <SelectItem value="Blocked">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                Blocked
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Owner Filter */}
        <Select
          value={filters.owner}
          onValueChange={(value) => onFilterChange("owner", value as Owner | "all")}
        >
          <SelectTrigger className="h-8 w-[120px] bg-secondary/30">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map((owner) => (
              <SelectItem key={owner.name} value={owner.name}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]", owner.color)}>
                    {owner.avatar}
                  </div>
                  {owner.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Filter Count & Clear */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="secondary" className="gap-1">
            <Filter className="h-3 w-3" />
            {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-foreground"
            onClick={onClearFilters}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}

// Default filters helper
export const defaultFilters: PipelineFilters = {
  stage: "all",
  health: "all",
  owner: "all",
  search: "",
  showMyClients: false,
  showAtRisk: false,
  showBlocked: false,
}

// Count active filters helper
export function countActiveFilters(filters: PipelineFilters): number {
  let count = 0
  if (filters.stage !== "all") count++
  if (filters.health !== "all") count++
  if (filters.owner !== "all") count++
  if (filters.search) count++
  if (filters.showMyClients) count++
  if (filters.showAtRisk) count++
  if (filters.showBlocked) count++
  return count
}
