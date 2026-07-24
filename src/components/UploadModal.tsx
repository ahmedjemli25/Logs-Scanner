import { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { generateSampleLog } from '../lib/log-parser';

interface Props {
  open: boolean;
  onClose: () => void;
  onUpload: (content: string) => void;
  uploading: boolean;
  result: { logs: number; alerts: number } | null;
  error: string | null;
}

export function UploadModal({ open, onClose, onUpload, uploading, result, error }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFileContent(reader.result as string);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = () => {
    if (fileContent) onUpload(fileContent);
  };

  const handleSample = () => {
    onUpload(generateSampleLog());
  };

  const handleClose = () => {
    setFileName('');
    setFileContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={handleClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-scale-in">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">Upload Log File</h2>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <CheckCircle className="mx-auto mb-2 h-10 w-10 text-emerald-400" />
            <p className="text-sm font-medium text-emerald-400">Upload Successful</p>
            <p className="mt-1 text-xs text-slate-400">
              {result.logs} log lines stored · {result.alerts} threats detected
            </p>
            <button
              onClick={handleClose}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
                dragOver
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".log,.txt,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {fileName ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
                  <FileText className="h-5 w-5 text-blue-400" />
                  {fileName}
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-2 h-8 w-8 text-slate-500" />
                  <p className="text-sm text-slate-400">
                    Drag & drop a log file here, or <span className="text-blue-400">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Supports Nginx, Apache, and auth.log formats</p>
                </>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={!fileContent || uploading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Analyzing...' : 'Upload & Analyze'}
              </button>
              <button
                onClick={handleSample}
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
              >
                <Eye className="h-4 w-4" />
                Try Sample
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
