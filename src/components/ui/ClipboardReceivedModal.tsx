import React, { useState } from 'react';
import { Clipboard, Check, X } from 'lucide-react';
import { useLocalLink } from '../../context/LocalLinkContext';

export const ClipboardReceivedModal: React.FC = () => {
  const { receivedClipboard, clearReceivedClipboard, addToast } = useLocalLink();
  const [copied, setCopied] = useState(false);

  if (!receivedClipboard) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(receivedClipboard.text);
      setCopied(true);
      addToast({
        title: 'Copied to Clipboard',
        message: 'Text copied to your system clipboard.',
        type: 'success',
      });
      setTimeout(() => {
        clearReceivedClipboard();
      }, 1200);
    } catch {
      addToast({
        title: 'Copy Failed',
        message: 'Please manually select and copy the text.',
        type: 'error',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100 animate-in zoom-in-95 duration-150">
        <button
          onClick={clearReceivedClipboard}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clipboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">Received Clipboard Snippet</h3>
            <p className="text-xs text-neutral-400">
              Shared by <span className="text-neutral-200 font-medium">{receivedClipboard.senderName}</span>
            </p>
          </div>
        </div>

        <div className="mt-3 p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 font-mono max-h-48 overflow-y-auto break-all select-all">
          {receivedClipboard.text}
        </div>

        <p className="mt-2 text-[11px] text-neutral-400">
          LocalLink never overwrites your clipboard automatically. Click below to copy.
        </p>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={clearReceivedClipboard}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700/80 rounded-xl transition-colors"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors shadow-sm"
          >
            {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
};
