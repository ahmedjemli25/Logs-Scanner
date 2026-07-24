// Row types mirror the VulnTrack schema (see migration: create_logs_and_alerts_tables).

export type SourceFormat = 'nginx' | 'auth';

export type ThreatType = 'SQL Injection' | 'Path Traversal' | 'XSS' | 'Brute Force';

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface LogRow {
  id: string;
  ip: string;
  timestamp: string; // ISO timestamp
  method: string;
  path: string;
  status: string;
  user_agent: string;
  source_format: SourceFormat;
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
  timestamp: string; // ISO timestamp
  created_at: string;
}

// Minimal Database shape used to type the Supabase client.
export interface Database {
  public: {
    Tables: {
      logs: {
        Row: LogRow;
        Insert: Omit<LogRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<LogRow, 'id' | 'created_at'>>;
      };
      alerts: {
        Row: AlertRow;
        Insert: Omit<AlertRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<AlertRow, 'id' | 'created_at'>>;
      };
    };
  };
}
