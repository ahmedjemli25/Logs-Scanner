import { cn } from '@/lib/utils';
import type { Severity, ThreatType } from '@/types/database';

const SEVERITY_STYLES: Record<Severity, string> = {
  Low: 'border-success/30 bg-success/10 text-success',
  Medium: 'border-primary/30 bg-primary/10 text-primary',
  High: 'border-warning/30 bg-warning/15 text-warning',
  Critical: 'border-error/40 bg-error/15 text-error',
};

const THREAT_STYLES: Record<ThreatType, string> = {
  'SQL Injection': 'border-chart-1/40 bg-chart-1/10 text-chart-1',
  'Path Traversal': 'border-chart-3/40 bg-chart-3/10 text-chart-3',
  XSS: 'border-chart-5/40 bg-chart-5/10 text-chart-5',
  'Brute Force': 'border-chart-4/40 bg-chart-4/10 text-chart-4',
};

export function SeverityBadge({ severity }: { severity: string }) {
  const style = SEVERITY_STYLES[severity as Severity] ?? 'border-border bg-muted text-muted-foreground';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        style
      )}
    >
      {severity}
    </span>
  );
}

export function ThreatBadge({ type }: { type: string }) {
  const style = THREAT_STYLES[type as ThreatType] ?? 'border-border bg-muted text-muted-foreground';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        style
      )}
    >
      {type}
    </span>
  );
}

const THREAT_SHORT: Record<ThreatType, string> = {
  'SQL Injection': 'SQLi',
  'Path Traversal': 'Traversal',
  XSS: 'XSS',
  'Brute Force': 'Brute',
};

export function threatShort(t: string): string {
  return THREAT_SHORT[t as ThreatType] ?? t;
}
