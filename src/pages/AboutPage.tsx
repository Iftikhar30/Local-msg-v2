import React from 'react';
import { Radio, ShieldCheck, Wifi, Cpu, Lock, CheckCircle2 } from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';

export const AboutPage: React.FC = () => {
  const { networkInfo, latencyMs, wsState } = useLocalLink();
  const { isDark } = useTheme();

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* BRAND CARD */}
      <div className={`p-8 rounded-3xl border text-center transition-all ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 shadow-inner">
          <Radio className="w-8 h-8 animate-pulse" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-inherit">LocalLink</h1>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mt-1">
          Private. Local. Connected.
        </p>

        <p className={`text-xs mt-3 max-w-md mx-auto leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          Version 1.0.0 · Built with React + TypeScript + Node.js + WebSockets
        </p>

        {/* PILLARS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 max-w-lg mx-auto text-left text-xs">
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>No Accounts</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              No registration, login, passwords, or emails.
            </p>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>No Cloud</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Zero cloud databases, relays, or external servers.
            </p>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>No Tracking</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              LAN only. Works even when Internet is disconnected.
            </p>
          </div>
        </div>
      </div>

      {/* TECHNICAL ARCHITECTURE */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <h2 className="text-base font-semibold text-inherit mb-1">Local Network Architecture</h2>
        <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} mb-4`}>
          LocalLink uses a local service model with UDP broadcast discovery, Node.js HTTP chunking, and WebSocket control channels.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="text-[10px] text-neutral-500">WEBSOCKET</div>
            <div className="font-semibold text-emerald-400 mt-1">{wsState.toUpperCase()}</div>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="text-[10px] text-neutral-500">UDP DISCOVERY</div>
            <div className="font-semibold text-inherit mt-1">PORT 41235</div>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="text-[10px] text-neutral-500">LOCAL LATENCY</div>
            <div className="font-semibold text-emerald-400 mt-1">{latencyMs} ms</div>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="text-[10px] text-neutral-500">STORAGE ENGINE</div>
            <div className="font-semibold text-inherit mt-1">IndexedDB</div>
          </div>
        </div>

        {networkInfo && (
          <div className="mt-4 pt-4 border-t border-inherit text-xs text-neutral-400 space-y-1 font-mono">
            <div>HOST: {networkInfo.hostname} ({networkInfo.platform} {networkInfo.osRelease})</div>
            <div>LOCAL IP: {networkInfo.localIp}</div>
            <div>SERVER PORT: {networkInfo.port}</div>
          </div>
        )}
      </div>
    </div>
  );
};
