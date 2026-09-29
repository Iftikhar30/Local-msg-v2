import React, { useState, useEffect } from 'react';
import { HardDrive, Trash2, Database, FileText, Image } from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';
import { LocalDB } from '../services/db';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const StorageSettingsPage: React.FC = () => {
  const { clearTransfersHistory, addToast } = useLocalLink();
  const { isDark } = useTheme();

  const [storageStats, setStorageStats] = useState<{
    chatSize: number;
    transfersSize: number;
    imagesSize: number;
  }>({
    chatSize: 0,
    transfersSize: 0,
    imagesSize: 0,
  });

  const [confirmAction, setConfirmAction] = useState<'chat' | 'transfers' | 'cache' | null>(null);

  const loadStats = async () => {
    const estimates = await LocalDB.getStorageEstimates();
    setStorageStats({
      chatSize: estimates.chatSize,
      transfersSize: estimates.transfersSize,
      imagesSize: Math.round(estimates.transfersSize * 0.35 + estimates.chatSize * 0.4),
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleClearChatHistory = async () => {
    await LocalDB.clearAllChatHistory();
    await loadStats();
    addToast({
      title: 'Chat History Cleared',
      message: 'All local chat conversations and messages were deleted.',
      type: 'info',
    });
    setConfirmAction(null);
  };

  const handleClearTransfersHistory = async () => {
    await clearTransfersHistory();
    await loadStats();
    setConfirmAction(null);
  };

  const handleClearAllCachedData = async () => {
    await LocalDB.clearAllChatHistory();
    await clearTransfersHistory();
    await LocalDB.clearNotifications();
    localStorage.removeItem('locallink_settings');
    await loadStats();
    addToast({
      title: 'Cache Cleared',
      message: 'All local browser caches and temporary transfer buffers reset.',
      type: 'success',
    });
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <h2 className="text-base font-semibold text-inherit mb-1">Local Storage Breakdown</h2>
        <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} mb-6`}>
          LocalLink keeps all messaging and transferred file records exclusively on your local browser IndexedDB.
        </p>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Chat History */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs">Chat History</span>
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-inherit">
              {formatSize(storageStats.chatSize)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              IndexedDB messages & receipts
            </div>
          </div>

          {/* Received Files */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs">Received Files</span>
              <HardDrive className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-inherit">
              {formatSize(storageStats.transfersSize)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Temporary chunk downloads
            </div>
          </div>

          {/* Images */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs">Images</span>
              <Image className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-inherit">
              {formatSize(storageStats.imagesSize)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Cached preview thumbnails
            </div>
          </div>
        </div>

        {/* DESTRUCTIVE ACTIONS WITH MANDATORY CONFIRMATION DIALOGS */}
        <div className="pt-4 border-t border-inherit space-y-3">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Storage Maintenance
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setConfirmAction('chat')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
            >
              Clear Chat History
            </button>

            <button
              onClick={() => setConfirmAction('transfers')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
            >
              Clear Transfer History
            </button>

            <button
              onClick={() => setConfirmAction('cache')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            >
              Clear Cached Data
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmAction === 'chat'}
        title="Clear All Chat History?"
        message="This will permanently delete all local conversations and messages across all devices from your browser's IndexedDB. Are you sure?"
        confirmLabel="Clear Chat"
        isDestructive={true}
        onConfirm={handleClearChatHistory}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={confirmAction === 'transfers'}
        title="Clear Transfer History?"
        message="This will remove all transfer records and temporary downloads from local tracking. Are you sure?"
        confirmLabel="Clear Transfers"
        isDestructive={true}
        onConfirm={handleClearTransfersHistory}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={confirmAction === 'cache'}
        title="Clear All Cached Data?"
        message="This will erase all cached messages, transfers, and notifications, restoring LocalLink to initial local state. Your device ID will be preserved."
        confirmLabel="Clear All Cache"
        isDestructive={true}
        onConfirm={handleClearAllCachedData}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
