import type { ParsedLog } from './log-parser';
import type { Severity, ThreatType } from '../types/database';

export interface DetectedThreat {
  threatType: ThreatType;
  severity: Severity;
  details: string;
}

export interface PayloadThreat {
  log: ParsedLog;
  threats: DetectedThreat[];
}

export interface BruteForceHit {
  ip: string;
  threatType: ThreatType;
  severity: Severity;
  details: string;
  triggeringLog: ParsedLog;
}

export interface DetectionResult {
  payloadThreats: PayloadThreat[];
  bruteForce: BruteForceHit[];
}

const SQLI_PATTERNS: RegExp[] = [
  /union\s+select/i,
  /'\s*or\s*'?\d/i,
  /'\s*or\s*'?\w+'\s*=\s*'/i,
  /'\s*and\s*'?\d/i,
  /\bselect\b.*\bfrom\b/i,
  /information_schema/i,
  /\binsert\s+into\b/i,
  /\bdrop\s+table\b/i,
  /\bupdate\s+\w+\s+set\b/i,
  /\bdelete\s+from\b/i,
  /--\s*$/,
  /';.*--/i,
  /\bor\s+1\s*=\s*1/i,
  /\band\s+1\s*=\s*1/i,
  /\bexec(\s|\()/i,
  /\bxp_cmdshell\b/i,
];

const TRAVERSAL_PATTERNS: RegExp[] = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e/i,
  /\.\.%2f/i,
  /\.\.%5c/i,
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\\boot\.ini/i,
  /\\windows\\system32/i,
  /\/proc\/self/i,
];

const XSS_PATTERNS: RegExp[] = [
  /<script/i,
  /<\/script>/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /onclick\s*=/i,
  /onmouseover\s*=/i,
  /javascript:/i,
  /<img[^>]+src\s*=\s*[^>]+onerror/i,
  /<iframe/i,
  /alert\s*\(/i,
  /document\.cookie/i,
  /<svg[^>]+onload/i,
];

const BRUTE_FORCE_WINDOW_SEC = 60;
const BRUTE_FORCE_THRESHOLD = 5;

export function runDetection(logs: ParsedLog[]): DetectionResult {
  const payloadThreats: PayloadThreat[] = [];
  const bruteForce: BruteForceHit[] = [];
  const seenBruteForceIps = new Set<string>();

  for (const log of logs) {
    const threats: DetectedThreat[] = [];
    const target = `${log.path} ${log.userAgent}`;

    const sqliHits = SQLI_PATTERNS.filter((p) => p.test(target));
    if (sqliHits.length > 0) {
      const severity = sqliHits.some((p) => /union\s+select|information_schema|drop\s+table/i.test(p.source)) ? 'Critical' : 'High';
      threats.push({
        threatType: 'SQL Injection',
        severity: severity as Severity,
        details: `SQL injection pattern detected in ${log.method} ${log.path}: matched ${sqliHits.map((p) => `"${p.source}"`).join(', ')}`,
      });
    }

    const traversalHits = TRAVERSAL_PATTERNS.filter((p) => p.test(target));
    if (traversalHits.length > 0) {
      const severity = traversalHits.some((p) => /etc\/passwd|etc\/shadow|boot\.ini|system32/i.test(p.source)) ? 'Critical' : 'High';
      threats.push({
        threatType: 'Path Traversal',
        severity: severity as Severity,
        details: `Path traversal detected in ${log.method} ${log.path}: matched ${traversalHits.map((p) => `"${p.source}"`).join(', ')}`,
      });
    }

    const xssHits = XSS_PATTERNS.filter((p) => p.test(target));
    if (xssHits.length > 0) {
      const severity = xssHits.some((p) => /document\.cookie|<iframe|<script/i.test(p.source)) ? 'Critical' : 'High';
      threats.push({
        threatType: 'XSS',
        severity: severity as Severity,
        details: `XSS pattern detected in ${log.method} ${log.path}: matched ${xssHits.map((p) => `"${p.source}"`).join(', ')}`,
      });
    }

    if (threats.length > 0) {
      payloadThreats.push({ log, threats });
    }
  }

  // Brute force detection — HTTP 401/403 bursts from same IP within window
  const httpFails = logs.filter((l) => l.status === '401' || l.status === '403');
  const byIp = new Map<string, ParsedLog[]>();
  for (const log of httpFails) {
    const arr = byIp.get(log.ip) ?? [];
    arr.push(log);
    byIp.set(log.ip, arr);
  }
  for (const [ip, fails] of byIp) {
    if (fails.length < BRUTE_FORCE_THRESHOLD) continue;
    const sorted = fails.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (let i = 0; i <= sorted.length - BRUTE_FORCE_THRESHOLD; i++) {
      const window = sorted.slice(i, i + BRUTE_FORCE_THRESHOLD);
      const span = (new Date(window[window.length - 1].timestamp).getTime() - new Date(window[0].timestamp).getTime()) / 1000;
      if (span <= BRUTE_FORCE_WINDOW_SEC) {
        if (!seenBruteForceIps.has(ip)) {
          seenBruteForceIps.add(ip);
          bruteForce.push({
            ip,
            threatType: 'Brute Force',
            severity: 'Critical',
            details: `${fails.length} failed authentication attempts from ${ip} within ${BRUTE_FORCE_WINDOW_SEC}s window (HTTP 401/403 burst)`,
            triggeringLog: sorted[0],
          });
        }
        break;
      }
    }
  }

  // SSH brute force from auth.log
  const sshFails = logs.filter((l) => l.sourceFormat === 'auth' && l.status === '401');
  const sshByIp = new Map<string, ParsedLog[]>();
  for (const log of sshFails) {
    const arr = sshByIp.get(log.ip) ?? [];
    arr.push(log);
    sshByIp.set(log.ip, arr);
  }
  for (const [ip, fails] of sshByIp) {
    if (fails.length < BRUTE_FORCE_THRESHOLD) continue;
    if (!seenBruteForceIps.has(ip)) {
      seenBruteForceIps.add(ip);
      bruteForce.push({
        ip,
        threatType: 'Brute Force',
        severity: 'Critical',
        details: `${fails.length} failed SSH login attempts from ${ip} (auth.log brute force)`,
        triggeringLog: fails[0],
      });
    }
  }

  return { payloadThreats, bruteForce };
}
