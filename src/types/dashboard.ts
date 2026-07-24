import type { Severity, ThreatType, AlertStatus, ActionType, AlertRow, LogRow, RemediationActionRow } from './database';

export interface DashboardMetrics {
  totalLogs: number;
  totalAlerts: number;
  openAlerts: number;
  investigatingAlerts: number;
  resolvedAlerts: number;
  highRiskIps: number;
  criticalAlerts: number;
  blockedIps: number;
}

export interface ThreatBreakdown {
  byType: Record<ThreatType, number>;
  bySeverity: Record<Severity, number>;
}

export interface TimelinePoint {
  hour: string;
  threats: number;
  criticals: number;
}

export interface IpActivity {
  ip: string;
  alertCount: number;
  criticalCount: number;
  byType: Record<ThreatType, number>;
  lastSeen: string;
  isBlocked: boolean;
}

export interface InvestigationData {
  alert: AlertRow & { log?: LogRow };
  ipHistory: LogRow[];
  ipAlerts: AlertRow[];
  remediationHistory: RemediationActionRow[];
  isBlocked: boolean;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

export const SEVERITY_ORDER: Severity[] = ['Critical', 'High', 'Medium', 'Low'];
export const THREAT_TYPES: ThreatType[] = ['SQL Injection', 'Path Traversal', 'XSS', 'Brute Force'];
export const ALERT_STATUSES: AlertStatus[] = ['open', 'investigating', 'resolved', 'false_positive'];
export const ACTION_TYPES: ActionType[] = ['block_ip', 'security_update', 'vulnerability_fix', 'false_positive', 'monitor'];

export const ACTION_LABELS: Record<ActionType, string> = {
  block_ip: 'Block IP Address',
  security_update: 'Security Update',
  vulnerability_fix: 'Fix Vulnerability',
  false_positive: 'Mark as False Positive',
  monitor: 'Monitor',
};

export const ACTION_ICONS: Record<ActionType, string> = {
  block_ip: 'Ban',
  security_update: 'ShieldCheck',
  vulnerability_fix: 'Wrench',
  false_positive: 'EyeOff',
  monitor: 'Eye',
};

export const STATUS_LABELS: Record<AlertStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  resolved: 'Resolved',
  false_positive: 'False Positive',
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  Critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  High: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  Medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  Low: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export const STATUS_COLORS: Record<AlertStatus, string> = {
  open: 'bg-red-500/15 text-red-400 border-red-500/30',
  investigating: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  false_positive: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export const THREAT_ICONS: Record<ThreatType, string> = {
  'SQL Injection': 'Database',
  'Path Traversal': 'FolderTree',
  XSS: 'Code',
  'Brute Force': 'Repeat',
};
