import type { SourceFormat } from '@/types/database';

// Shape of a single normalized log entry produced by the parser.
export interface ParsedLog {
  ip: string;
  timestamp: string; // ISO 8601
  method: string;
  path: string;
  status: string;
  userAgent: string;
  sourceFormat: SourceFormat;
  rawLine: string;
}

// Nginx combined access log:
// 192.168.1.1 - - [10/Oct/2024:13:55:36 +0000] "GET /search?q=1 UNION SELECT HTTP/1.1" 401 612 "https://ref" "Mozilla/5.0 ..."
// The path group captures everything between the method and the trailing
// HTTP/x.y token, so space-bearing SQLi / XSS payloads are preserved.
const NGINX_LOG_RE =
  /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"([A-Z]+)\s+(.*?)\s+HTTP\/[\d.]+"\s+(\d{3})\s+\S+(?:\s+"[^"]*"\s+"([^"]*)")?/;

// SSH / auth.log:
// Oct 10 13:55:36 host sshd[1234]: Failed password for invalid user admin from 192.168.1.50 port 51042 ssh2
const AUTH_LOG_RE =
  /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+\S+\s+(?:sshd|sudo|PAM|pam|authentication failure)[^\n]*$/;
const AUTH_IP_RE = /(?:from|from\s+IP)?\s+(\d{1,3}(?:\.\d{1,3}){3})/;
const AUTH_FAILED_RE = /(Failed password|authentication failure|Failed publickey|Invalid user|Failed none|preauth)/i;
const AUTH_ACCEPTED_RE = /Accepted (password|publickey|keyboard-interactive)/i;

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// "10/Oct/2024:13:55:36 +0000" -> ISO string
function parseNginxDate(raw: string): string {
  // raw like "10/Oct/2024:13:55:36 +0000"
  const m = raw.match(
    /^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{4})?$/
  );
  if (!m) return new Date().toISOString();
  const [, day, mon, year, hh, mm, ss, tz] = m;
  const month = MONTHS[mon] ?? 0;
  // Build an ISO-ish string, then let Date parse it.
  const offset = tz
    ? `${tz.slice(0, 3)}:${tz.slice(3)}`
    : 'Z';
  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${day}T${hh}:${mm}:${ss}${offset}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// "Oct 10 13:55:36" (no year) -> ISO string for current year
function parseAuthDate(raw: string): string {
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 3) return new Date().toISOString();
  const mon = parts[0];
  const day = parseInt(parts[1], 10);
  const time = parts[2];
  const [hh, mm, ss] = time.split(':').map((n) => parseInt(n, 10));
  const year = new Date().getFullYear();
  const month = MONTHS[mon] ?? 0;
  const d = new Date(Date.UTC(year, month, day, hh, mm, ss));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function detectFormat(line: string): SourceFormat | null {
  if (NGINX_LOG_RE.test(line)) return 'nginx';
  if (AUTH_LOG_RE.test(line)) return 'auth';
  // Looser fallback: auth.log lines that mention sshd but didn't match above.
  if (/\bsshd\b|\bsudo\b|\b(?:authentication failure)\b/i.test(line) && /\bfrom\b/i.test(line)) {
    return 'auth';
  }
  return null;
}

// Parse a single raw log line into a normalized ParsedLog, or null if it
// doesn't match a known format.
export function parseLogLine(line: string): ParsedLog | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const format = detectFormat(trimmed);
  if (!format) return null;

  if (format === 'nginx') {
    const m = trimmed.match(NGINX_LOG_RE);
    if (!m) return null;
    const [, ip, ts, method, path, status, ua = ''] = m;
    return {
      ip,
      timestamp: parseNginxDate(ts),
      method,
      path,
      status,
      userAgent: ua,
      sourceFormat: 'nginx',
      rawLine: trimmed,
    };
  }

  // auth.log
  const tsMatch = trimmed.match(/^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/);
  const ipMatch = trimmed.match(AUTH_IP_RE);
  const failed = trimmed.match(AUTH_FAILED_RE);
  const accepted = trimmed.match(AUTH_ACCEPTED_RE);
  return {
    ip: ipMatch ? ipMatch[1] : '0.0.0.0',
    timestamp: tsMatch ? parseAuthDate(tsMatch[1]) : new Date().toISOString(),
    method: 'SSH',
    path: accepted ? 'session accepted' : failed ? 'failed login' : 'auth event',
    status: accepted ? 'Accepted' : failed ? 'Failed' : 'Other',
    userAgent: '',
    sourceFormat: 'auth',
    rawLine: trimmed,
  };
}

// Parse an entire log file's text content into normalized entries.
// Lines that don't match any known format are skipped.
export function parseLogContent(content: string): ParsedLog[] {
  const out: ParsedLog[] = [];
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseLogLine(line);
    if (parsed) out.push(parsed);
  }
  return out;
}
