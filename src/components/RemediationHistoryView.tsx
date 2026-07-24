import { useState, useEffect, useCallback } from 'react';
import { History, Loader2, Ban, ShieldCheck, Wrench, EyeOff, Eye } from 'lucide-react';
import type { RemediationActionRow, ActionType } from '../types/database';
import { ACTION_LABELS } from '../types/dashboard';
import { fetchRemediationHistory } from '../lib/api';

const ACTION_ICON_MAP: Record<string, typeof Ban> = {
  block_ip: Ban,
  security_update: ShieldCheck,
  vulnerability_fix: Wrench,
  false_positive: EyeOff,
  monitor: Eye,
};

const ACTION_COLOR_MAP: Record<string, string> = {
  block_ip: 'text-red-400 bg-red-500/10 ring-red-500/20',
  security_update: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20',
  vulnerability_fix: 'text-blue-400 bg-blue-500/10 ring-blue-500/20',
  false_positive: 'text-slate-400 bg-slate-500/10 ring-slate-500/20',
  monitor: 'text-yellow-400 bg-yellow-500/10 ring-yellow-500/20',
};

export function RemediationHistoryView() {
  const [actions, setActions] = useState<RemediationActionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRemediationHistory();
      setActions(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200">Remediation History</h2>
          <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{actions.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        </div>
      ) : actions.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center text-slate-500">
          <History className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">No remediation actions yet. Take action on an alert to see it here.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {actions.map((action) => {
            const Icon = ACTION_ICON_MAP[action.action_type] ?? ShieldCheck;
            const colorClass = ACTION_COLOR_MAP[action.action_type] ?? 'text-slate-400 bg-slate-500/10 ring-slate-500/20';
            return (
              <div key={action.id} className="flex items-start gap-4 p-4 transition hover:bg-slate-800/30">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-200">
                    {ACTION_LABELS[action.action_type as ActionType] ?? action.action_type}
                  </div>
                  {action.description && (
                    <p className="mt-0.5 text-sm text-slate-400">{action.description}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-mono">{action.ip}</span>
                    <span>by {action.performed_by}</span>
                    <span>{formatDateTime(action.performed_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
