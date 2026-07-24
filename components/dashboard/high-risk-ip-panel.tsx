'use client';

import { useEffect, useState } from 'react';
import { ShieldX, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchHighRiskIps } from '@/hooks/use-analytics';
import type { HighRiskIp } from '@/types/dashboard';

interface HighRiskIpPanelProps {
  refreshKey: number;
  onSelectIp?: (ip: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  'SQL Injection': 'SQLi',
  'Path Traversal': 'Traversal',
  XSS: 'XSS',
  'Brute Force': 'Brute',
};

export function HighRiskIpPanel({ refreshKey, onSelectIp }: HighRiskIpPanelProps) {
  const [ips, setIps] = useState<HighRiskIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchHighRiskIps()
      .then((rows) => {
        if (active) setIps(rows);
      })
      .catch(() => {
        if (active) setIps([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const top = ips.slice(0, 6);

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card/80 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldX className="h-4 w-4 text-error" />
          <h3 className="text-sm font-semibold text-foreground">High-Risk IPs</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {loading ? 'Loading…' : `${ips.length} flagged`}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <ShieldX className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No high-risk IPs</p>
          <p className="text-xs text-muted-foreground/70">Critical threats will surface here</p>
        </div>
      ) : (
        <div className="scroll-thin -mr-2 max-h-[260px] flex-1 space-y-2 overflow-y-auto pr-2">
          {top.map((ip) => {
            const types = Object.entries(ip.byType).filter(([, n]) => n > 0);
            return (
              <button
                key={ip.ip}
                onClick={() => onSelectIp?.(ip.ip)}
                className="group flex w-full items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-left transition-all hover:border-error/40 hover:bg-secondary/80"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-error/15 text-error">
                  <ShieldX className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-foreground">{ip.ip}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {types.slice(0, 3).map(([type, n]) => (
                      <span
                        key={type}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {TYPE_LABELS[type] ?? type} · {n}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono-num text-sm font-semibold text-foreground">
                    {ip.alertCount}
                  </p>
                  {ip.criticalCount > 0 && (
                    <p className="text-[10px] text-error">{ip.criticalCount} crit</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      )}

      {!loading && ips.length > 6 && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          {open ? 'Show top IPs' : `View all ${ips.length} IPs`}
        </button>
      )}
    </div>
  );
}
