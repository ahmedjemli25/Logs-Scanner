/*
# Add blocked IPs, remediation actions, and alert status tracking

## Purpose
Upgrades VulnTrack from a read-only dashboard to an actionable security
console. Analysts can now investigate threats, block IPs, log remediation
actions, and track the resolution status of each alert.

## New Tables

### blocked_ips
- Stores IP addresses that have been manually blocked by an analyst.
- `id` (uuid, PK)
- `ip` (text, unique — one entry per IP)
- `reason` (text — why the IP was blocked)
- `blocked_by` (text — analyst identifier or "system")
- `blocked_at` (timestamptz — when the block was applied)
- `created_at` (timestamptz)

### remediation_actions
- Audit log of every remediation action taken on an alert or IP.
- `id` (uuid, PK)
- `alert_id` (uuid, FK to alerts.id, nullable — action may target an IP directly)
- `ip` (text — the IP the action targets)
- `action_type` (text — "block_ip", "security_update", "vulnerability_fix", "false_positive", "monitor")
- `description` (text — what was done)
- `performed_by` (text — analyst identifier)
- `performed_at` (timestamptz)
- `created_at` (timestamptz)

## Modified Tables

### alerts
- Added `status` column (text, default 'open') — tracks alert lifecycle:
  open → investigating → resolved / false_positive
- Added `notes` column (text, default '') — analyst investigation notes
- Added `assigned_to` column (text, nullable) — analyst working the alert

## Security
- RLS enabled on all new tables with anon+authenticated access (single-tenant app, no sign-in).
- Existing alert policies already allow UPDATE, so the new columns are writable.
*/

-- Block IP addresses
CREATE TABLE IF NOT EXISTS blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text UNIQUE NOT NULL,
  reason text NOT NULL DEFAULT '',
  blocked_by text NOT NULL DEFAULT 'analyst',
  blocked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_blocked_ips" ON blocked_ips;
CREATE POLICY "anon_select_blocked_ips" ON blocked_ips FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_blocked_ips" ON blocked_ips;
CREATE POLICY "anon_insert_blocked_ips" ON blocked_ips FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_blocked_ips" ON blocked_ips;
CREATE POLICY "anon_update_blocked_ips" ON blocked_ips FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_blocked_ips" ON blocked_ips;
CREATE POLICY "anon_delete_blocked_ips" ON blocked_ips FOR DELETE
  TO anon, authenticated USING (true);

-- Remediation action audit log
CREATE TABLE IF NOT EXISTS remediation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES alerts(id) ON DELETE SET NULL,
  ip text NOT NULL DEFAULT '',
  action_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  performed_by text NOT NULL DEFAULT 'analyst',
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE remediation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_remediation" ON remediation_actions;
CREATE POLICY "anon_select_remediation" ON remediation_actions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_remediation" ON remediation_actions;
CREATE POLICY "anon_insert_remediation" ON remediation_actions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_remediation" ON remediation_actions;
CREATE POLICY "anon_update_remediation" ON remediation_actions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_remediation" ON remediation_actions;
CREATE POLICY "anon_delete_remediation" ON remediation_actions FOR DELETE
  TO anon, authenticated USING (true);

-- Add status / notes / assigned_to to alerts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'status') THEN
    ALTER TABLE alerts ADD COLUMN status text NOT NULL DEFAULT 'open';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'notes') THEN
    ALTER TABLE alerts ADD COLUMN notes text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'assigned_to') THEN
    ALTER TABLE alerts ADD COLUMN assigned_to text;
  END IF;
END $$;

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip);
CREATE INDEX IF NOT EXISTS idx_remediation_ip ON remediation_actions(ip);
CREATE INDEX IF NOT EXISTS idx_remediation_alert_id ON remediation_actions(alert_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
