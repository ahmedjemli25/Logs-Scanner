import type { ParsedLog } from './log-parser';
import type { Severity, ThreatType } from '@/types/database';

// A single detected threat tied to a specific parsed log line.
export interface DetectedThreat {
  threatType: ThreatType;
  severity: Severity;
  details: string;
}

// ---- Pattern definitions -------------------------------------------------
// Each pattern is case-insensitive. Signatures are tuned to catch the classic
// attack payloads called out in the spec while avoiding ordinary traffic.

interface Pattern {
  type: ThreatType;
  severity: Severity;
  regex: RegExp;
  detail: string;
}

const SQLI_PATTERNS: Pattern[] = [
  {
    type: 'SQL Injection',
    severity: 'High',
    regex: /\bunion\s+(all\s+)?select\b/i,
    detail: 'UNION SELECT clause detected in request — classic SQLi payload.',
  },
  {
    type: 'SQL Injection',
    severity: 'High',
    regex: /\bor\s+1\s*=\s*1\b/i,
    detail: 'Boolean-based SQLi tautology "OR 1=1" detected.',
  },
  {
    type: 'SQL Injection',
    severity: 'High',
    regex: /\band\s+1\s*=\s*1\b/i,
    detail: 'Boolean-based SQLi tautology "AND 1=1" detected.',
  },
  {
    type: 'SQL Injection',
    severity: 'Critical',
    regex: /information_schema/i,
    detail: 'Attempt to enumerate INFORMATION_SCHEMA — metadata extraction.',
  },
  {
    type: 'SQL Injection',
    severity: 'Critical',
    regex: /'\s*(or|and)\s+/i,
    detail: 'Quote-prefixed boolean logic — SQLi authentication bypass.',
  },
  {
    type: 'SQL Injection',
    severity: 'High',
    regex: /\b(?:select|insert|update|delete|drop|alter)\b[^a-z].*\bfrom\b/i,
    detail: 'Embedded SQL statement keyword sequence detected.',
  },
  {
    type: 'SQL Injection',
    severity: 'Medium',
    regex: /\b(?:sleep|benchmark|pg_sleep)\s*\(/i,
    detail: 'Time-based blind SQLi function call detected.',
  },
  {
    type: 'SQL Injection',
    severity: 'Medium',
    regex: /--\s|\/\*.*\*\/|#.*$/i,
    detail: 'SQL comment syntax detected inside the request.',
  },
];

const PATH_TRAVERSAL_PATTERNS: Pattern[] = [
  {
    type: 'Path Traversal',
    severity: 'High',
    regex: /\.\.\//,
    detail: 'Relative path traversal sequence "../" detected.',
  },
  {
    type: 'Path Traversal',
    severity: 'High',
    regex: /\.\.\\/,
    detail: 'Relative path traversal sequence "..\\" detected.',
  },
  {
    type: 'Path Traversal',
    severity: 'Critical',
    regex: /\/etc\/passwd/i,
    detail: 'Attempt to read "/etc/passwd" — Unix password file access.',
  },
  {
    type: 'Path Traversal',
    severity: 'Critical',
    regex: /c:\\boot\.ini/i,
    detail: 'Attempt to read "c:\\boot.ini" — Windows system file access.',
  },
  {
    type: 'Path Traversal',
    severity: 'Critical',
    regex: /\/etc\/shadow/i,
    detail: 'Attempt to read "/etc/shadow" — Unix shadow file access.',
  },
  {
    type: 'Path Traversal',
    severity: 'High',
    regex: /%2e%2e%2f|%2e%2e\/|\.\.%2f/i,
    detail: 'URL-encoded path traversal sequence detected.',
  },
  {
    type: 'Path Traversal',
    severity: 'Medium',
    regex: /\/(proc|sys|var\/log)\//i,
    detail: 'Access to sensitive system directory detected.',
  },
];

const XSS_PATTERNS: Pattern[] = [
  {
    type: 'XSS',
    severity: 'High',
    regex: /<script[\s>]/i,
    detail: 'Inline <script> tag injection attempt.',
  },
  {
    type: 'XSS',
    severity: 'High',
    regex: /<\/script>/i,
    detail: 'Closing </script> tag detected — script injection.',
  },
  {
    type: 'XSS',
    severity: 'High',
    regex: /\bonerror\s*=/i,
    detail: 'onerror event handler injection attempt.',
  },
  {
    type: 'XSS',
    severity: 'High',
    regex: /\bonload\s*=/i,
    detail: 'onload event handler injection attempt.',
  },
  {
    type: 'XSS',
    severity: 'High',
    regex: /javascript:/i,
    detail: 'javascript: URI scheme detected — script execution vector.',
  },
  {
    type: 'XSS',
    severity: 'Medium',
    regex: /\bon(?:click|mouseover|focus|mouseout|submit)\s*=/i,
    detail: 'Inline DOM event handler injection detected.',
  },
  {
    type: 'XSS',
    severity: 'Critical',
    regex: /<img[^>]+src\s*=\s*["']?\s*javascript:/i,
    detail: 'Image-tag javascript: payload — reflected XSS.',
  },
  {
    type: 'XSS',
    severity: 'Medium',
    regex: /<iframe[\s>]/i,
    detail: 'Inline <iframe> injection attempt.',
  },
  {
    type: 'XSS',
    severity: 'Medium',
    regex: /alert\s*\(|prompt\s*\(|confirm\s*\(/i,
    detail: 'JavaScript dialog function call — XSS proof-of-concept.',
  },
];

const ALL_PAYLOAD_PATTERNS = [
  ...SQLI_PATTERNS,
  ...PATH_TRAVERSAL_PATTERNS,
  ...XSS_PATTERNS,
];

// Inspect a single parsed log line for SQLi / Path Traversal / XSS payloads.
// Returns one DetectedThreat per matched pattern (a single request may trip
// several, e.g. a UNION SELECT inside a path-traversal URL).
export function detectPayloadThreats(log: ParsedLog): DetectedThreat[] {
  const haystack = `${log.path} ${log.userAgent}`;
  const found: DetectedThreat[] = [];
  for (const p of ALL_PAYLOAD_PATTERNS) {
    if (p.regex.test(haystack)) {
      found.push({
        threatType: p.type,
        severity: p.severity,
        details: p.detail,
      });
    }
  }
  return found;
}

// ---- Brute-force detection ----------------------------------------------
// Any single IP exceeding 10 failed login / authorization attempts
// (HTTP 401/403 from nginx, or SSH "Failed" from auth.log) within a
// 60-second sliding window flags the IP for brute-force activity.

export const BRUTE_FORCE_THRESHOLD = 10;
export const BRUTE_FORCE_WINDOW_MS = 60_000;

export interface BruteForceHit {
  ip: string;
  threatType: 'Brute Force';
  severity: Severity;
  details: string;
  triggeringLog: ParsedLog;
}

// A log line counts as a failed authorization attempt if it's an HTTP 401/403
// response from nginx, or a failed SSH login from auth.log.
export function isFailedAuth(log: ParsedLog): boolean {
  if (log.sourceFormat === 'nginx') {
    return log.status === '401' || log.status === '403';
  }
  if (log.sourceFormat === 'auth') {
    return /failed|invalid|authentication failure|preauth/i.test(log.status);
  }
  return false;
}

// Group parsed logs by IP and scan each group for a 60-second window with
// more than BRUTE_FORCE_THRESHOLD failed auth attempts. Returns one BruteForceHit
// per offending IP (anchored on the log that pushed it over the threshold).
export function detectBruteForce(logs: ParsedLog[]): BruteForceHit[] {
  const byIp = new Map<string, ParsedLog[]>();
  for (const log of logs) {
    if (!isFailedAuth(log)) continue;
    const arr = byIp.get(log.ip) ?? [];
    arr.push(log);
    byIp.set(log.ip, arr);
  }

  const hits: BruteForceHit[] = [];

  for (const [ip, attempts] of Array.from(byIp.entries())) {
    // Sort by timestamp ascending.
    attempts.sort((a: ParsedLog, b: ParsedLog) => a.timestamp.localeCompare(b.timestamp));

    // Sliding window: for each attempt, count how many attempts (including it)
    // fall within the prior 60 seconds.
    let flagged = false;
    for (let i = 0; i < attempts.length; i++) {
      const t = Date.parse(attempts[i].timestamp);
      let count = 1;
      for (let j = i - 1; j >= 0; j--) {
        if (t - Date.parse(attempts[j].timestamp) <= BRUTE_FORCE_WINDOW_MS) {
          count++;
        } else {
          break; // sorted, so no earlier entries qualify
        }
      }
      if (count > BRUTE_FORCE_THRESHOLD) {
        hits.push({
          ip,
          threatType: 'Brute Force',
          severity: 'Critical',
          details: `IP ${ip} made ${count} failed login attempts within 60 seconds.`,
          triggeringLog: attempts[i],
        });
        flagged = true;
        break;
      }
    }
    if (!flagged && attempts.length > BRUTE_FORCE_THRESHOLD) {
      // Fallback: if total failures are high but spread out, still surface a
      // lower-confidence brute-force note.
      hits.push({
        ip,
        threatType: 'Brute Force',
        severity: 'High',
        details: `IP ${ip} made ${attempts.length} failed login attempts (sustained).`,
        triggeringLog: attempts[attempts.length - 1],
      });
    }
  }

  return hits;
}

// ---- Full detection pass -------------------------------------------------
// Run payload detection across every parsed log line and brute-force detection
// across the whole batch. The caller (API route) is responsible for persisting
// logs first, then linking each DetectedThreat / BruteForceHit to a stored log id.

export interface DetectionResult {
  payloadThreats: { log: ParsedLog; threats: DetectedThreat[] }[];
  bruteForce: BruteForceHit[];
}

export function runDetection(logs: ParsedLog[]): DetectionResult {
  const payloadThreats: { log: ParsedLog; threats: DetectedThreat[] }[] = [];
  for (const log of logs) {
    const threats = detectPayloadThreats(log);
    if (threats.length) payloadThreats.push({ log, threats });
  }
  return { payloadThreats, bruteForce: detectBruteForce(logs) };
}
