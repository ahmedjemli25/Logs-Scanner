/*
# VulnTrack — Log ingestion and attack-detection schema

## Overview
Creates the persistence layer for VulnTrack, a defensive security tool that
ingests server access/auth logs, normalizes them, and flags suspected web
application attacks (SQLi, Path Traversal, XSS, Brute-Force).

## New Tables

### 1. `logs` — normalized log entries
Each row represents one parsed line from an uploaded log file.
- `id`            uuid, primary key
- `ip`            text, source IP address (indexed for high-risk-IP lookups)
- `timestamp`     timestamptz, the moment the log event occurred (from the log line)
- `method`        text, HTTP method (GET/POST/...) or 'SSH' for auth.log entries
- `path`          text, requested URL path or SSH auth target
- `status`        text, HTTP status code or SSH event label (e.g. '401', 'Failed')
- `user_agent`    text, client User-Agent string (empty for auth.log)
- `source_format` text, origin format: 'nginx' | 'auth'
- `raw_line`      text, the original unparsed log line (for audit/forensics)
- `created_at`    timestamptz, when this row was ingested

### 2. `alerts` — detected threats linked to log entries
Each row is a flagged attack tied to one or more log entries.
- `id`           uuid, primary key
- `log_id`       uuid, FK -> logs.id ON DELETE CASCADE (the triggering log entry)
- `ip`           text, offending IP (indexed for high-risk-IP aggregation)
- `threat_type`  text, one of: 'SQL Injection' | 'Path Traversal' | 'XSS' | 'Brute Force'
- `severity`     text, one of: 'Low' | 'Medium' | 'High' | 'Critical'
- `details`      text, human-readable explanation of why it was flagged
- `timestamp`    timestamptz, when the flagged event occurred (matches log timestamp)
- `created_at`   timestamptz, when the alert was created

## Indexes
- `logs_ip_idx`          on logs(ip)         — speeds high-risk-IP and brute-force queries
- `logs_timestamp_idx`   on logs(timestamp)  — speeds timeline analytics
- `alerts_ip_idx`        on alerts(ip)       — speeds high-risk-IP aggregation
- `alerts_severity_idx`  on alerts(severity) — speeds severity filtering
- `alerts_threat_type_idx` on alerts(threat_type) — speeds threat-type filtering

## Security (RLS)
Single-tenant application with NO sign-in screen, so policies are scoped to
`TO anon, authenticated` with `USING (true)` because the data is intentionally
shared/public within the tool. Full CRUD enabled on both tables.
*/

CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT '',
  path text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  source_format text NOT NULL DEFAULT 'nginx',
  raw_line text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS logs_ip_idx ON logs (ip);
CREATE INDEX IF NOT EXISTS logs_timestamp_idx ON logs (timestamp);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
  ip text NOT NULL,
  threat_type text NOT NULL,
  severity text NOT NULL,
  details text NOT NULL DEFAULT '',
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alerts_ip_idx ON alerts (ip);
CREATE INDEX IF NOT EXISTS alerts_severity_idx ON alerts (severity);
CREATE INDEX IF NOT EXISTS alerts_threat_type_idx ON alerts (threat_type);
CREATE INDEX IF NOT EXISTS alerts_log_id_idx ON alerts (log_id);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_logs" ON logs;
CREATE POLICY "anon_select_logs" ON logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_logs" ON logs;
CREATE POLICY "anon_insert_logs" ON logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_logs" ON logs;
CREATE POLICY "anon_update_logs" ON logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_logs" ON logs;
CREATE POLICY "anon_delete_logs" ON logs FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE
  TO anon, authenticated USING (true);
