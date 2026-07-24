import { useState, useEffect, useCallback } from 'react';
import {
  X, Search, Clock, ShieldAlert, Ban, Wrench, ShieldCheck, EyeOff, Eye,
  FileText, History, AlertTriangle, CheckCircle, Loader2, Network,
} from 'lucide-react';
import type { AlertRow, LogRow, RemediationActionRow, AlertStatus, ActionType } from '../types/database';
import { fetchInvestigation, updateAlertStatus, updateAlertNotes, blockIp, unblockIp, logRemediationAction } from '../lib/api';
import { SEVERITY_COLORS, STATUS_COLORS, STATUS_LABELS, ACTION_LABELS } from '../types/dashboard';
import { ActionPanel } from './ActionPanel';

interface Props {
  alert: AlertRow;
  onClose: () => void;
  onAction: () => Promise<void>;
}

type Tab = 'overview' | 'ip-history' | 'actions';

export function InvestigationDrawer({ alert, onClose, onAction }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchInvestigation>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!alert.id) {
      // No alert ID — can't fetch investigation
      setData({ alert: null, ipHistory: [], ipAlerts: [], remediationHistory: [], isBlocked: false });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchInvestigation(alert.id);
      setData(result);
      setNotes(result.alert?.notes ?? '');
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [alert.id]);

  useEffect(() => { load(); }, [load]);

  const handleSaveNotes = async () => {
    if (!alert.id) return;
    setSavingNotes(true);
    try {
      await updateAlertNotes(alert.id, notes);
      setActionMsg({ type: 'success', text: 'Notes saved.' });
      setTimeout(() => setActionMsg(null), 2000);
    } catch (err) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save notes.' });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleStatusChange = async (status: AlertStatus) => {
    if (!alert.id) return;
    try {
      await updateAlertStatus(alert.id, status);
      await load();
      await onAction();
      setActionMsg({ type: 'success', text: `Status changed to ${STATUS_LABELS[status]}.` });
      setTimeout(() => setActionMsg(null), 2000);
    } catch (err) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update status.' });
    }
  };

  const handleAction = async (actionType: ActionType, description: string, extra?: string) => {
    try {
      if (actionType === 'block_ip') {
        const reason = description || `Blocked due to ${alert.threat_type} alert`;
        await blockIp(alert.ip, reason, alert.id || undefined);
      } else {
        await logRemediationAction(alert.id || null, alert.ip, actionType, description);
      }
      await load();
      await onAction();
      setActionMsg({ type: 'success', text: `${ACTION_LABELS[actionType]} completed successfully.` });
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Action failed.' });
    }
  };

  const handleUnblock = async () => {
    try {
      await unblockIp(alert.ip);
      await load();
      await onAction();
      setActionMsg({ type: 'success', text: 'IP unblocked.' });
      setTimeout(() => setActionMsg(null), 2000);
    } catch (err) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to unblock IP.' });
    }
  };

  const currentAlert = data?.alert;
  const isBlocked = data?.isBlocked ?? false;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto border-l border-slate-800 bg-slate-950 shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
          <div className="flex items-start justify-between p-5">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                <h2 className="text-lg font-bold text-slate-100">Threat Investigation</h2>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[alert.severity]}`}>
                  {alert.severity}
                </span>
                <span className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
                  {alert.threat_type}
                </span>
                {currentAlert && (
                  <span className={`rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[currentAlert.status]}`}>
                    {STATUS_LABELS[currentAlert.status]}
                  </span>
                )}
                {isBlocked && (
                  <span className="rounded border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
                    IP Blocked
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-5">
            <DrawerTab active={tab === 'overview'} onClick={() => setTab('overview')} icon={<Search className="h-4 w-4" />} label="Overview" />
            <DrawerTab active={tab === 'ip-history'} onClick={() => setTab('ip-history')} icon={<Network className="h-4 w-4" />} label="IP History" badge={data?.ipHistory.length} />
            <DrawerTab active={tab === 'actions'} onClick={() => setTab('actions')} icon={<ShieldCheck className="h-4 w-4" />} label="Actions" badge={data?.remediationHistory.length} />
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {actionMsg && (
            <div className={`mb-4 rounded-lg border px-4 py-3 text-sm animate-fade-in ${
              actionMsg.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}>
              {actionMsg.text}
            </div>
          )}

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
            </div>
          ) : !currentAlert ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-500">
              Unable to load investigation data for this alert.
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <OverviewTab alert={currentAlert} log={currentAlert.log} ipAlerts={data!.ipAlerts} notes={notes} onNotesChange={setNotes} onSaveNotes={handleSaveNotes} savingNotes={savingNotes} onStatusChange={handleStatusChange} />
              )}
              {tab === 'ip-history' && (
                <IpHistoryTab ip={alert.ip} logs={data!.ipHistory} alerts={data!.ipAlerts} isBlocked={isBlocked} />
              )}
              {tab === 'actions' && (
                <ActionsTab alert={currentAlert} isBlocked={isBlocked} remediationHistory={data!.remediationHistory} onAction={handleAction} onUnblock={handleUnblock} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerTab({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
        active ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-0.5 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{badge}</span>
      )}
    </button>
  );
}

