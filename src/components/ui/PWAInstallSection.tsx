import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  Share,
  PlusSquare,
  Smartphone,
  Laptop,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  ArrowRight,
  X,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useTheme } from '../../context/ThemeContext';

export const PWAInstallSection: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, triggerInstall, deferredPrompt } = usePWAInstall();
  const { isDark } = useTheme();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleDownloadClick = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        const success = await triggerInstall();
        if (!success) {
          setShowGuideModal(true);
        }
      } catch {
        setShowGuideModal(true);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // If browser hasn't fired beforeinstallprompt or requires user interaction/iOS/Firefox
      setShowGuideModal(true);
    }
  };

  return (
    <div
      className={`p-5 sm:p-6 rounded-3xl border transition-all ${
        isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-white shadow-xs'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isInstalled
                ? isDark
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : isDark
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-inner'
                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}
          >
            {isInstalled ? <CheckCircle2 className="w-6 h-6" /> : <Download className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-inherit">LocalLink Mobile / Desktop App</h3>
              {isInstalled ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Installed
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PWA Ready
                </span>
              )}
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'} leading-relaxed`}>
              {isInstalled
                ? 'LocalLink is running as an installed standalone app without browser URL bars.'
                : 'Install / Download LocalLink on your Android phone, Windows PC, Mac, or iPhone for instant zero-lag launch.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {isInstalled ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              <span>LocalLink is installed</span>
            </div>
          ) : (
            <button
              onClick={handleDownloadClick}
              disabled={isInstalling}
              className="flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isInstalling ? 'Installing...' : 'Download / Install LocalLink'}</span>
            </button>
          )}
        </div>
      </div>

      {/* COMPREHENSIVE INSTALLATION ASSISTANT MODAL */}
      {showGuideModal && !isInstalled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Install LocalLink App</h4>
                  <p className="text-[11px] text-neutral-400">Add to your home screen or desktop</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Prompt button if available */}
            {deferredPrompt && (
              <button
                onClick={async () => {
                  await triggerInstall();
                  setShowGuideModal(false);
                }}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Trigger Browser Install Prompt</span>
              </button>
            )}

            {/* Step-by-Step guides by OS */}
            <div className="space-y-3.5 text-xs">
              {/* Android Chrome */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="flex items-center gap-2 font-bold text-emerald-400 mb-2">
                  <Smartphone className="w-4 h-4" />
                  <span>Android (Chrome / Brave / Samsung)</span>
                </div>
                <ol className="space-y-1.5 text-neutral-300 list-decimal list-inside leading-relaxed text-[11px]">
                  <li>
                    Tap the <strong>3-dots menu (⋮)</strong> at the top right of your browser.
                  </li>
                  <li>
                    Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                  </li>
                  <li>Tap <strong>Install</strong> to add LocalLink as a native mobile app.</li>
                </ol>
              </div>

              {/* Windows / Mac Desktop */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="flex items-center gap-2 font-bold text-emerald-400 mb-2">
                  <Laptop className="w-4 h-4" />
                  <span>Computer (Chrome / Edge / Brave)</span>
                </div>
                <ol className="space-y-1.5 text-neutral-300 list-decimal list-inside leading-relaxed text-[11px]">
                  <li>
                    Look at the right side of the URL/Address bar for the <strong>Install (⊕ or ⬇)</strong> icon.
                  </li>
                  <li>
                    Or click browser menu <strong>(⋮) $\to$ &quot;Install LocalLink&quot;</strong>.
                  </li>
                  <li>Confirm install to get a standalone desktop window and taskbar shortcut.</li>
                </ol>
              </div>

              {/* iOS Safari */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="flex items-center gap-2 font-bold text-emerald-400 mb-2">
                  <Share className="w-4 h-4" />
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <ol className="space-y-1.5 text-neutral-300 list-decimal list-inside leading-relaxed text-[11px]">
                  <li>
                    Tap the <strong>Share</strong> button <Share className="inline w-3 h-3 mx-0.5 text-blue-400" /> in Safari&apos;s bottom bar.
                  </li>
                  <li>
                    Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.
                  </li>
                  <li>Tap <strong>Add</strong> in the top right corner.</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
