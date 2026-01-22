"use client"

import { format } from "date-fns"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { TrendDataPoint, TimePeriod } from "@/types/dashboard"

interface TimeSeriesChartProps {
  data: TrendDataPoint[] | null
  isLoading?: boolean
  selectedPeriod: TimePeriod
  onPeriodChange: (period: TimePeriod) => void
  className?: string
}

const periodOptions: { value: TimePeriod; label: string }[] = [
  { value: 7, label: "7 Days" },
  { value: 30, label: "30 Days" },
  { value: 90, label: "90 Days" },
]

export function TimeSeriesChart({
  data,
  isLoading = false,
  selectedPeriod,
  onPeriodChange,
  className,
}: TimeSeriesChartProps) {
  if (isLoading || !data) {
    return <TimeSeriesChartSkeleton />
  }

  // Format data for display
  const formattedData = data.map((point) => ({
    ...point,
    formattedDate: format(new Date(point.date), "MMM dd"),
  }))

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-foreground">New Clients vs. Completed Installs</CardTitle>
          <CardDescription>Performance over time</CardDescription>
        </div>
        <div
          className="flex gap-1"
          role="group"
          aria-label="Select time period"
        >
          {periodOptions.map(({ value, label }) => (
            <Button
              key={value}
              variant={selectedPeriod === value ? "default" : "outline"}
              size="sm"
              onClick={() => onPeriodChange(value)}
              aria-pressed={selectedPeriod === value}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]" role="img" aria-label="Trend chart showing new clients and completed installs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={formattedData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorNewClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.65 0.15 250)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.65 0.15 250)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompletedInstalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.72 0.17 162)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.72 0.17 162)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="formattedDate"
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => String(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.16 0.005 260)",
                  border: "1px solid oklch(0.28 0.005 260)",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                labelStyle={{ color: "#999" }}
                labelFormatter={(label) => `Date: ${label}`}
                formatter={(value: number, name: string) => [
                  value,
                  name === "newClients" ? "New Clients" : "Completed Installs",
                ]}
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                formatter={(value) => (
                  <span style={{ color: "#999" }}>
                    {value === "newClients" ? "New Clients" : "Completed Installs"}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="newClients"
                name="newClients"
                stroke="oklch(0.65 0.15 250)"
                fillOpacity={1}
                fill="url(#colorNewClients)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="completedInstalls"
                name="completedInstalls"
                stroke="oklch(0.72 0.17 162)"
                fillOpacity={1}
                fill="url(#colorCompletedInstalls)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function TimeSeriesChartSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-full w-full" />
        </div>
      </CardContent>
    </Card>
  )
}
