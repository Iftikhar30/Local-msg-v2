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
  Info
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useTheme } from '../../context/ThemeContext';

export const PWAInstallSection: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, triggerInstall } = usePWAInstall();
  const { isDark } = useTheme();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await triggerInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div
      className={`p-5 rounded-2xl border transition-all ${
        isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-white shadow-xs'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isInstalled
                ? isDark
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : isDark
                ? 'bg-neutral-800 border-neutral-700 text-emerald-400'
                : 'bg-neutral-100 border-neutral-200 text-emerald-600'
            }`}
          >
            {isInstalled ? <CheckCircle2 className="w-6 h-6" /> : <Download className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-inherit">LocalLink Mobile / Desktop App</h3>
              {isInstalled && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Installed
                </span>
              )}
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {isInstalled
                ? 'LocalLink is currently running as an installed standalone application.'
                : 'Install LocalLink on Android, PC, Mac, or iOS for direct zero-browser launch.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isInstalled ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>LocalLink is installed</span>
            </div>
          ) : isInstallable ? (
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalling ? 'Installing...' : 'Install LocalLink'}</span>
            </button>
          ) : isIOS ? (
            <button
              onClick={() => setShowIOSModal(true)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isDark
                  ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  : 'border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Install on iOS</span>
            </button>
          ) : (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs ${
                isDark ? 'bg-neutral-800/80 text-neutral-400 border border-neutral-700' : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
              }`}
              title="You can install via your browser menu (Chrome 3 dots -> Install LocalLink or Edge menu)"
            >
              <Info className="w-3.5 h-3.5 text-neutral-400" />
              <span>PWA Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* iOS Modal Guide */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm p-5 rounded-2xl border shadow-2xl space-y-4 ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold">Install LocalLink on iOS Safari</h4>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-800/50 border border-neutral-700/60">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold">Tap Safari Share Button</p>
                  <p className="text-neutral-400 mt-0.5">
                    Tap the <Share className="inline w-3.5 h-3.5 mx-0.5 text-blue-400" /> button in Safari's bottom toolbar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-800/50 border border-neutral-700/60">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold">Choose "Add to Home Screen"</p>
                  <p className="text-neutral-400 mt-0.5">
                    Scroll down and tap <PlusSquare className="inline w-3.5 h-3.5 mx-0.5 text-emerald-400" /> <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-800/50 border border-neutral-700/60">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold">Tap Add</p>
                  <p className="text-neutral-400 mt-0.5">
                    Tap <strong>Add</strong> in the top-right corner. LocalLink will launch in full standalone mode!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
