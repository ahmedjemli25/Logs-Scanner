import { useState, useEffect, useCallback } from 'react';
import { Shield, Upload, Activity, Ban, History, Eye } from 'lucide-react';
import type { AlertRow } from './types/database';
import type { DashboardMetrics, ThreatBreakdown, TimelinePoint, IpActivity } from './types/dashboard';
import { fetchMetrics, fetchThreatBreakdown, fetchTimeline, fetchHighRiskIps, uploadLogFile } from './lib/api';
import { generateSampleLog } from './lib/log-parser';
import { MetricsRow } from './components/MetricsRow';
import { ThreatBreakdownPanel } from './components/ThreatBreakdownPanel';
import { TimelineChart } from './components/TimelineChart';
import { AlertsTable } from './components/AlertsTable';
import { InvestigationDrawer } from './components/InvestigationDrawer';
import { HighRiskIpsPanel } from './components/HighRiskIpsPanel';
import { UploadModal } from './components/UploadModal';
import { BlockedIpsView } from './components/BlockedIpsView';
import { RemediationHistoryView } from './components/RemediationHistoryView';

type Tab = 'dashboard' | 'blocked' | 'remediation';

export default function App() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [breakdown, setBreakdown] = useState<ThreatBreakdown | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [highRiskIps, setHighRiskIps] = useState<IpActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ logs: number; alerts: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertRow | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [m, b, t, ips] = await Promise.all([
        fetchMetrics(),
        fetchThreatBreakdown(),
        fetchTimeline(),
        fetchHighRiskIps(),
      ]);
      setMetrics(m);
      setBreakdown(b);
      setTimeline(t);
      setHighRiskIps(ips);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleUpload = async (content: string) => {
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const result = await uploadLogFile(content);
      setUploadResult({ logs: result.logsInserted, alerts: result.alertsCreated });
      await loadDashboard();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSampleLog = () => {
    const sample = generateSampleLog();
    handleUpload(sample);
  };

  const handleAlertAction = async () => {
    await loadDashboard();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 ring-1 ring-blue-500/30">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">VulnTrack</h1>
              <p className="text-xs text-slate-500">Security Log Analysis & Response</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSampleLog}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              Load Sample
            </button>
            <button
              onClick={() => setShowUpload(true)}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Upload Log
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="mx-auto flex max-w-[1600px] gap-1 px-6">
          <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={<Activity className="h-4 w-4" />} label="Dashboard" />
          <TabButton active={tab === 'blocked'} onClick={() => setTab('blocked')} icon={<Ban className="h-4 w-4" />} label="Blocked IPs" badge={metrics?.blockedIps} />
          <TabButton active={tab === 'remediation'} onClick={() => setTab('remediation')} icon={<History className="h-4 w-4" />} label="Remediation" />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {tab === 'dashboard' && (
          loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
            </div>
          ) : (
            <div className="space-y-6">
              <MetricsRow metrics={metrics!} />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ThreatBreakdownPanel breakdown={breakdown!} />
                <TimelineChart timeline={timeline} />
              </div>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                  <AlertsTable onInvestigate={(alert) => setSelectedAlert(alert)} onRefresh={handleAlertAction} />
                </div>
                <HighRiskIpsPanel ips={highRiskIps} onInvestigate={(ip) => {
                  const alert = highRiskIps.find(a => a.ip === ip);
                  if (alert) {
                    // Find an alert for this IP to open investigation
                    setSelectedAlert({ id: '', ip, threat_type: 'SQL Injection', severity: 'Critical', details: '', timestamp: '', created_at: '', log_id: '', status: 'open', notes: '', assigned_to: null });
                  }
                }} />
              </div>
            </div>
          )
        )}

        {tab === 'blocked' && <BlockedIpsView onRefresh={loadDashboard} />}
        {tab === 'remediation' && <RemediationHistoryView />}
      </main>

      {/* Modals & Drawers */}
      <UploadModal
        open={showUpload}
        onClose={() => { setShowUpload(false); setUploadResult(null); setUploadError(null); }}
        onUpload={handleUpload}
        uploading={uploading}
        result={uploadResult}
        error={uploadError}
      />

      {selectedAlert && (
        <InvestigationDrawer
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAction={async () => {
            await handleAlertAction();
          }}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
        active
          ? 'border-blue-500 text-blue-400'
          : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{badge}</span>
      )}
    </button>
  );
}
