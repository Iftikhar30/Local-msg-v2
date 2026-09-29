import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Radio,
  MessageSquare,
  Send,
  Unplug,
  Check,
  Activity,
  ChevronDown,
  ChevronUp,
  Plus,
  QrCode,
  KeyRound,
} from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';
import { Device } from '../types';

export const DevicesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    devices,
    connectionStates,
    trustedDeviceIds,
    blockedDeviceIds,
    requestConnection,
    disconnectDevice,
    toggleTrustDevice,
    toggleBlockDevice,
    scanDevices,
    openConnectModal,
    profile,
    networkInfo,
    latencyMs,
  } = useLocalLink();

  const { isDark } = useTheme();
  const [isScanning, setIsScanning] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    await scanDevices();
    setTimeout(() => setIsScanning(false), 800);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      case 'desktop':
        return <Monitor className="w-5 h-5" />;
      default:
        return <Laptop className="w-5 h-5" />;
    }
  };

  // Exclude self from peer list
  const peerDevices = devices.filter((d) => !d.isSelf);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit">
            LAN Devices
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Devices connected to your Wi-Fi network running LocalLink are automatically discovered.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openConnectModal('code')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-950 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Device</span>
          </button>

          <button
            onClick={() => openConnectModal('my-qr')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isDark
                ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                : 'border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>My Code: #{profile.deviceCode}</span>
          </button>

          <button
            onClick={handleScan}
            disabled={isScanning}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isDark
                ? 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                : 'border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Again'}</span>
          </button>
        </div>
      </div>

      {/* DEVICES LIST */}
      {peerDevices.length === 0 ? (
        <div className={`p-10 text-center rounded-3xl border border-dashed ${
          isDark ? 'bg-neutral-900/30 border-neutral-800' : 'bg-white border-neutral-200'
        }`}>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-neutral-800/60 border border-neutral-700/80 flex items-center justify-center text-neutral-400 mb-4">
            <Radio className="w-8 h-8 animate-pulse text-emerald-500" />
          </div>

          <h3 className="text-base font-semibold text-inherit">No devices found</h3>
          <p className={`text-xs max-w-md mx-auto mt-2 leading-relaxed ${
            isDark ? 'text-neutral-400' : 'text-neutral-600'
          }`}>
            Make sure another phone, laptop, or tablet is connected to the same Wi-Fi network and LocalLink is running on it.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => openConnectModal('code')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-md shadow-emerald-950"
            >
              + Connect by Code or QR
            </button>
            <button
              onClick={handleScan}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isDark ? 'border-neutral-700 bg-neutral-800 text-neutral-200' : 'border-neutral-300 bg-white text-neutral-800'
              }`}
            >
              Scan Again
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {peerDevices.map((device) => {
            const isConn = connectionStates[device.deviceId] === 'connected';
            const isReq = connectionStates[device.deviceId] === 'requested';
            const isTrusted = trustedDeviceIds.includes(device.deviceId);
            const isBlocked = blockedDeviceIds.includes(device.deviceId);

            return (
              <div
                key={device.deviceId}
                className={`relative rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                  isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'
                } ${isBlocked ? 'opacity-60' : ''}`}
              >
                <div>
                  {/* Top row: Icon, Name, Online status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-emerald-400 shrink-0">
                        {getDeviceIcon(device.deviceType)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-inherit truncate">
                            {device.deviceName}
                          </h3>
                          {device.deviceCode && (
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              #{device.deviceCode}
                            </span>
                          )}
                        </div>

                        {/* Unboxed metadata per anti-pill rule */}
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5 font-mono tabular-nums">
                          <span>{device.ip}</span>
                          <span aria-hidden="true">·</span>
                          <span>{device.os || 'LAN'}</span>
                          <span aria-hidden="true">·</span>
                          <span>LocalLink {device.version || '1.0'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Dot */}
                    <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        device.isOnline ? 'bg-emerald-500' : 'bg-neutral-500'
                      }`} />
                      <span className={device.isOnline ? 'text-emerald-500 font-medium' : 'text-neutral-500'}>
                        {device.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Badges / Trust Info */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    {isConn && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        <Check className="w-3.5 h-3.5" />
                        Connected
                      </span>
                    )}

                    {isTrusted && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Trusted Device
                      </span>
                    )}

                    {isBlocked && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Blocked
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 pt-4 border-t border-inherit flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Trust Toggle */}
                    <button
                      onClick={() => toggleTrustDevice(device.deviceId)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isTrusted
                          ? isDark
                            ? 'border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
                            : 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100'
                          : isDark
                          ? 'border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                          : 'border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                    >
                      {isTrusted ? 'Remove Trust' : 'Trust'}
                    </button>

                    {/* Block Toggle */}
                    <button
                      onClick={() => toggleBlockDevice(device.deviceId)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isBlocked
                          ? isDark
                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                            : 'border-rose-300 bg-rose-50 text-rose-700'
                          : isDark
                          ? 'border-neutral-800 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800'
                          : 'border-neutral-200 text-neutral-600 hover:text-rose-600 hover:bg-neutral-100'
                      }`}
                    >
                      {isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConn ? (
                      <>
                        <button
                          onClick={() => navigate(`/chats/${device.deviceId}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </button>

                        <button
                          onClick={() => disconnectDevice(device.deviceId)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Disconnect"
                        >
                          <Unplug className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => requestConnection(device.deviceId)}
                        disabled={isReq || !device.isOnline || isBlocked}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors shadow-sm"
                      >
                        {isReq ? 'Requested...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADVANCED DIAGNOSTICS TOGGLE (Requirement: Provide an advanced diagnostics section separately) */}
      <div className={`rounded-2xl border transition-all ${
        isDark ? 'bg-neutral-900/30 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="w-full flex items-center justify-between p-4 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>Advanced Network Diagnostics</span>
          </div>
          {showDiagnostics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDiagnostics && (
          <div className="p-4 pt-0 border-t border-inherit space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 font-mono tabular-nums">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="text-[10px] text-neutral-500">LOCAL IP</div>
                <div className="font-semibold text-inherit mt-1">{networkInfo?.localIp || '127.0.0.1'}</div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="text-[10px] text-neutral-500">HOSTNAME</div>
                <div className="font-semibold text-inherit mt-1 truncate">{networkInfo?.hostname || 'localhost'}</div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="text-[10px] text-neutral-500">LATENCY</div>
                <div className="font-semibold text-emerald-500 mt-1">{latencyMs} ms</div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="text-[10px] text-neutral-500">DISCOVERY</div>
                <div className="font-semibold text-inherit mt-1">UDP + WebSocket</div>
              </div>
            </div>

            {networkInfo?.interfaces && networkInfo.interfaces.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-neutral-400 mb-2">Network Interfaces</div>
                <div className="space-y-1 text-[11px] font-mono">
                  {networkInfo.interfaces
                    .filter((iface) => !iface.internal)
                    .map((iface, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-2 rounded-lg border ${
                          isDark ? 'border-neutral-800/60 bg-neutral-950/40 text-neutral-300' : 'border-neutral-200 bg-neutral-50 text-neutral-700'
                        }`}
                      >
                        <span className="font-medium text-emerald-500">{iface.name}</span>
                        <span>{iface.address}</span>
                        <span className="text-neutral-500">{iface.mac}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
