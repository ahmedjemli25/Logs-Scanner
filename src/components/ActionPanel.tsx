import { useState } from 'react';
import {
  Ban, ShieldCheck, Wrench, EyeOff, Eye, Loader2, AlertTriangle,
  X, CheckCircle, ShieldAlert,
} from 'lucide-react';
import type { AlertRow, ActionType } from '../types/database';
import { ACTION_LABELS } from '../types/dashboard';

interface Props {
  alert: AlertRow;
  isBlocked: boolean;
  onAction: (actionType: ActionType, description: string) => void;
  onUnblock: () => void;
}

const ACTION_CONFIG: { type: ActionType; icon: typeof Ban; color: string; bg: string; border: string; desc: string }[] = [
  { type: 'block_ip', icon: Ban, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', desc: 'Block this IP address from accessing your servers' },
  { type: 'security_update', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', desc: 'Apply security patches or update firewall rules' },
  { type: 'vulnerability_fix', icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', desc: 'Fix the underlying vulnerability in the application' },
  { type: 'false_positive', icon: EyeOff, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', desc: 'Mark this alert as a false positive' },
  { type: 'monitor', icon: Eye, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', desc: 'Continue monitoring this IP for further activity' },
];

export function ActionPanel({ alert, isBlocked, onAction, onUnblock }: Props) {
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);

  const handleExecute = async () => {
    setPending(true);
    try {
      onAction(activeAction!, description);
      setActiveAction(null);
      setDescription('');
    } finally {
      setPending(false);
    }
  };

  const handleCancel = () => {
    setActiveAction(null);
    setDescription('');
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-slate-200">Take Action</h3>
      </div>

      {/* IP blocked banner */}
      {isBlocked && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">This IP is currently blocked</span>
          </div>
          <button
            onClick={onUnblock}
            className="rounded-lg border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
          >
            Unblock IP
          </button>
        </div>
      )}

      {activeAction ? (
        /* Action form */
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 animate-scale-in">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-200">{ACTION_LABELS[activeAction]}</h4>
            <button onClick={handleCancel} className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              {activeAction === 'block_ip' ? 'Block Reason' : 'Description / Notes'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                activeAction === 'block_ip'
                  ? `e.g. Repeated ${alert.threat_type} attacks from this IP`
                  : activeAction === 'security_update'
                  ? 'e.g. Updated WAF rules to block SQL injection patterns'
                  : activeAction === 'vulnerability_fix'
                  ? 'e.g. Patched input validation in /search endpoint'
                  : activeAction === 'false_positive'
                  ? 'e.g. Legitimate security scanner, no real threat'
                  : 'e.g. Monitoring IP for 24 hours before taking action'
              }
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExecute}
              disabled={pending || (activeAction === 'block_ip' && !description.trim())}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {activeAction === 'block_ip' ? 'Block IP' : 'Confirm Action'}
            </button>
            <button
              onClick={handleCancel}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>

          {activeAction === 'block_ip' && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" />
              <p className="text-xs text-yellow-400/90">
                Blocking this IP will prevent all traffic from {alert.ip}. This action is logged in the remediation history.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Action grid */
        <div className="grid grid-cols-1 gap-2">
          {ACTION_CONFIG.map(({ type, icon: Icon, color, bg, border, desc }) => {
            const isBlock = type === 'block_ip';
            const disabled = isBlock && isBlocked;
            return (
              <button
                key={type}
                onClick={() => !disabled && setActiveAction(type)}
                disabled={disabled}
                className={`group flex items-center gap-3 rounded-lg border ${border} ${bg} p-3 text-left transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <div className={`shrink-0 rounded-lg p-2 ${bg} ring-1 ${border}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${color}`}>{ACTION_LABELS[type]}</div>
                  <div className="text-xs text-slate-400">{desc}</div>
                </div>
                {disabled && (
                  <span className="text-xs text-slate-500">Already blocked</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
