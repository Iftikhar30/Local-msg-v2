import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Wifi,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Laptop,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useLocalLink } from '../../context/LocalLinkContext';
import { useTheme } from '../../context/ThemeContext';

export const ConnectServerModal: React.FC = () => {
  const {
    isServerModalOpen,
    closeServerModal,
    wsState,
    networkInfo,
    customServiceUrl,
    setCustomServiceUrl,
    addToast,
  } = useLocalLink();
  const { isDark } = useTheme();

  const [inputUrl, setInputUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    if (isServerModalOpen) {
      const saved = localStorage.getItem('locallink_custom_service_url') || '';
      setInputUrl(saved);
      setTestResult(null);
    }
  }, [isServerModalOpen]);

  if (!isServerModalOpen) return null;

  const isVercelHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('vercel.app') ||
      (!['localhost', '127.0.0.1'].includes(window.location.hostname) &&
        !window.location.hostname.startsWith('192.168.') &&
        !window.location.hostname.startsWith('10.') &&
        !window.location.hostname.startsWith('172.')));

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSaveAndConnect = async (targetUrl?: string) => {
    const urlToUse = (targetUrl !== undefined ? targetUrl : inputUrl).trim();
    setIsTesting(true);
    setTestResult(null);

    try {
      const success = await setCustomServiceUrl(urlToUse);
      if (success) {
        setTestResult({
          success: true,
          message: urlToUse ? `Connected to Local Service: ${urlToUse}` : 'Connected to default local host.',
        });
        addToast({
          title: 'Connected to Local Server',
          message: 'LocalLink is now communicating with your local LAN service.',
          type: 'success',
        });
        setTimeout(() => {
          closeServerModal();
        }, 1200);
      } else {
        setTestResult({
          success: false,
          message: urlToUse
            ? `Could not reach LocalLink server at "${urlToUse}". Make sure the server is running on that IP and port on the same Wi-Fi.`
            : 'Could not connect to local server.',
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetToDefault = () => {
    setInputUrl('');
    handleSaveAndConnect('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-inherit">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-inherit">Local Service Connection</h2>
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Connect frontend to your PC or Termux LocalLink server
              </p>
            </div>
          </div>

          <button
            onClick={closeServerModal}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Current Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              wsState === 'connected'
                ? isDark
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : isDark
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0">
                {wsState === 'connected' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    wsState === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                ></span>
              </span>
              <div>
                <div className="font-bold">
                  {wsState === 'connected' ? '🟢 Local Service Connected' : '🟡 Local Service Disconnected (Offline)'}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {wsState === 'connected'
                    ? `Host: ${networkInfo?.localIp || 'Localhost'} • Latency: ${networkInfo?.latencyMs || 2}ms`
                    : isVercelHost
                    ? 'Running on Vercel: specify your PC/Termux server IP below to enable LAN mesh.'
                    : 'Server is not responding. Ensure node server is running.'}
                </div>
              </div>
            </div>
          </div>

          {/* Service URL Input */}
          <div className="space-y-2">
            <label className="block font-bold text-inherit">
              LocalLink Server Address (PC / Android Termux)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="e.g. http://192.168.1.100:3000 or http://localhost:3000"
                className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none transition-colors ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-700 text-white placeholder-neutral-500 focus:border-emerald-500'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-emerald-500'
                }`}
              />
              <button
                onClick={() => handleSaveAndConnect()}
                disabled={isTesting}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>{isTesting ? 'Connecting...' : 'Connect'}</span>
              </button>
            </div>
            <p className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Enter the IP address shown in your Termux or PC terminal when running the LocalLink server.
            </p>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
                testResult.success
                  ? isDark
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isDark
                  ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="leading-snug">{testResult.message}</span>
            </div>
          )}

          {/* Quick Setup Instructions for Termux / PC */}
          <div className="space-y-3 pt-2">
            <div className="font-bold text-inherit flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>How to start LocalLink Server:</span>
            </div>

            {/* Android Termux */}
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" /> Android (Termux)
                </span>
                <button
                  onClick={() => handleCopy('npm run dev', 'termux')}
                  className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  {copiedCmd === 'termux' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd === 'termux' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <code className="block p-2 rounded bg-neutral-900 font-mono text-[11px] text-emerald-300 select-all overflow-x-auto">
                npm run dev
              </code>
            </div>

            {/* PC / Mac / Linux */}
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5" /> Computer (Windows / Mac / Linux)
                </span>
                <button
                  onClick={() => handleCopy('npm run dev', 'pc')}
                  className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  {copiedCmd === 'pc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd === 'pc' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <code className="block p-2 rounded bg-neutral-900 font-mono text-[11px] text-emerald-300 select-all overflow-x-auto">
                npm run dev
              </code>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-inherit bg-neutral-950/30">
          <button
            onClick={handleResetToDefault}
            className={`px-3 py-1.5 rounded-xl border text-xs transition-colors ${
              isDark ? 'border-neutral-700 text-neutral-400 hover:text-white' : 'border-neutral-300 text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Reset to Default
          </button>

          <button
            onClick={closeServerModal}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
