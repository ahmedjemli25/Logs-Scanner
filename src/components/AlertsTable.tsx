import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search, Filter, Eye } from 'lucide-react';
import type { AlertRow, AlertStatus, Severity, ThreatType } from '../types/database';
import { SEVERITY_COLORS, STATUS_COLORS, STATUS_LABELS, THREAT_TYPES, SEVERITY_ORDER } from '../types/dashboard';
import { fetchAlerts } from '../lib/api';

interface Props {
  onInvestigate: (alert: AlertRow) => void;
  onRefresh: () => void;
}

export function AlertsTable({ onInvestigate, onRefresh }: Props) {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severities, setSeverities] = useState<Severity[]>([]);
  const [threatTypes, setThreatTypes] = useState<ThreatType[]>([]);
  const [statuses, setStatuses] = useState<AlertStatus[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAlerts({
        page, pageSize: 15,
        search: search || undefined,
        severities: severities.length ? severities : undefined,
        threatTypes: threatTypes.length ? threatTypes : undefined,
        statuses: statuses.length ? statuses : undefined,
      });
      setRows(result.rows);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      // ignore — empty table
    } finally {
      setLoading(false);
    }
  }, [page, search, severities, threatTypes, statuses]);

  useEffect(() => { load(); }, [load]);

  const toggleFilter = <T,>(arr: T[], val: T, setter: (v: T[]) => void) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
    setPage(1);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      {/* Header */}
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Security Alerts</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search IP or details..."
                className="w-56 rounded-lg border border-slate-700 bg-slate-800 py-1.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
                showFilters || severities.length || threatTypes.length || statuses.length
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 space-y-2 rounded-lg border border-slate-800 bg-slate-800/50 p-3 animate-fade-in">
            <FilterRow label="Severity" options={SEVERITY_ORDER} selected={severities} onToggle={(v) => toggleFilter(severities, v, setSeverities)} />
            <FilterRow label="Threat Type" options={THREAT_TYPES} selected={threatTypes} onToggle={(v) => toggleFilter(threatTypes, v, setThreatTypes)} />
            <FilterRow label="Status" options={['open', 'investigating', 'resolved', 'false_positive'] as AlertStatus[]} selected={statuses} onToggle={(v) => toggleFilter(statuses, v, setStatuses)} formatLabel={(v) => STATUS_LABELS[v]} />
            {(severities.length > 0 || threatTypes.length > 0 || statuses.length > 0) && (
              <button
                onClick={() => { setSeverities([]); setThreatTypes([]); setStatuses([]); setPage(1); }}
                className="text-xs text-blue-400 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2 font-medium">Severity</th>
              <th className="px-4 py-2 font-medium">Threat</th>
              <th className="px-4 py-2 font-medium">IP</th>
              <th className="px-4 py-2 font-medium hidden lg:table-cell">Details</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium hidden md:table-cell">Time</th>
              <th className="px-4 py-2 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Loading alerts...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No alerts found. Upload a log file to detect threats.</td></tr>
            ) : (
              rows.map((alert) => (
                <tr
                  key={alert.id}
                  className="border-b border-slate-800/50 transition hover:bg-slate-800/30"
                >
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[alert.severity]}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{alert.threat_type}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{alert.ip}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate hidden lg:table-cell" title={alert.details}>{alert.details}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[alert.status]}`}>
                      {STATUS_LABELS[alert.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{formatTime(alert.timestamp)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onInvestigate(alert)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Investigate
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
          <span className="text-xs text-slate-500">
            {total.toLocaleString()} alerts — Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setPage(Math.max(1, page - 1)); onRefresh(); }}
              disabled={page === 1}
              className="rounded-lg border border-slate-700 p-1.5 text-slate-400 transition hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setPage(Math.min(totalPages, page + 1)); onRefresh(); }}
              disabled={page === totalPages}
              className="rounded-lg border border-slate-700 p-1.5 text-slate-400 transition hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterRow<T extends string>({ label, options, selected, onToggle, formatLabel }: {
  label: string;
  options: T[];
  selected: T[];
  onToggle: (v: T) => void;
  formatLabel?: (v: T) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-xs font-medium text-slate-400">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`rounded-md border px-2 py-0.5 text-xs transition ${
              selected.includes(opt)
                ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                : 'border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            {formatLabel ? formatLabel(opt) : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
