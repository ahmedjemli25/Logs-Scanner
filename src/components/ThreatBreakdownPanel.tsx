import { PieChart } from 'lucide-react';
import type { ThreatBreakdown } from '../types/dashboard';
import { THREAT_TYPES, SEVERITY_ORDER, SEVERITY_COLORS } from '../types/dashboard';
import { Database, FolderTree, Code, Repeat } from 'lucide-react';

const THREAT_ICONS: Record<string, typeof Database> = {
  'SQL Injection': Database,
  'Path Traversal': FolderTree,
  XSS: Code,
  'Brute Force': Repeat,
};

export function ThreatBreakdownPanel({ breakdown }: { breakdown: ThreatBreakdown }) {
  const total = Object.values(breakdown.byType).reduce((a, b) => a + b, 0);
  const maxType = Math.max(...Object.values(breakdown.byType), 1);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <PieChart className="h-4 w-4 text-blue-400" />
        <h2 className="text-sm font-semibold text-slate-200">Threat Breakdown</h2>
      </div>

      <div className="space-y-4">
        {/* By type */}
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">By Type</div>
          <div className="space-y-2">
            {THREAT_TYPES.map((type) => {
              const count = breakdown.byType[type];
              const pct = total > 0 ? (count / total) * 100 : 0;
              const Icon = THREAT_ICONS[type];
              return (
                <div key={type} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-slate-400" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{type}</span>
                      <span className="tabular-nums text-slate-500">{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${(count / maxType) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By severity */}
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">By Severity</div>
          <div className="flex gap-2">
            {SEVERITY_ORDER.map((sev) => (
              <div
                key={sev}
                className={`flex-1 rounded-lg border px-3 py-2 ${SEVERITY_COLORS[sev]}`}
              >
                <div className="text-lg font-bold tabular-nums">{breakdown.bySeverity[sev]}</div>
                <div className="text-xs opacity-80">{sev}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
