'use client';

import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileText, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ingestLogContent } from '@/hooks/use-analytics';
import type { IngestResponse } from '@/types/dashboard';

interface LogUploadZoneProps {
  onIngested: () => void;
  className?: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; filename: string }
  | { kind: 'uploading'; filename: string }
  | { kind: 'success'; result: IngestResponse; filename: string }
  | { kind: 'error'; message: string };

const ACCEPTED = '.log,.txt,text/plain';

export function LogUploadZone({ onIngested, className }: LogUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const name = file.name;
      if (!/\.(log|txt)$/i.test(name) && file.type !== 'text/plain') {
        setStatus({ kind: 'error', message: 'Only .log or .txt files are accepted.' });
        return;
      }
      if (file.size > 5_000_000) {
        setStatus({ kind: 'error', message: 'File exceeds the 5MB limit.' });
        return;
      }
      try {
        setStatus({ kind: 'reading', filename: name });
        const content = await file.text();
        setStatus({ kind: 'uploading', filename: name });
        const result = await ingestLogContent(content, name);
        setStatus({ kind: 'success', result, filename: name });
        onIngested();
      } catch (e) {
        setStatus({
          kind: 'error',
          message: e instanceof Error ? e.message : 'Failed to process file.',
        });
      }
    },
    [onIngested]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // reset so the same file can be re-selected
    e.target.value = '';
  };

  const dismiss = () => setStatus({ kind: 'idle' });

  return (
    <div className={cn('w-full', className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={onDrop}
        className={cn(
          'group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200 cursor-pointer outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          dragActive
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : 'border-border bg-card/40 hover:border-primary/60 hover:bg-card/70'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={onInputChange}
          className="hidden"
        />

        <div
          className={cn(
            'mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-all',
            dragActive ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground group-hover:text-primary'
          )}
        >
          <UploadCloud className="h-6 w-6" />
        </div>

        <p className="text-sm font-medium text-foreground">
          {dragActive ? 'Drop your log file to analyze' : 'Drag & drop a log file, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Supports Nginx access logs &amp; <code className="font-mono text-[11px]">/var/log/auth.log</code> · .log / .txt · max 5MB
        </p>

        {(status.kind === 'reading' || status.kind === 'uploading') && (
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>
              {status.kind === 'reading' ? 'Reading ' : 'Analyzing '}
              <span className="font-mono text-foreground">{status.filename}</span>…
            </span>
          </div>
        )}
      </div>

      {status.kind === 'success' && (
        <div className="mt-3 animate-fade-in-up rounded-lg border border-success/30 bg-success/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">
                Analysis complete · <span className="font-mono">{status.filename}</span>
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Processed <span className="font-mono-num text-foreground">{status.result.logsProcessed}</span> log lines · flagged{' '}
                <span className="font-mono-num text-foreground">{status.result.threatsFlagged}</span> threats
                {status.result.highRiskIps && status.result.highRiskIps.length > 0 && (
                  <> · <span className="text-error">{status.result.highRiskIps.length} high-risk IP(s)</span></>
                )}
                {status.result.warning && (
                  <span className="mt-1 block text-warning">Warning: {status.result.warning}</span>
                )}
              </p>
            </div>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {status.kind === 'error' && (
        <div className="mt-3 animate-fade-in-up rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">Upload failed</p>
              <p className="mt-0.5 text-muted-foreground">{status.message}</p>
            </div>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {status.kind === 'idle' && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Try uploading a sample Nginx access log to see attacks detected.
        </p>
      )}
    </div>
  );
}
