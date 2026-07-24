'use client';

import { Activity, ShieldAlert, ShieldX, Siren } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardMetrics } from '@/types/dashboard';

interface MetricCardsProps {
  metrics: DashboardMetrics;
  loading?: boolean;
}

interface CardDef {
  key: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  ring: string;
  description: string;
}

export function MetricCards({ metrics, loading }: MetricCardsProps) {
  const cards: CardDef[] = [
    {
      key: 'logs',
      label: 'Total Logs Processed',
      value: metrics.totalLogs,
      icon: Activity,
      accent: 'text-primary',
      ring: 'shadow-[0_0_24px_-12px_hsl(var(--primary))]',
      description: 'Normalized log lines ingested',
    },
    {
      key: 'threats',
      label: 'Total Threats Flagged',
      value: metrics.totalAlerts,
      icon: ShieldAlert,
      accent: 'text-warning',
      ring: 'shadow-[0_0_24px_-12px_hsl(var(--warning))]',
      description: 'Detected attack signatures',
    },
    {
      key: 'ips',
      label: 'High-Risk IPs',
      value: metrics.highRiskIps,
      icon: ShieldX,
      accent: 'text-error',
      ring: 'shadow-[0_0_24px_-12px_hsl(var(--error))]',
      description: 'IPs with critical alerts',
    },
    {
      key: 'critical',
      label: 'Critical Alerts',
      value: metrics.criticalAlerts,
      icon: Siren,
      accent: 'text-error',
      ring: 'animate-pulse-ring shadow-[0_0_24px_-8px_hsl(var(--error))]',
      description: 'Severity: Critical',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <MetricCard key={c.key} def={c} loading={loading} />
      ))}
    </div>
  );
}

function MetricCard({ def, loading }: { def: CardDef; loading?: boolean }) {
  const Icon = def.icon;
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card/80 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/40',
        def.ring
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {def.label}
          </p>
          <p className={cn('mt-2 font-mono-num text-3xl font-semibold tabular-nums text-foreground', def.accent)}>
            {loading ? (
              <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              formatCount(def.value)
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{def.description}</p>
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary', def.accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}
