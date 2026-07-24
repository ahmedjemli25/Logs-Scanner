import { FileText, AlertTriangle, ShieldAlert, Ban, CheckCircle, Eye } from 'lucide-react';
import type { DashboardMetrics } from '../types/dashboard';

export function MetricsRow({ metrics }: { metrics: DashboardMetrics }) {
  const cards = [
    { label: 'Total Logs', value: metrics.totalLogs, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20' },
    { label: 'Total Alerts', value: metrics.totalAlerts, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', ring: 'ring-orange-500/20' },
    { label: 'Open Alerts', value: metrics.openAlerts, icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/20' },
    { label: 'Investigating', value: metrics.investigatingAlerts, icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20' },
    { label: 'Resolved', value: metrics.resolvedAlerts, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
    { label: 'Critical', value: metrics.criticalAlerts, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/20' },
    { label: 'High-Risk IPs', value: metrics.highRiskIps, icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-500/10', ring: 'ring-orange-500/20' },
    { label: 'Blocked IPs', value: metrics.blockedIps, icon: Ban, color: 'text-slate-400', bg: 'bg-slate-500/10', ring: 'ring-slate-500/20' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-700 animate-slide-in-up"
          >
            <div className={`mb-2 inline-flex rounded-lg ${card.bg} p-2 ring-1 ${card.ring}`}>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold tabular-nums text-slate-100">{card.value.toLocaleString()}</div>
            <div className="mt-0.5 text-xs font-medium text-slate-500">{card.label}</div>
          </div>
        );
      })}
    </div>
  );
}
