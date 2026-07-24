import { supabase } from './supabase';
import { encodeLogInsert, encodeAlertInsert, decodeLogRow, decodeAlertRow } from './encoding';
import { parseLogContent, type ParsedLog } from './log-parser';
import { runDetection } from './threat-detection';
import type { AlertRow, BlockedIpRow, LogRow, RemediationActionRow, AlertStatus, ActionType } from '../types/database';
import type { DashboardMetrics, ThreatBreakdown, TimelinePoint, IpActivity } from '../types/dashboard';

// ─── Upload ───

export async function uploadLogFile(content: string): Promise<{ logsInserted: number; alertsCreated: number }> {
  const parsed = parseLogContent(content);
  if (parsed.length === 0) {
    throw new Error('No parseable log lines found in the uploaded file.');
  }

  const detection = runDetection(parsed);

  // Insert logs in batches
  const logInserts = parsed.map((l) =>
    encodeLogInsert({
      ip: l.ip, timestamp: l.timestamp, method: l.method, path: l.path,
      status: l.status, user_agent: l.userAgent, source_format: l.sourceFormat,
      raw_line: l.rawLine,
    })
  );

  const insertedLogs: LogRow[] = [];
  for (let i = 0; i < logInserts.length; i += 500) {
    const batch = logInserts.slice(i, i + 500);
    const { data, error } = await supabase.from('logs').insert(batch).select();
    if (error) throw new Error(`Failed to store log rows: ${error.message}`);
    if (data) insertedLogs.push(...(data as LogRow[]));
  }

  // Map parsed → inserted log id by order (Supabase returns rows in input order)
  const parsedToLogId = new Map<ParsedLog, string>();
  for (let i = 0; i < parsed.length && i < insertedLogs.length; i++) {
    parsedToLogId.set(parsed[i], insertedLogs[i].id);
  }

  // Build alert inserts
  const alertInserts: Record<string, string>[] = [];
  for (const { log, threats } of detection.payloadThreats) {
    const logId = parsedToLogId.get(log);
    if (!logId) continue;
    for (const t of threats) {
      alertInserts.push(encodeAlertInsert({
        log_id: logId, ip: log.ip, threat_type: t.threatType,
        severity: t.severity, details: t.details, timestamp: log.timestamp,
      }));
    }
  }
  for (const hit of detection.bruteForce) {
    const logId = parsedToLogId.get(hit.triggeringLog);
    if (!logId) continue;
    alertInserts.push(encodeAlertInsert({
      log_id: logId, ip: hit.ip, threat_type: hit.threatType,
      severity: hit.severity, details: hit.details, timestamp: hit.triggeringLog.timestamp,
    }));
  }

  // Insert alerts in batches
  for (let i = 0; i < alertInserts.length; i += 500) {
    const batch = alertInserts.slice(i, i + 500);
    const { error } = await supabase.from('alerts').insert(batch);
    if (error) throw new Error(`Failed to store alerts: ${error.message}`);
  }

  return { logsInserted: parsed.length, alertsCreated: alertInserts.length };
}

// ─── Analytics ───

export async function fetchMetrics(): Promise<DashboardMetrics> {
  const [
    { count: totalLogs },
    { count: totalAlerts },
    { count: openAlerts },
    { count: investigatingAlerts },
    { count: resolvedAlerts },
    { count: criticalAlerts },
    { count: blockedIps },
  ] = await Promise.all([
    supabase.from('logs').select('*', { count: 'exact', head: true }),
    supabase.from('alerts').select('*', { count: 'exact', head: true }),
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'investigating'),
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('severity', 'Critical'),
    supabase.from('blocked_ips').select('*', { count: 'exact', head: true }),
  ]);

  const { count: highRiskCount } = await supabase
    .from('alerts')
    .select('ip', { count: 'exact', head: true })
    .eq('severity', 'Critical');

  return {
    totalLogs: totalLogs ?? 0,
    totalAlerts: totalAlerts ?? 0,
    openAlerts: openAlerts ?? 0,
    investigatingAlerts: investigatingAlerts ?? 0,
    resolvedAlerts: resolvedAlerts ?? 0,
    highRiskIps: highRiskCount ?? 0,
    criticalAlerts: criticalAlerts ?? 0,
    blockedIps: blockedIps ?? 0,
  };
}

