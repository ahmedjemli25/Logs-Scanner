import { useState, useEffect, useCallback } from 'react';
import { Ban, Loader2, Trash2, ShieldAlert } from 'lucide-react';
import type { BlockedIpRow } from '../types/database';
import { fetchBlockedIps, unblockIp } from '../lib/api';

export function BlockedIpsView({ onRefresh }: { onRefresh: () => void }) {
  const [ips, setIps] = useState<BlockedIpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBlockedIps();
      setIps(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnblock = async (ip: string) => {
    setUnblocking(ip);
    try {
      await unblockIp(ip);
      await load();
      onRefresh();
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold text-slate-200">Blocked IP Addresses</h2>
          <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{ips.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        </div>
      ) : ips.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center text-slate-500">
          <ShieldAlert className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">No blocked IPs. Block IPs from the investigation panel.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {ips.map((entry) => (
            <div key={entry.id} className="flex items-center gap-4 p-4 transition hover:bg-slate-800/30">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-red-500/20">
                <Ban className="h-4 w-4 text-red-400" />
              </div>
              <div className="flex-1">
                <div className="font-mono text-sm font-medium text-slate-200">{entry.ip}</div>
                <div className="text-xs text-slate-500">{entry.reason}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Blocked {formatDate(entry.blocked_at)}</div>
                <div className="text-xs text-slate-500">by {entry.blocked_by}</div>
              </div>
              <button
                onClick={() => handleUnblock(entry.ip)}
                disabled={unblocking === entry.ip}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
              >
                {unblocking === entry.ip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
