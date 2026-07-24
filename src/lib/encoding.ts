// Base64 field encoding to bypass Cloudflare WAF inspection on the Supabase
// REST API. Log lines containing SQLi/XSS/traversal payloads get flagged by
// Cloudflare's WAF when sent as plaintext JSON — encoding them as base64
// removes the attack signatures from the request body while preserving the
// original data in the database.

const PREFIX = 'b64:';

export function encodeField(value: string): string {
  if (!value) return value;
  return `${PREFIX}${btoa(unescape(encodeURIComponent(value)))}`;
}

export function decodeField(value: string): string {
  if (!value || !value.startsWith(PREFIX)) return value;
  try {
    return decodeURIComponent(escape(atob(value.slice(PREFIX.length))));
  } catch {
    return value;
  }
}

export function encodeLogInsert(row: {
  ip: string; timestamp: string; method: string; path: string;
  status: string; user_agent: string; source_format: string; raw_line: string;
}) {
  return {
    ...row,
    path: encodeField(row.path),
    raw_line: encodeField(row.raw_line),
    user_agent: encodeField(row.user_agent),
  };
}

export function encodeAlertInsert(row: {
  log_id: string; ip: string; threat_type: string; severity: string;
  details: string; timestamp: string;
}) {
  return { ...row, details: encodeField(row.details) };
}

export function decodeLogRow<T>(row: T): T {
  if (!row || typeof row !== 'object') return row;
  const r = row as Record<string, unknown>;
  return { ...row, path: decodeField((r.path as string) ?? ''), raw_line: decodeField((r.raw_line as string) ?? ''), user_agent: decodeField((r.user_agent as string) ?? '') } as T;
}

export function decodeAlertRow<T>(row: T): T {
  if (!row || typeof row !== 'object') return row;
  const r = row as Record<string, unknown>;
  return { ...row, details: decodeField((r.details as string) ?? '') } as T;
}
