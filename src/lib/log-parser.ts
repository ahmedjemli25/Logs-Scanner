export interface ParsedLog {
  ip: string;
  timestamp: string;
  method: string;
  path: string;
  status: string;
  userAgent: string;
  sourceFormat: string;
  rawLine: string;
}

// Nginx combined log: IP - - [timestamp] "METHOD /path HTTP/1.1" status size "referrer" "UA"
const NGINX_RE = /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"([^"]*)"\s+(\d{3})\s+\S+\s+"[^"]*"\s+"([^"]*)"/;

// Apache common log: IP - - [timestamp] "METHOD /path HTTP/1.1" status size
const APACHE_RE = /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"([^"]*)"\s+(\d{3})/;

// auth.log: Mon DD HH:MM:SS host sshd[pid]: Failed/Accepted password for [invalid] user X from IP port
const AUTH_RE = /^(\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+\S+\s+sshd\[\d+\]:\s+(Failed|Accepted)\s+password\s+for\s+(?:invalid\s+)?(\S+)\s+from\s+(\S+)\s+port\s+\d+/;

// Generic log with IP and timestamp: IP [timestamp] ...
const GENERIC_RE = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+.*?\[([^\]]+)\]/;

export function parseLogContent(content: string): ParsedLog[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  const parsed: ParsedLog[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let result = parseNginx(trimmed)
      ?? parseApache(trimmed)
      ?? parseAuthLog(trimmed)
      ?? parseGeneric(trimmed);

    if (result) parsed.push(result);
  }

  return parsed;
}

function parseNginx(line: string): ParsedLog | null {
  const m = line.match(NGINX_RE);
  if (!m) return null;
  const [, ip, ts, request, status, ua] = m;
  const [method, path] = parseRequest(request);
  return {
    ip, timestamp: parseNginxDate(ts), method, path,
    status, userAgent: ua, sourceFormat: 'nginx', rawLine: line,
  };
}

function parseApache(line: string): ParsedLog | null {
  const m = line.match(APACHE_RE);
  if (!m) return null;
  const [, ip, ts, request, status] = m;
  const [method, path] = parseRequest(request);
  return {
    ip, timestamp: parseNginxDate(ts), method, path,
    status, userAgent: '', sourceFormat: 'apache', rawLine: line,
  };
}

function parseAuthLog(line: string): ParsedLog | null {
  const m = line.match(AUTH_RE);
  if (!m) return null;
  const [, ts, outcome, user, ip] = m;
  return {
    ip, timestamp: parseAuthDate(ts), method: 'SSH',
    path: `/ssh/${outcome.toLowerCase()}`, status: outcome === 'Failed' ? '401' : '200',
    userAgent: `sshd user=${user}`, sourceFormat: 'auth', rawLine: line,
  };
}

function parseGeneric(line: string): ParsedLog | null {
  const m = line.match(GENERIC_RE);
  if (!m) return null;
  const [, ip, ts] = m;
  return {
    ip, timestamp: parseNginxDate(ts) || new Date().toISOString(),
    method: 'GET', path: line.slice(0, 200), status: '200',
    userAgent: '', sourceFormat: 'generic', rawLine: line,
  };
}

function parseRequest(request: string): [string, string] {
  const parts = request.split(' ');
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' ').replace(/ HTTP\/[\d.]+$/, '')];
  return ['GET', request];
}

