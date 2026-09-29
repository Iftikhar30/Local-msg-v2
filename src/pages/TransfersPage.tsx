import React, { useState, useRef } from 'react';
import {
  ArrowLeftRight,
  UploadCloud,
  File,
  FileText,
  FileArchive,
  Image,
  Video,
  Music,
  Download,
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Laptop,
} from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';
import { FileTransfer } from '../types';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const TransfersPage: React.FC = () => {
  const {
    transfers,
    devices,
    sendFile,
    cancelTransfer,
    clearTransfersHistory,
    addToast,
  } = useLocalLink();

  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [targetDeviceId, setTargetDeviceId] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onlinePeers = devices.filter((d) => d.isOnline && !d.isSelf);

  // Set default target device if not selected
  const effectiveTargetId = targetDeviceId || (onlinePeers[0]?.deviceId ?? '');

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!effectiveTargetId) {
      addToast({
        title: 'No Device Selected',
        message: 'Please choose an online LAN device to receive the file.',
        type: 'warning',
      });
      return;
    }

    const peer = devices.find((d) => d.deviceId === effectiveTargetId);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      addToast({
        title: 'Starting Transfer',
        message: `Transferring "${file.name}" to ${peer?.deviceName || 'peer'}...`,
        type: 'info',
      });
      await sendFile(effectiveTargetId, file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bps: number) => {
    if (bps < 1024) return `${bps} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5 text-emerald-400" />;
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5 text-purple-400" />;
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5 text-amber-400" />;
    if (fileType.includes('zip') || fileType.includes('tar') || fileType.includes('compressed'))
      return <FileArchive className="w-5 h-5 text-sky-400" />;
    if (fileType.includes('text') || fileType.includes('pdf'))
      return <FileText className="w-5 h-5 text-blue-400" />;
    return <File className="w-5 h-5 text-neutral-400" />;
  };

  const filteredTransfers = transfers.filter((t) => {
    if (activeTab === 'active') return t.status === 'transferring' || t.status === 'queued';
    if (activeTab === 'completed') return t.status === 'completed';
    if (activeTab === 'failed') return t.status === 'failed' || t.status === 'cancelled';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit">
            File Transfers
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Chunked, high-speed streaming over your local network. Zero cloud storage.
          </p>
        </div>

        {transfers.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* DROPZONE CARD */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-3xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10'
            : isDark
            ? 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
            : 'border-neutral-300 bg-white hover:border-neutral-400'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          multiple
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-800/80 border border-neutral-700/80 flex items-center justify-center text-emerald-400 shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-inherit">
              Drop files here to transfer over LAN
            </h3>
            <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Images, 4K videos, documents, or huge archives. Streamed in binary chunks with automatic speed and ETA calculation.
            </p>
          </div>

          {/* Select Recipient Device */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400">Recipient:</span>
              {onlinePeers.length === 0 ? (
                <span className="text-amber-500 font-medium">No peers online</span>
              ) : (
                <select
                  value={effectiveTargetId}
                  onChange={(e) => setTargetDeviceId(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs outline-none transition-colors ${
                    isDark
                      ? 'bg-neutral-800 border-neutral-700 text-white'
                      : 'bg-neutral-100 border-neutral-300 text-neutral-900'
                  }`}
                >
                  {onlinePeers.map((peer) => (
                    <option key={peer.deviceId} value={peer.deviceId}>
                      {peer.deviceName} ({peer.ip})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={onlinePeers.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors shadow-sm"
            >
              Select Files
            </button>
          </div>
        </div>
      </div>

      {/* FILTER TABS (Clean Segmented Control per frontend-design skill) */}
      <div className="flex items-center justify-between border-b border-inherit pb-3">
        <div className="flex items-center gap-1 p-1 bg-neutral-800/50 rounded-xl border border-neutral-800">
          {(['all', 'active', 'completed', 'failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                activeTab === tab
                  ? 'bg-neutral-700 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="text-xs text-neutral-400 tabular-nums">
          {filteredTransfers.length} {filteredTransfers.length === 1 ? 'transfer' : 'transfers'}
        </div>
      </div>

      {/* TRANSFERS LIST */}
      {filteredTransfers.length === 0 ? (
        <div className={`p-10 text-center rounded-3xl border border-dashed ${
          isDark ? 'bg-neutral-900/30 border-neutral-800' : 'bg-white border-neutral-200'
        }`}>
          <ArrowLeftRight className="w-8 h-8 mx-auto text-neutral-500 mb-2" />
          <h3 className="text-sm font-semibold text-inherit">No transfers yet</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Pick a file above or drag and drop any normal file type to begin.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransfers.map((t) => {
            const percent = t.fileSize > 0
              ? Math.min(100, Math.round((t.bytesTransferred / t.fileSize) * 100))
              : 100;
            const isSending = t.direction === 'sent';

            return (
              <div
                key={t.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                  isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center shrink-0">
                      {getFileIcon(t.fileType)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">
                          {isSending ? 'Sending' : 'Receiving'}
                        </span>
                        <span className="text-neutral-500">·</span>
                        <span className="text-xs text-neutral-400 truncate">
                          {isSending ? `To ${t.deviceName}` : `From ${t.deviceName}`}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-inherit truncate mt-0.5">
                        {t.fileName}
                      </h4>

                      {/* Unboxed metadata: file size, speed, ETA */}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400 font-mono tabular-nums">
                        <span>{formatSize(t.fileSize)}</span>
                        {t.status === 'transferring' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-400 font-semibold">{formatSpeed(t.speedBps)}</span>
                            <span aria-hidden="true">·</span>
                            <span>ETA: {t.etaSeconds}s</span>
                          </>
                        )}
                        {t.status === 'completed' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-400 flex items-center gap-1 font-sans">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Completed
                            </span>
                          </>
                        )}
                        {t.status === 'cancelled' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-neutral-400 font-sans">Cancelled</span>
                          </>
                        )}
                        {t.status === 'failed' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-rose-400 flex items-center gap-1 font-sans">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {t.error || 'Failed'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Cancel, Download */}
                  <div className="flex items-center gap-2 shrink-0">
                    {t.status === 'transferring' && (
                      <button
                        onClick={() => cancelTransfer(t.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
                      >
                        Cancel
                      </button>
                    )}

                    {t.status === 'completed' && t.downloadUrl && (
                      <a
                        href={t.downloadUrl}
                        download={t.fileName}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {t.status === 'transferring' && (
                  <div className="mt-4 space-y-1.5 font-mono tabular-nums text-xs">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>{percent}%</span>
                      <span>
                        {formatSize(t.bytesTransferred)} / {formatSize(t.fileSize)}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-150 ease-out"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Transfer History"
        message="Are you sure you want to clear all file transfer records? Completed files will remain in temporary storage until cleaned by the server."
        confirmLabel="Clear"
        isDestructive={true}
        onConfirm={async () => {
          await clearTransfersHistory();
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