// ─── Overview Tab ───

function OverviewTab({ alert, log, ipAlerts, notes, onNotesChange, onSaveNotes, savingNotes, onStatusChange }: {
  alert: AlertRow & { log?: LogRow };
  log?: LogRow;
  ipAlerts: AlertRow[];
  notes: string;
  onNotesChange: (v: string) => void;
  onSaveNotes: () => void;
  savingNotes: boolean;
  onStatusChange: (s: AlertStatus) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Alert details */}
      <Section title="Alert Details" icon={<AlertTriangle className="h-4 w-4 text-orange-400" />}>
        <DetailRow label="IP Address" value={alert.ip} mono />
        <DetailRow label="Threat Type" value={alert.threat_type} />
        <DetailRow label="Severity" value={alert.severity} />
        <DetailRow label="Detected" value={formatDateTime(alert.timestamp)} />
        <DetailRow label="Status" value={STATUS_LABELS[alert.status]} />
        <div className="pt-1">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Description</div>
          <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-3 text-sm text-slate-300">{alert.details}</div>
        </div>
      </Section>

      {/* Quick status change */}
      <Section title="Quick Status" icon={<ShieldCheck className="h-4 w-4 text-blue-400" />}>
        <div className="flex flex-wrap gap-2">
          {(['open', 'investigating', 'resolved', 'false_positive'] as AlertStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                alert.status === s
                  ? `${STATUS_COLORS[s]} ring-1 ring-current/20`
                  : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </Section>

      {/* Linked log entry */}
      {log && (
        <Section title="Linked Log Entry" icon={<FileText className="h-4 w-4 text-slate-400" />}>
          <DetailRow label="Method" value={log.method} mono />
          <DetailRow label="Path" value={log.path} mono />
          <DetailRow label="Status Code" value={log.status} mono />
          <DetailRow label="User Agent" value={log.user_agent} />
          <DetailRow label="Source" value={log.source_format} />
          <DetailRow label="Timestamp" value={formatDateTime(log.timestamp)} />
          <div className="pt-1">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Raw Line</div>
            <pre className="max-h-40 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400 whitespace-pre-wrap break-all">{log.raw_line}</pre>
          </div>
        </Section>
      )}

      {/* Other alerts from same IP */}
      {ipAlerts.length > 1 && (
        <Section title={`Other Alerts from ${alert.ip} (${ipAlerts.length - 1})`} icon={<AlertTriangle className="h-4 w-4 text-yellow-400" />}>
          <div className="space-y-2">
            {ipAlerts.filter((a) => a.id !== alert.id).slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-800/30 p-2.5">
                <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</span>
                <span className="text-sm text-slate-300">{a.threat_type}</span>
                <span className="ml-auto text-xs text-slate-500">{formatDateTime(a.timestamp)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Investigation notes */}
      <Section title="Investigation Notes" icon={<FileText className="h-4 w-4 text-blue-400" />}>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add your investigation notes here..."
          rows={4}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={onSaveNotes}
          disabled={savingNotes}
          className="mt-2 flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {savingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Save Notes
        </button>
      </Section>
    </div>
  );
}

// ─── IP History Tab ───

function IpHistoryTab({ ip, logs, alerts, isBlocked }: { ip: string; logs: LogRow[]; alerts: AlertRow[]; isBlocked: boolean }) {
  return (
    <div className="space-y-5">
      <Section title={`Activity from ${ip}`} icon={<Network className="h-4 w-4 text-blue-400" />}>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Log Entries" value={logs.length} />
          <StatBox label="Alerts" value={alerts.length} />
          <StatBox label="Status" value={isBlocked ? 'Blocked' : 'Active'} color={isBlocked ? 'text-red-400' : 'text-emerald-400'} />
        </div>
      </Section>

      <Section title={`Recent Requests (${logs.length})`} icon={<Clock className="h-4 w-4 text-slate-400" />}>
        {logs.length === 0 ? (
          <div className="py-4 text-center text-sm text-slate-500">No log entries found for this IP.</div>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {logs.map((log) => {
              const hasAlert = alerts.some((a) => a.log_id === log.id);
              return (
                <div key={log.id} className={`rounded-lg border p-2.5 text-xs ${hasAlert ? 'border-orange-500/30 bg-orange-500/5' : 'border-slate-800 bg-slate-800/30'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-slate-300">{log.method}</span>
                    <span className="flex-1 truncate font-mono text-slate-400" title={log.path}>{log.path}</span>
                    <span className={`rounded px-1.5 py-0.5 font-mono ${log.status.startsWith('2') ? 'text-emerald-400' : log.status.startsWith('4') || log.status.startsWith('5') ? 'text-red-400' : 'text-slate-400'}`}>{log.status}</span>
                    {hasAlert && <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />}
                  </div>
                  <div className="mt-1 text-slate-500">{formatDateTime(log.timestamp)}</div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Actions Tab ───

function ActionsTab({ alert, isBlocked, remediationHistory, onAction, onUnblock }: {
  alert: AlertRow;
  isBlocked: boolean;
  remediationHistory: RemediationActionRow[];
  onAction: (actionType: ActionType, description: string) => void;
  onUnblock: () => void;
}) {
  return (
    <div className="space-y-5">
      <ActionPanel
        alert={alert}
        isBlocked={isBlocked}
        onAction={onAction}
        onUnblock={onUnblock}
      />

      {/* Remediation history */}
      <Section title="Remediation History" icon={<History className="h-4 w-4 text-slate-400" />}>
        {remediationHistory.length === 0 ? (
          <div className="py-4 text-center text-sm text-slate-500">No remediation actions taken yet.</div>
        ) : (
          <div className="space-y-2">
            {remediationHistory.map((action) => (
              <div key={action.id} className="rounded-lg border border-slate-800 bg-slate-800/30 p-3">
                <div className="flex items-center gap-2">
                  <ActionIcon type={action.action_type} />
                  <span className="text-sm font-medium text-slate-200">{ACTION_LABELS[action.action_type as ActionType] ?? action.action_type}</span>
                  <span className="ml-auto text-xs text-slate-500">{formatDateTime(action.performed_at)}</span>
                </div>
                {action.description && <p className="mt-1.5 text-sm text-slate-400">{action.description}</p>}
                <div className="mt-1 text-xs text-slate-500">IP: {action.ip} · By: {action.performed_by}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Shared ───

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 whitespace-nowrap">{label}</span>
      <span className={`text-sm text-slate-300 text-right ${mono ? 'font-mono' : ''} break-all`}>{value}</span>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-3 text-center">
      <div className={`text-xl font-bold tabular-nums ${color ?? 'text-slate-100'}`}>{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function ActionIcon({ type }: { type: string }) {
  const icons: Record<string, typeof Ban> = {
    block_ip: Ban,
    security_update: ShieldCheck,
    vulnerability_fix: Wrench,
    false_positive: EyeOff,
    monitor: Eye,
  };
  const Icon = icons[type] ?? ShieldAlert;
  const colors: Record<string, string> = {
    block_ip: 'text-red-400',
    security_update: 'text-emerald-400',
    vulnerability_fix: 'text-blue-400',
    false_positive: 'text-slate-400',
    monitor: 'text-yellow-400',
  };
  return <Icon className={`h-4 w-4 ${colors[type] ?? 'text-slate-400'}`} />;
}

function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
