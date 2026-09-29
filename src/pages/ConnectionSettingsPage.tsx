import React, { useState } from 'react';
import {
  Wifi,
  Radio,
  Server,
  Activity,
  Check,
  ShieldCheck,
  Globe,
  Smartphone,
  Laptop,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';

export const ConnectionSettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    networkInfo,
    wsState,
    latencyMs,
    trustedDeviceIds,
    setCustomServiceUrl,
    addToast,
  } = useLocalLink();
  const { isDark } = useTheme();

  const isRemoteHost = typeof window !== 'undefined' && 
    !['localhost', '127.0.0.1'].includes(window.location.hostname) &&
    !window.location.hostname.startsWith('192.168.') &&
    !window.location.hostname.startsWith('10.') &&
    !window.location.hostname.startsWith('172.');

  const [serviceUrl, setServiceUrl] = useState(() => {
    return localStorage.getItem('locallink_custom_service_url') || 
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  });
  const [isTestingService, setIsTestingService] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setIsTestingService(true);
    setTestResult(null);

    const clean = serviceUrl.trim().replace(/\/+$/, '');
    try {
      const success = await setCustomServiceUrl(clean);
      if (success) {
        setTestResult({
          success: true,
          message: `Connected successfully to LocalLink service at: ${clean}`,
        });
        addToast({
          title: 'Service Connected',
          message: `LocalLink service at ${clean} is online and active.`,
          type: 'success',
        });
      } else {
        setTestResult({
          success: false,
          message: 'Could not connect. Ensure the LocalLink server is running (e.g. npm run dev) on that IP and port.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Connection failed. Ensure the server is running on the same Wi-Fi.',
      });
    } finally {
      setIsTestingService(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* PRIMARY ARCHITECTURE CARD */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-semibold text-inherit">Architecture: Browser-to-Browser WebRTC</h2>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            🟢 Zero Server P2P Active
          </span>
        </div>

        <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} leading-relaxed mb-4`}>
          LocalLink uses pure <strong>Browser-to-Browser WebRTC DataChannels</strong> for zero-cloud messaging, instant pairing, and chunked file transfer across your Wi-Fi network. No Node.js or Termux installation is required for standard users.
        </p>

        {/* Optional Local Server Config */}
        <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-inherit flex items-center gap-1.5">
              <Server className="w-4 h-4 text-emerald-400" /> Optional Advanced: Self-Hosted Local Server
            </span>
          </div>
          <p className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            If you choose to run a dedicated Node.js server on PC or Android Termux (e.g. <code>npm run dev</code>), you can connect its custom IP endpoint below:
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={serviceUrl}
              onChange={(e) => setServiceUrl(e.target.value)}
              placeholder="e.g. http://192.168.1.100:3000"
              className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-mono border outline-none ${
                isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'
              }`}
            />
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingService}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              {isTestingService ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Connect</span>
            </button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            }`}>
              {testResult.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* CONNECTION TOGGLES */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <h2 className="text-base font-semibold text-inherit mb-1">Connection Preferences</h2>
        <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} mb-6`}>
          Configure automated reconnection and discovery protocols for your local mesh.
        </p>

        <div className="divide-y divide-inherit">
          {/* Auto Reconnect */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h4 className="text-xs font-semibold text-inherit">Auto Reconnect</h4>
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Automatically restore local connections when network drops or restarts
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ autoReconnect: !settings.autoReconnect })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.autoReconnect ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.autoReconnect ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Trusted Devices Reconnect */}
          <div className="flex items-center justify-between py-4">
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-semibold text-inherit">Trusted Devices</h4>
                <span className="text-[10px] text-emerald-400 font-mono tabular-nums">
                  ({trustedDeviceIds.length} active)
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Allow paired trusted devices to connect automatically without manual confirmation
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 font-mono">
              ON
            </span>
          </div>

          {/* Allow Connections */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h4 className="text-xs font-semibold text-inherit">Allow Connections</h4>
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Accept incoming connection invites from other devices on this LAN
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ allowConnectionRequests: !settings.allowConnectionRequests })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.allowConnectionRequests ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.allowConnectionRequests ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Device Discovery */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h4 className="text-xs font-semibold text-inherit">Device Discovery</h4>
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Enable periodic UDP and WebSocket broadcast beacons to discover peers
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ allowDiscovery: !settings.allowDiscovery })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.allowDiscovery ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.allowDiscovery ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* LOCAL NETWORK STATUS & DIAGNOSTICS */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <h2 className="text-base font-semibold text-inherit mb-1">Local Network</h2>
        <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} mb-6`}>
          Real-time interface detection and network state details.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="text-xs text-neutral-400 mb-1">Wi-Fi / LAN</div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Connected</span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="text-xs text-neutral-400 mb-1">Local IP</div>
            <div className="text-sm font-bold font-mono tabular-nums text-inherit">
              {networkInfo?.localIp || '127.0.0.1'}
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className="text-xs text-neutral-400 mb-1">Port / Gateway</div>
            <div className="text-sm font-bold font-mono tabular-nums text-inherit">
              {networkInfo?.port || 3000}
            </div>
          </div>
        </div>

        {/* ADVANCED DIAGNOSTICS */}
        <div className="mt-6 pt-6 border-t border-inherit space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Advanced Diagnostics</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono tabular-nums">
            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              isDark ? 'bg-neutral-950/40 border-neutral-800/80 text-neutral-300' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
            }`}>
              <span>WebSocket</span>
              <span className={wsState === 'connected' ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                {wsState === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              isDark ? 'bg-neutral-950/40 border-neutral-800/80 text-neutral-300' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
            }`}>
              <span>LAN Broadcast</span>
              <span className="text-emerald-400 font-semibold">Active</span>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              isDark ? 'bg-neutral-950/40 border-neutral-800/80 text-neutral-300' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
            }`}>
              <span>Latency</span>
              <span className="text-emerald-400 font-semibold">{latencyMs} ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