export async function fetchThreatBreakdown(): Promise<ThreatBreakdown> {
  const { data } = await supabase.from('alerts').select('threat_type, severity');
  const byType = { 'SQL Injection': 0, 'Path Traversal': 0, XSS: 0, 'Brute Force': 0 } as Record<string, number>;
  const bySeverity = { Low: 0, Medium: 0, High: 0, Critical: 0 } as Record<string, number>;
  for (const a of (data ?? []) as Pick<AlertRow, 'threat_type' | 'severity'>[]) {
    byType[a.threat_type] = (byType[a.threat_type] ?? 0) + 1;
    bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
  }
  return { byType: byType as ThreatBreakdown['byType'], bySeverity: bySeverity as ThreatBreakdown['bySeverity'] };
}

export async function fetchTimeline(): Promise<TimelinePoint[]> {
  const { data } = await supabase
    .from('alerts')
    .select('timestamp, severity')
    .order('timestamp', { ascending: true });

  const map = new Map<string, { threats: number; criticals: number }>();
  for (const r of (data ?? []) as Pick<AlertRow, 'timestamp' | 'severity'>[]) {
    const bucket = bucketToHour(r.timestamp);
    const entry = map.get(bucket) ?? { threats: 0, criticals: 0 };
    entry.threats++;
    if (r.severity === 'Critical') entry.criticals++;
    map.set(bucket, entry);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, counts]) => ({ hour, threats: counts.threats, criticals: counts.criticals }));
}

export async function fetchHighRiskIps(): Promise<IpActivity[]> {
  const { data: alerts } = await supabase.from('alerts').select('ip, threat_type, severity, timestamp');
  const { data: blocked } = await supabase.from('blocked_ips').select('ip');
  const blockedSet = new Set((blocked ?? []).map((b: { ip: string }) => b.ip));

  const byIp = new Map<string, IpActivity>();
  for (const a of (alerts ?? []) as Pick<AlertRow, 'ip' | 'threat_type' | 'severity' | 'timestamp'>[]) {
    const entry = byIp.get(a.ip) ?? {
      ip: a.ip, alertCount: 0, criticalCount: 0,
      byType: { 'SQL Injection': 0, 'Path Traversal': 0, XSS: 0, 'Brute Force': 0 } as IpActivity['byType'],
      lastSeen: a.timestamp, isBlocked: blockedSet.has(a.ip),
    };
    entry.alertCount++;
    if (a.severity === 'Critical') entry.criticalCount++;
    if (a.threat_type in entry.byType) entry.byType[a.threat_type as keyof typeof entry.byType]++;
    if (a.timestamp > entry.lastSeen) entry.lastSeen = a.timestamp;
    byIp.set(a.ip, entry);
  }

  return Array.from(byIp.values()).sort((a, b) => b.alertCount - a.alertCount);
}

// ─── Alerts Table ───

export interface AlertsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  severities?: string[];
  threatTypes?: string[];
  statuses?: string[];
}

