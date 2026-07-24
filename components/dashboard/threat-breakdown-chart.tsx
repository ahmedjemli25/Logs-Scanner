'use client';

import { useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import type { ThreatBreakdownByType } from '@/types/dashboard';

interface ThreatBreakdownChartProps {
  data: ThreatBreakdownByType;
  loading?: boolean;
}

const SEGMENT_META: { key: keyof ThreatBreakdownByType; label: string; color: string }[] = [
  { key: 'SQL Injection', label: 'SQL Injection', color: 'hsl(var(--chart-1))' },
  { key: 'Path Traversal', label: 'Path Traversal', color: 'hsl(var(--chart-3))' },
  { key: 'XSS', label: 'XSS', color: 'hsl(var(--chart-5))' },
  { key: 'Brute Force', label: 'Brute Force', color: 'hsl(var(--chart-4))' },
];

export function ThreatBreakdownChart({ data, loading }: ThreatBreakdownChartProps) {
  const segments = useMemo(
    () =>
      SEGMENT_META.map((m) => ({
        name: m.label,
        value: data[m.key] ?? 0,
        color: m.color,
      })).filter((s) => s.value > 0),
    [data]
  );

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="flex h-[320px] w-full flex-col rounded-xl border border-border bg-card/80 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Threat Breakdown by Type</h3>
        </div>
        <span className="text-xs text-muted-foreground">SQLi · Traversal · XSS · Brute Force</span>
      </div>

      <div className="relative h-full w-full">
        {loading && <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" />}
        {!loading && total === 0 && <EmptyState />}
        {!loading && total > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={96}
                paddingAngle={3}
                stroke="hsl(var(--card))"
                strokeWidth={2}
                isAnimationActive
                animationDuration={600}
              >
                {segments.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip content={<BreakdownTooltip total={total} />} />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        {!loading && total > 0 && (
          <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="font-mono-num text-2xl font-semibold text-foreground">{total}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.payload.color }} />
        <span className="text-foreground">{entry.name}</span>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <span className="font-mono-num font-medium text-foreground">{entry.value}</span>
        <span className="text-muted-foreground">({pct}%)</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <PieIcon className="mb-2 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">No threats classified yet</p>
      <p className="text-xs text-muted-foreground/70">Detected attacks will appear here</p>
    </div>
  );
}
