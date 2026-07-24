'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity } from 'lucide-react';
import type { TimelinePoint } from '@/types/dashboard';

interface ThreatTimelineChartProps {
  data: TimelinePoint[];
  loading?: boolean;
}

export function ThreatTimelineChart({ data, loading }: ThreatTimelineChartProps) {
  const chartData = useMemo(
    () =>
      data.map((p) => ({
        ...p,
        label: p.hour.split(' ')[1] ?? p.hour,
        full: p.hour,
      })),
    [data]
  );

  const hasData = chartData.length > 0;

  return (
    <div className="flex h-[320px] w-full flex-col rounded-xl border border-border bg-card/80 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Threat Activity Timeline</h3>
        </div>
        <span className="text-xs text-muted-foreground">Attack volume over time (hourly)</span>
      </div>

      <div className="relative h-full w-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" />
          </div>
        )}
        {!loading && !hasData && <EmptyState />}
        {!loading && hasData && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="threatsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="criticalsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                minTickGap={24}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<TimelineTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
                iconType="plainline"
              />
              <Area
                type="monotone"
                dataKey="threats"
                name="Threats"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fill="url(#threatsGrad)"
                isAnimationActive
                animationDuration={600}
              />
              <Area
                type="monotone"
                dataKey="criticals"
                name="Critical"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2}
                fill="url(#criticalsGrad)"
                isAnimationActive
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function TimelineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const full = payload[0]?.payload?.full ?? label;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-mono text-[11px] text-muted-foreground">{full}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-foreground">{entry.name}</span>
          <span className="ml-auto font-mono-num font-medium text-foreground">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Activity className="mb-2 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">No threat activity yet</p>
      <p className="text-xs text-muted-foreground/70">Upload a log file to populate the timeline</p>
    </div>
  );
}
