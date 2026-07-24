import { TrendingUp } from 'lucide-react';
import type { TimelinePoint } from '../types/dashboard';

export function TimelineChart({ timeline }: { timeline: TimelinePoint[] }) {
  const maxThreats = Math.max(...timeline.map((t) => t.threats), 1);

  if (timeline.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200">Threat Activity Timeline</h2>
        </div>
        <div className="flex h-48 items-center justify-center text-sm text-slate-500">
          No threat activity recorded yet.
        </div>
      </div>
    );
  }

  // Show up to 24 most recent hours
  const points = timeline.slice(-24);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-blue-400" />
        <h2 className="text-sm font-semibold text-slate-200">Threat Activity Timeline</h2>
      </div>

      <div className="flex h-48 items-end gap-1">
        {points.map((point) => {
          const threatH = (point.threats / maxThreats) * 100;
          const critH = (point.criticals / maxThreats) * 100;
          return (
            <div key={point.hour} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-16 z-10 hidden whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs group-hover:block">
                <div className="font-medium text-slate-200">{point.hour}</div>
                <div className="mt-1 text-orange-400">{point.threats} threats</div>
                {point.criticals > 0 && <div className="text-red-400">{point.criticals} critical</div>}
              </div>
              {/* Bar */}
              <div className="relative w-full overflow-hidden rounded-t" style={{ height: `${threatH}%`, minHeight: '2px' }}>
                <div className="absolute bottom-0 w-full bg-orange-500/40" style={{ height: '100%' }} />
                <div className="absolute bottom-0 w-full bg-red-500/60" style={{ height: `${(critH / threatH) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels (show first, middle, last) */}
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{points[0]?.hour ?? ''}</span>
        {points.length > 2 && <span>{points[Math.floor(points.length / 2)]?.hour}</span>}
        <span>{points[points.length - 1]?.hour ?? ''}</span>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-orange-500/40" />
          All Threats
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-red-500/60" />
          Critical
        </div>
      </div>
    </div>
  );
}