export async function fetchAlerts(query: AlertsQuery): Promise<{ rows: AlertRow[]; total: number; totalPages: number }> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  let dbQuery = supabase.from('alerts').select('*', { count: 'exact' });

  if (query.severities?.length) dbQuery = dbQuery.in('severity', query.severities);
  if (query.threatTypes?.length) dbQuery = dbQuery.in('threat_type', query.threatTypes);
  if (query.statuses?.length) dbQuery = dbQuery.in('status', query.statuses);

  if (query.search) {
    // IP search works DB-side; details are encoded so fetch candidates + filter in-memory
    dbQuery = dbQuery.or(`ip.ilike.%${query.search}%`);
  }

  const offset = (page - 1) * pageSize;
  const { data, count, error } = await dbQuery
    .order('timestamp', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);

  let rows = (data ?? []).map((r) => decodeAlertRow(r) as AlertRow);

  // In-memory filter on decoded details if searching
  if (query.search) {
    const search = query.search.toLowerCase();
    const original = rows;
    rows = original.filter((r) =>
      r.ip.toLowerCase().includes(search) || (r.details ?? '').toLowerCase().includes(search)
    );
    // If we filtered some out, fetch more to fill the page
    if (rows.length < pageSize && original.length === pageSize) {
      // Simple approach: fetch a larger set and re-filter
      const { data: more } = await supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(0, Math.min(offset + pageSize * 3, 500));
      const decoded = (more ?? []).map((r) => decodeAlertRow(r) as AlertRow);
      const filtered = decoded.filter((r) =>
        r.ip.toLowerCase().includes(search) || (r.details ?? '').toLowerCase().includes(search)
      );
      return {
        rows: filtered.slice(offset, offset + pageSize),
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      };
    }
  }

  return {
    rows,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

// ─── Investigation ───

export async function fetchInvestigation(alertId: string): Promise<{
  alert: (AlertRow & { log?: LogRow }) | null;
  ipHistory: LogRow[];
  ipAlerts: AlertRow[];
  remediationHistory: RemediationActionRow[];
  isBlocked: boolean;
}> {
  // Fetch the alert
  const { data: alertData } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', alertId)
    .maybeSingle();

  if (!alertData) return { alert: null, ipHistory: [], ipAlerts: [], remediationHistory: [], isBlocked: false };

  const alert = decodeAlertRow(alertData) as AlertRow;

  // Fetch the linked log
  let linkedLog: LogRow | undefined;
  if (alert.log_id) {
    const { data: logData } = await supabase
      .from('logs')
      .select('*')
      .eq('id', alert.log_id)
      .maybeSingle();
    if (logData) linkedLog = decodeLogRow(logData) as LogRow;
  }

  // Fetch all logs from this IP (last 50)
  const { data: ipLogs } = await supabase
    .from('logs')
    .select('*')
    .eq('ip', alert.ip)
    .order('timestamp', { ascending: false })
    .limit(50);
  const ipHistory = (ipLogs ?? []).map((r) => decodeLogRow(r) as LogRow);

  // Fetch all alerts from this IP
  const { data: ipAlertsData } = await supabase
    .from('alerts')
    .select('*')
    .eq('ip', alert.ip)
    .order('timestamp', { ascending: false });
  const ipAlerts = (ipAlertsData ?? []).map((r) => decodeAlertRow(r) as AlertRow);

  // Fetch remediation history for this IP or alert
  const { data: remediation } = await supabase
    .from('remediation_actions')
    .select('*')
    .or(`ip.eq.${alert.ip},alert_id.eq.${alertId}`)
    .order('performed_at', { ascending: false });

  // Check if IP is blocked
  const { data: blocked } = await supabase
    .from('blocked_ips')
    .select('*')
    .eq('ip', alert.ip)
    .maybeSingle();

  return {
    alert: { ...alert, log: linkedLog },
    ipHistory,
    ipAlerts,
    remediationHistory: (remediation ?? []) as RemediationActionRow[],
    isBlocked: !!blocked,
  };
}

// ─── Actions ───

export async function updateAlertStatus(alertId: string, status: AlertStatus, notes?: string): Promise<void> {
  const update: Record<string, string> = { status };
  if (notes !== undefined) update.notes = notes;
  const { error } = await supabase.from('alerts').update(update).eq('id', alertId);
  if (error) throw new Error(error.message);
}

export async function updateAlertNotes(alertId: string, notes: string): Promise<void> {
  const { error } = await supabase.from('alerts').update({ notes }).eq('id', alertId);
  if (error) throw new Error(error.message);
}

export async function blockIp(ip: string, reason: string, alertId?: string): Promise<void> {
  // Insert into blocked_ips (upsert — one entry per IP)
  const { error: blockError } = await supabase
    .from('blocked_ips')
    .upsert({ ip, reason, blocked_by: 'analyst', blocked_at: new Date().toISOString() }, { onConflict: 'ip' });

  if (blockError) throw new Error(blockError.message);

  // Log the remediation action
  const { error: actionError } = await supabase.from('remediation_actions').insert({
    alert_id: alertId ?? null,
    ip,
    action_type: 'block_ip' as ActionType,
    description: reason,
    performed_by: 'analyst',
    performed_at: new Date().toISOString(),
  });

  if (actionError) throw new Error(actionError.message);
}

export async function unblockIp(ip: string): Promise<void> {
  const { error } = await supabase.from('blocked_ips').delete().eq('ip', ip);
  if (error) throw new Error(error.message);
}

export async function logRemediationAction(
  alertId: string | null,
  ip: string,
  actionType: ActionType,
  description: string,
): Promise<void> {
  const { error } = await supabase.from('remediation_actions').insert({
    alert_id: alertId,
    ip,
    action_type: actionType,
    description,
    performed_by: 'analyst',
    performed_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  // Auto-update alert status based on action
  if (alertId) {
    const statusMap: Partial<Record<ActionType, AlertStatus>> = {
      false_positive: 'false_positive',
      vulnerability_fix: 'resolved',
      security_update: 'resolved',
    };
    const newStatus = statusMap[actionType];
    if (newStatus) {
      await supabase.from('alerts').update({ status: newStatus }).eq('id', alertId);
    }
  }
}

// ─── Blocked IPs & Remediation ───

export async function fetchBlockedIps(): Promise<BlockedIpRow[]> {
  const { data, error } = await supabase
    .from('blocked_ips')
    .select('*')
    .order('blocked_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BlockedIpRow[];
}

export async function fetchRemediationHistory(): Promise<RemediationActionRow[]> {
  const { data, error } = await supabase
    .from('remediation_actions')
    .select('*')
    .order('performed_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as RemediationActionRow[];
}

// ─── Helpers ───

function bucketToHour(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`;
}
