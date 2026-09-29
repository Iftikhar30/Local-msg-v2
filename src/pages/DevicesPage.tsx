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
  Trash2,
  Clock,
  XCircle,
  HelpCircle,
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
    deleteSavedDevice,
    scanDevices,
    openConnectModal,
    profile,
    networkInfo,
    latencyMs,
    getDiagnostics,
  } = useLocalLink();

  const { isDark } = useTheme();
  const [isScanning, setIsScanning] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    await scanDevices();
    setTimeout(() => setIsScanning(false), 800);
  };

  const getDeviceIcon = (type?: string) => {
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

  const peerDevices = devices.filter((d) => !d.isSelf);
  const diagnostics = getDiagnostics();

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit">
            LAN Devices
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Devices active on your local Wi-Fi. Peer permission is required before direct P2P connection.
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

          <h3 className="text-base font-semibold text-inherit">No devices discovered yet</h3>
          <p className={`text-xs max-w-md mx-auto mt-2 leading-relaxed ${
            isDark ? 'text-neutral-400' : 'text-neutral-600'
          }`}>
            Open LocalLink on another phone, laptop, or tablet on the same Wi-Fi, or enter their 4-digit code.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => openConnectModal('code')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-md shadow-emerald-950"
            >
              + Enter 4-Digit Code
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
            const cState = connectionStates[device.deviceId] || device.connectionState || 'disconnected';
            const isConn = cState === 'connected';
            const isReq = cState === 'requested';
            const isConnecting = cState === 'connecting';
            const isRejected = device.status === 'rejected';
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
                  {/* Top row: Icon, Name, Precise Status */}
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

                        <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5 font-mono tabular-nums">
                          <span>{device.ip || 'LAN'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{device.os || 'Browser'}</span>
                          <span aria-hidden="true">·</span>
                          <span>P2P</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge (Discovered ≠ Requested ≠ Connected) */}
                    <div className="shrink-0 text-[11px] flex items-center gap-1.5">
                      {isConn ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Connected
                        </span>
                      ) : isReq ? (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Clock className="w-3 h-3 animate-spin" />
                          Waiting for permission
                        </span>
                      ) : isConnecting ? (
                        <span className="flex items-center gap-1 text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Connecting...
                        </span>
                      ) : isRejected ? (
                        <span className="flex items-center gap-1 text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          Connection rejected
                        </span>
                      ) : device.isOnline ? (
                        <span className="flex items-center gap-1 text-neutral-400 font-medium bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Discovered
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-neutral-500 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
                          Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges / Trust Info */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    {isTrusted && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Trusted Device
                      </span>
                    )}

                    {isBlocked && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
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

                    {/* Remove from local list */}
                    <button
                      onClick={() => deleteSavedDevice(device.deviceId)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                      title="Remove device from list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConn ? (
                      <>
                        <button
                          onClick={() => navigate(`/chats/${device.deviceId}`)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </button>

                        <button
                          onClick={() => disconnectDevice(device.deviceId)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Disconnect WebRTC"
                        >
                          <Unplug className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => requestConnection(device.deviceId)}
                        disabled={isReq || isConnecting || isBlocked}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors shadow-sm"
                      >
                        {isReq ? 'Requested...' : isConnecting ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADVANCED DIAGNOSTICS & DEBUGGING SECTION (Requirement #21) */}
      <div className={`rounded-2xl border transition-all ${
        isDark ? 'bg-neutral-900/30 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="w-full flex items-center justify-between p-4 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>Connection Diagnostics & Debug Info</span>
          </div>
          {showDiagnostics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDiagnostics && (
          <div className="p-4 pt-0 border-t border-inherit space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 font-mono tabular-nums">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="text-[10px] text-neutral-500">LOCAL DEVICE ID</div>
                <div className="font-semibold text-inherit mt-1 truncate">{diagnostics.localDeviceId}</div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="text-[10px] text-neutral-500">PAIRING CODE</div>
                <div className="font-semibold text-emerald-400 mt-1">#{diagnostics.localDeviceCode}</div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="text-[10px] text-neutral-500">SIGNALING STATE</div>
                <div className="font-semibold text-emerald-500 mt-1">
                  {diagnostics.signalingConnected ? 'Active (MQTT / Mesh)' : 'Connecting'}
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="text-[10px] text-neutral-500">CONNECTED PEERS</div>
                <div className="font-semibold text-inherit mt-1">{diagnostics.connectedPeerCount}</div>
              </div>
            </div>

            {/* Last message & ACK logs */}
            <div className="p-3 rounded-xl border text-xs font-mono space-y-1.5 bg-neutral-950/40 border-neutral-800 text-neutral-400">
              <div>
                <span className="text-neutral-500">Last Sent: </span>
                {diagnostics.lastMessageSent ? (
                  <span className="text-emerald-400">
                    ID {diagnostics.lastMessageSent.id.slice(-6)} to {diagnostics.lastMessageSent.to.slice(-6)} ({new Date(diagnostics.lastMessageSent.time).toLocaleTimeString()})
                  </span>
                ) : (
                  'None'
                )}
              </div>
              <div>
                <span className="text-neutral-500">Last Received: </span>
                {diagnostics.lastMessageReceived ? (
                  <span className="text-sky-400">
                    ID {diagnostics.lastMessageReceived.id.slice(-6)} from {diagnostics.lastMessageReceived.from.slice(-6)} ({new Date(diagnostics.lastMessageReceived.time).toLocaleTimeString()})
                  </span>
                ) : (
                  'None'
                )}
              </div>
              <div>
                <span className="text-neutral-500">Last ACK: </span>
                {diagnostics.lastAckReceived ? (
                  <span className="text-emerald-400">
                    ID {diagnostics.lastAckReceived.id.slice(-6)} - Status: {diagnostics.lastAckReceived.status} ({new Date(diagnostics.lastAckReceived.time).toLocaleTimeString()})
                  </span>
                ) : (
                  'None'
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
