import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  KeyRound,
  QrCode,
  Camera,
  ShieldCheck,
  Laptop,
  Copy,
  Check,
  RefreshCw,
  Plus,
  ArrowRight,
  Wifi,
  ExternalLink,
} from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';
import { QRService } from '../services/qr';

export const ConnectPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, networkInfo, openConnectModal, addToast, generateNewDeviceCode } = useLocalLink();
  const { isDark } = useTheme();
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(profile.deviceCode);
      setCopiedCode(true);
      addToast({
        title: 'Code Copied',
        message: `Device code #${profile.deviceCode} copied to clipboard.`,
        type: 'success',
      });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>LAN Peer Pairing</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit">
            Connect a Device
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Connect to any device on your local Wi-Fi via 4-digit PIN, QR scan, or auto-discovery.
          </p>
        </div>
      </div>

      {/* Your Code Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-neutral-900/60 border-emerald-500/20' : 'bg-white border-emerald-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Your Device Connection Code
            </span>
            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-4xl md:text-5xl font-mono font-extrabold tracking-widest text-emerald-400 bg-neutral-950 px-5 py-1.5 rounded-2xl border border-emerald-500/30 shadow-inner">
                {profile.deviceCode}
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} mt-1`}>
              {profile.deviceName} &bull; {networkInfo?.localIp || 'Local LAN'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCopyCode}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isDark ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
              }`}
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>

            <button
              onClick={() => openConnectModal('my-qr')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isDark ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Show My QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Connection Modes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mode 1: 4-Digit PIN */}
        <Link
          to="/connect/code"
          className={`p-6 rounded-3xl border flex flex-col justify-between group transition-all ${
            isDark ? 'bg-neutral-900/40 border-neutral-800 hover:border-emerald-500/40 hover:bg-neutral-900/70' : 'bg-white border-neutral-200 hover:border-emerald-400 hover:shadow-md'
          }`}
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-inherit mb-1">Enter 4-Digit Code</h2>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Type the 4-digit PIN displayed on the other phone or computer on this Wi-Fi.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <span>Open Keypad</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Mode 2: Scan QR */}
        <Link
          to="/connect/scan"
          className={`p-6 rounded-3xl border flex flex-col justify-between group transition-all ${
            isDark ? 'bg-neutral-900/40 border-neutral-800 hover:border-emerald-500/40 hover:bg-neutral-900/70' : 'bg-white border-neutral-200 hover:border-emerald-400 hover:shadow-md'
          }`}
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-inherit mb-1">Scan QR Code</h2>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Point your camera at the other device&apos;s LocalLink QR code or upload a screenshot.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <span>Open Camera Scanner</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Auto LAN Discovery link */}
      <div className={`p-5 rounded-2xl border flex items-center justify-between ${
        isDark ? 'bg-neutral-900/30 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
      }`}>
        <div className="flex items-center gap-3">
          <Laptop className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-inherit">Automatic LAN Discovery</div>
            <p className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              View all online peers actively beaconing across your Wi-Fi subnet.
            </p>
          </div>
        </div>

        <Link
          to="/devices"
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0"
        >
          View Devices
        </Link>
      </div>
    </div>
  );
};
