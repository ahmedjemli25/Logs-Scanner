'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Database,
  ShieldAlert,
  Trash2,
  X,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SeverityBadge, ThreatBadge, threatShort } from './badges';
import type { AnalyticsFilters } from '@/hooks/use-analytics';
import type { AnalyticsResponse, LogTableRow } from '@/types/dashboard';

const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'] as const;
const THREAT_OPTIONS = ['SQL Injection', 'Path Traversal', 'XSS', 'Brute Force'] as const;

interface DataTableProps {
  data: AnalyticsResponse;
  filters: AnalyticsFilters;
  onFiltersChange: (next: AnalyticsFilters) => void;
  onClearData: () => void;
  loading?: boolean;
}

export function DataTable({ data, filters, onFiltersChange, onClearData, loading }: DataTableProps) {
  const { table } = data;
  const isAlerts = table.view === 'alerts';

  const setSearch = (v: string) => onFiltersChange({ ...filters, search: v, page: 1 });
  const setView = (v: 'logs' | 'alerts') => onFiltersChange({ ...filters, view: v, page: 1 });

  const toggleSeverity = (s: string) => {
    const has = filters.severities.includes(s);
    onFiltersChange({
      ...filters,
      severities: has ? filters.severities.filter((x) => x !== s) : [...filters.severities, s],
      page: 1,
    });
  };
  const toggleThreat = (t: string) => {
    const has = filters.threatTypes.includes(t);
    onFiltersChange({
      ...filters,
      threatTypes: has ? filters.threatTypes.filter((x) => x !== t) : [...filters.threatTypes, t],
      page: 1,
    });
  };
  const clearFilters = () =>
    onFiltersChange({ ...filters, severities: [], threatTypes: [], search: '', page: 1 });

  const goToPage = (p: number) => onFiltersChange({ ...filters, page: Math.max(1, Math.min(p, table.totalPages)) });

  const hasActiveFilters = filters.severities.length > 0 || filters.threatTypes.length > 0 || filters.search.length > 0;
  const rangeStart = table.total === 0 ? 0 : (table.page - 1) * table.pageSize + 1;
  const rangeEnd = Math.min(table.page * table.pageSize, table.total);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card/80 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Log &amp; Alert Explorer</h3>
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border bg-secondary/50 p-0.5">
            <ToggleButton active={isAlerts} onClick={() => setView('alerts')} icon={ShieldAlert} label="Alerts" />
            <ToggleButton active={!isAlerts} onClick={() => setView('logs')} icon={Database} label="Logs" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAlerts ? 'Search by IP or details…' : 'Search by IP or URL path…'}
              className="pl-9"
            />
            {filters.search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Severity filter (alerts only) */}
          {isAlerts && (
            <FilterGroup label="Severity">
              {SEVERITY_OPTIONS.map((s) => (
                <FilterChip key={s} active={filters.severities.includes(s)} onClick={() => toggleSeverity(s)}>
                  {s}
                </FilterChip>
              ))}
            </FilterGroup>
          )}

          {/* Threat type filter (alerts only) */}
          {isAlerts && (
            <FilterGroup label="Threat">
              {THREAT_OPTIONS.map((t) => (
                <FilterChip key={t} active={filters.threatTypes.includes(t)} onClick={() => toggleThreat(t)}>
                  {threatShort(t)}
                </FilterChip>
              ))}
            </FilterGroup>
          )}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground">
              <X className="mr-1 h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}

          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearData}
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear data
            </Button>
          </div>
        </div>
      </div>

      {/* Table body */}
      <div className="scroll-thin max-h-[560px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
            {isAlerts ? <AlertsHeader /> : <LogsHeader />}
          </TableHeader>
          <TableBody>
            {loading ? (
              <LoadingRows cols={isAlerts ? 6 : 7} />
            ) : table.rows.length === 0 ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={isAlerts ? 6 : 7} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Inbox className="mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {hasActiveFilters ? 'No rows match your filters' : 'No data yet — upload a log file to begin'}
                    </p>
                    {hasActiveFilters && (
                      <button onClick={clearFilters} className="mt-2 text-xs text-primary hover:underline">
                        Clear filters
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : isAlerts ? (
              table.rows.map((row) => <AlertRow key={row.id} row={row} />)
            ) : (
              table.rows.map((row) => <LogRowView key={row.id} row={row} />)
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {table.total === 0 ? (
            'No rows'
          ) : (
            <>
              Showing <span className="font-mono-num text-foreground">{rangeStart}</span>–
              <span className="font-mono-num text-foreground">{rangeEnd}</span> of{' '}
              <span className="font-mono-num text-foreground">{table.total}</span>
            </>
          )}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={table.page <= 1 || loading}
            onClick={() => goToPage(table.page - 1)}
            className="h-8 w-8 p-0"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs text-muted-foreground">
            Page <span className="font-mono-num text-foreground">{table.page}</span> /{' '}
            <span className="font-mono-num text-foreground">{table.totalPages}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={table.page >= table.totalPages || loading}
            onClick={() => goToPage(table.page + 1)}
            className="h-8 w-8 p-0"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Filter className="h-3 w-3" />
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all',
        active
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border bg-secondary/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function AlertsHeader() {
  return (
    <TableRow className="border-border hover:bg-transparent">
      <TableHead className="w-[140px]">IP Address</TableHead>
      <TableHead className="w-[130px]">Threat Type</TableHead>
      <TableHead className="w-[100px]">Severity</TableHead>
      <TableHead>Details</TableHead>
      <TableHead className="w-[160px]">Timestamp</TableHead>
      <TableHead className="w-[80px] text-right">Actions</TableHead>
    </TableRow>
  );
}

function LogsHeader() {
  return (
    <TableRow className="border-border hover:bg-transparent">
      <TableHead className="w-[140px]">IP Address</TableHead>
      <TableHead className="w-[80px]">Method</TableHead>
      <TableHead>Path</TableHead>
      <TableHead className="w-[90px]">Status</TableHead>
      <TableHead className="w-[110px]">Source</TableHead>
      <TableHead className="w-[160px]">Timestamp</TableHead>
      <TableHead className="w-[80px]">User Agent</TableHead>
    </TableRow>
  );
}

function AlertRow({ row }: { row: LogTableRow }) {
  return (
    <TableRow className="group border-border/60 hover:bg-secondary/40">
      <TableCell className="font-mono text-xs text-foreground">{row.ip}</TableCell>
      <TableCell>
        <ThreatBadge type={row.threat_type ?? ''} />
      </TableCell>
      <TableCell>
        <SeverityBadge severity={row.severity ?? ''} />
      </TableCell>
      <TableCell className="max-w-[420px]">
        <p className="truncate text-xs text-muted-foreground" title={row.details}>
          {row.details}
        </p>
      </TableCell>
      <TableCell className="font-mono text-[11px] text-muted-foreground">{formatTime(row.timestamp)}</TableCell>
      <TableCell className="text-right">
        <button
          className="text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
          title="Search this IP"
          onClick={() => {
            const event = new CustomEvent('vulntrack:search-ip', { detail: row.ip });
            window.dispatchEvent(event);
          }}
        >
          Investigate
        </button>
      </TableCell>
    </TableRow>
  );
}

function LogRowView({ row }: { row: LogTableRow }) {
  const statusNum = row.status ?? '';
  const statusTone = useMemo(() => {
    if (statusNum === 'Failed' || statusNum.startsWith('4') || statusNum.startsWith('5'))
      return 'text-error';
    if (statusNum === 'Accepted' || statusNum.startsWith('2')) return 'text-success';
    return 'text-muted-foreground';
  }, [statusNum]);
  return (
    <TableRow className="group border-border/60 hover:bg-secondary/40">
      <TableCell className="font-mono text-xs text-foreground">{row.ip}</TableCell>
      <TableCell>
        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {row.method}
        </span>
      </TableCell>
      <TableCell className="max-w-[360px]">
        <p className="truncate font-mono text-xs text-foreground" title={row.path}>
          {row.path}
        </p>
      </TableCell>
      <TableCell className={cn('font-mono text-xs font-semibold', statusTone)}>{row.status}</TableCell>
      <TableCell>
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px]',
            row.source_format === 'auth' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
          )}
        >
          {row.source_format}
        </span>
      </TableCell>
      <TableCell className="font-mono text-[11px] text-muted-foreground">{formatTime(row.timestamp)}</TableCell>
      <TableCell className="max-w-[180px]">
        <p className="truncate text-[11px] text-muted-foreground" title={row.user_agent}>
          {row.user_agent || '—'}
        </p>
      </TableCell>
    </TableRow>
  );
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i} className="border-border/60 hover:bg-transparent">
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 w-full animate-pulse rounded bg-muted/50" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function formatTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
