'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AnalyticsResponse,
  HighRiskIp,
  IngestResponse,
  LogTableRow,
} from '@/types/dashboard';

export interface AnalyticsFilters {
  search: string;
  severities: string[];
  threatTypes: string[];
  view: 'logs' | 'alerts';
  page: number;
  pageSize: number;
}

export const DEFAULT_FILTERS: AnalyticsFilters = {
  search: '',
  severities: [],
  threatTypes: [],
  view: 'alerts',
  page: 1,
  pageSize: 20,
};

function buildQuery(filters: AnalyticsFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.severities.length) params.set('severity', filters.severities.join(','));
  if (filters.threatTypes.length) params.set('threatType', filters.threatTypes.join(','));
  params.set('view', filters.view);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  return params.toString();
}

export function useAnalytics(filters: AnalyticsFilters) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?${buildQuery(filters)}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const json = (await res.json()) as AnalyticsResponse;
      if (reqId === reqIdRef.current) setData(json);
    } catch (e) {
      if (reqId === reqIdRef.current) setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export async function ingestLogContent(content: string, filename?: string): Promise<IngestResponse> {
  const res = await fetch('/api/logs/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, filename }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 207) {
    throw new Error(body?.error ?? `Ingest failed (${res.status})`);
  }
  return body as IngestResponse;
}

export async function fetchHighRiskIps(): Promise<HighRiskIp[]> {
  const res = await fetch('/api/ips/high-risk', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch high-risk IPs');
  const body = await res.json();
  return body.ips as HighRiskIp[];
}

export async function clearAllData(): Promise<void> {
  const res = await fetch('/api/logs', { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to clear data');
  }
}

export type { LogTableRow };