function parseNginxDate(raw: string): string {
  // 10/Oct/2024:13:55:36 +0000
  const m = raw.match(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s+([+-]\d{4})/);
  if (!m) return new Date().toISOString();
  const [, dd, mon, yyyy, hh, mm, ss, tz] = m;
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const month = months[mon] ?? 0;
  const tzSign = tz[0];
  const tzH = parseInt(tz.slice(1, 3), 10);
  const tzM = parseInt(tz.slice(3, 5), 10);
  const tzOffset = (tzSign === '+' ? 1 : -1) * (tzH * 60 + tzM);
  const d = new Date(Date.UTC(parseInt(yyyy), month, parseInt(dd), parseInt(hh), parseInt(mm), parseInt(ss)));
  d.setMinutes(d.getMinutes() - tzOffset);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function parseAuthDate(raw: string): string {
  // Oct 10 13:55:36
  const parts = raw.split(/\s+/);
  if (parts.length < 3) return new Date().toISOString();
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const month = months[parts[0]] ?? 0;
  const day = parseInt(parts[1], 10);
  const [hh, mm, ss] = parts[2].split(':').map((n) => parseInt(n, 10));
  const year = new Date().getFullYear();
  const d = new Date(Date.UTC(year, month, day, hh, mm, ss));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function generateSampleLog(): string {
  function ts(offsetSec: number): string {
    const [h, m, s] = [13, 55, 36];
    const total = h * 3600 + m * 60 + s + offsetSec;
    const hh = String(Math.floor(total / 3600) % 24).padStart(2, '0');
    const mm = String(Math.floor(total / 60) % 60).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `10/Oct/2024:${hh}:${mm}:${ss} +0000`;
  }
  function nginx(ip: string, time: string, method: string, path: string, status: number, ua: string): string {
    const size = 512 + Math.floor(Math.random() * 200);
    return `${ip} - - [${time}] "${method} ${path} HTTP/1.1" ${status} ${size} "https://example.com/" "${ua}"`;
  }
  function auth(time: string, ip: string, outcome: 'fail' | 'ok', user: string): string {
    const [hh, mm, ss] = time.split(' ')[0].split(':');
    const pid = 1000 + Math.floor(Math.random() * 8000);
    const msg = outcome === 'fail'
      ? `Failed password for invalid user ${user} from ${ip} port 51042 ssh2`
      : `Accepted password for ${user} from ${ip} port 51042 ssh2`;
    return `Oct 10 ${hh}:${mm}:${ss} web01 sshd[${pid}]: ${msg}`;
  }

  const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
  const sqlmap = 'sqlmap/1.7.11#stable (http://sqlmap.org)';
  const lines: string[] = [];

  lines.push(nginx('203.0.113.10', ts(0), 'GET', '/', 200, ua));
  lines.push(nginx('203.0.113.10', ts(1), 'GET', '/about', 200, ua));
  lines.push(nginx('198.51.100.22', ts(2), 'GET', '/api/products?page=1', 200, ua));
  lines.push(nginx('45.10.0.5', ts(3), 'GET', "/search?q=1' UNION SELECT * FROM users--", 200, sqlmap));
  lines.push(nginx('45.10.0.5', ts(4), 'GET', "/login?u=admin' OR '1'='1", 200, sqlmap));
  lines.push(nginx('45.10.0.5', ts(5), 'GET', '/products?id=5 AND 1=1', 200, sqlmap));
  lines.push(nginx('45.10.0.5', ts(6), 'GET', '/admin?id=1 UNION SELECT username,password FROM INFORMATION_SCHEMA.TABLES', 500, sqlmap));
  lines.push(nginx('45.10.0.5', ts(7), 'GET', '/view?file=../../../../etc/passwd', 403, sqlmap));
  lines.push(nginx('45.10.0.5', ts(8), 'GET', '/download?p=..%2f..%2f..%2fetc%2fshadow', 403, sqlmap));
  lines.push(nginx('45.10.0.5', ts(9), 'GET', '/static?path=c:\\boot.ini', 404, sqlmap));
  lines.push(nginx('45.10.0.5', ts(10), 'GET', '/comment?msg=<script>alert(1)</script>', 200, ua));
  lines.push(nginx('45.10.0.5', ts(11), 'GET', '/profile?name=<img src=x onerror=alert(document.cookie)>', 200, ua));
  lines.push(nginx('45.10.0.5', ts(12), 'GET', "/redirect?u=javascript:alert('xss')", 200, ua));
  for (let i = 0; i < 12; i++) {
    lines.push(nginx('192.168.1.50', ts(20 + i * 3), 'POST', '/admin/login', 401, 'Hydra/9.0'));
  }
  for (let i = 0; i < 12; i++) {
    lines.push(auth(ts(30 + i * 4), '192.168.1.99', 'fail', `root${i}`));
  }
  lines.push(auth(ts(78), '192.168.1.99', 'ok', 'root'));
  lines.push(nginx('198.51.100.22', ts(80), 'GET', '/api/products?page=2', 200, ua));
  lines.push(nginx('203.0.113.10', ts(81), 'GET', '/contact', 200, ua));

  return lines.join('\n') + '\n';
}
