export interface DashboardMetrics {
  totalLogs: number;
  totalAlerts: number;
  highRiskIps: number;
  highRiskIpList: string[];
  criticalAlerts: number;
}

export interface ThreatBreakdownByType {
  'SQL Injection': number;
  'Path Traversal': number;
  XSS: number;
  'Brute Force': number;
}

export interface ThreatBreakdownBySeverity {
  Low: number;
  Medium: number;
  High: number;
  Critical: number;
}

export interface TimelinePoint {
  hour: string;
  threats: number;
  criticals: number;
}

export interface HighRiskIp {
  ip: string;
  alertCount: number;
  criticalCount: number;
  byType: Record<string, number>;
  lastSeen: string;
}

export interface AnalyticsResponse {
  metrics: DashboardMetrics;
  breakdownByType: ThreatBreakdownByType;
  breakdownBySeverity: ThreatBreakdownBySeverity;
  timeline: TimelinePoint[];
  table: {
    view: 'logs' | 'alerts';
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    rows: LogTableRow[];
  };
  filters: {
    search: string;
    severities: string[];
    threatTypes: string[];
  };
}

export interface LogTableRow {
  id: string;
  ip: string;
  timestamp: string;
  method?: string;
  path?: string;
  status?: string;
  user_agent?: string;
  source_format?: string;
  raw_line?: string;
  // alert-specific
  log_id?: string;
  threat_type?: string;
  severity?: string;
  details?: string;
  created_at?: string;
}

export interface IngestResponse {
  logsProcessed: number;
  threatsFlagged: number;
  alertsByType?: Record<string, number>;
  alertsBySeverity?: Record<string, number>;
  highRiskIps?: string[];
  warning?: string;
}
