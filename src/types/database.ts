export type ThreatType = 'SQL Injection' | 'Path Traversal' | 'XSS' | 'Brute Force';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'false_positive';
export type ActionType = 'block_ip' | 'security_update' | 'vulnerability_fix' | 'false_positive' | 'monitor';

export interface LogRow {
  id: string;
  ip: string;
  timestamp: string;
  method: string;
  path: string;
  status: string;
  user_agent: string;
  source_format: string;
  raw_line: string;
  created_at: string;
}

export interface AlertRow {
  id: string;
  log_id: string;
  ip: string;
  threat_type: ThreatType;
  severity: Severity;
  details: string;
  timestamp: string;
  created_at: string;
  status: AlertStatus;
  notes: string;
  assigned_to: string | null;
}

export interface BlockedIpRow {
  id: string;
  ip: string;
  reason: string;
  blocked_by: string;
  blocked_at: string;
  created_at: string;
}

export interface RemediationActionRow {
  id: string;
  alert_id: string | null;
  ip: string;
  action_type: ActionType;
  description: string;
  performed_by: string;
  performed_at: string;
  created_at: string;
}
