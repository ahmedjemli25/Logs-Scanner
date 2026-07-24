import { ShieldAlert, Ban } from 'lucide-react';
import type { IpActivity } from '../types/dashboard';
import { THREAT_TYPES } from '../types/dashboard';

interface Props {
  ips: IpActivity[];
  onInvestigate: (ip: string) => void;
}

export function HighRiskIpsPanel({ ips, onInvestigate }: Props) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-slate-200">High-Risk IPs</h2>
          <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{ips.length}</span>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {ips.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-slate-500">
            No flagged IPs yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {ips.slice(0, 20).map((entry) => (
              <div
                key={entry.ip}
                className="group p-3 transition hover:bg-slate-800/30"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-slate-200">{entry.ip}</span>
                  {entry.isBlocked && (
                    <span className="flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-xs text-red-400">
                      <Ban className="h-3 w-3" />
                      Blocked
                    </span>
                  )}
                  <span className="ml-auto text-xs tabular-nums text-slate-500">{entry.alertCount} alerts</span>
                </div>

                {/* Threat type chips */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {THREAT_TYPES.map((type) => {
                    const count = entry.byType[type];
                    if (count === 0) return null;
                    return (
                      <span key={type} className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">
                        {type}: {count}
                      </span>
                    );
                  })}
                  {entry.criticalCount > 0 && (
                    <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-xs text-red-400">
                      {entry.criticalCount} critical
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onInvestigate(entry.ip)}
                  className="mt-2 text-xs text-blue-400 opacity-0 transition group-hover:opacity-100 hover:underline"
                >
                  View details →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
