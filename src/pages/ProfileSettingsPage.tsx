import React, { useState } from 'react';
import { Laptop, Smartphone, Tablet, Monitor, Check, User, KeyRound, QrCode, RefreshCw, Copy } from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';
import { DeviceType } from '../types';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const ProfileSettingsPage: React.FC = () => {
  const { profile, updateProfile, generateNewDeviceCode, openConnectModal, addToast } = useLocalLink();
  const { isDark } = useTheme();

  const [deviceName, setDeviceName] = useState(profile.deviceName);
  const [deviceType, setDeviceType] = useState<DeviceType>(profile.deviceType);
  const [description, setDescription] = useState(profile.description);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const deviceTypes: { type: DeviceType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { type: 'laptop', label: 'Laptop', icon: Laptop },
    { type: 'phone', label: 'Phone', icon: Smartphone },
    { type: 'tablet', label: 'Tablet', icon: Tablet },
    { type: 'desktop', label: 'Desktop', icon: Monitor },
  ];

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

  const handleConfirmRegenerate = () => {
    generateNewDeviceCode();
    setShowRegenConfirm(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) return;

    updateProfile({
      deviceName: deviceName.trim(),
      deviceType,
      avatar: deviceType,
      description: description.trim(),
    });

    setSavedSuccess(true);
    addToast({
      title: 'Profile Updated',
      message: 'Device profile changes saved and broadcasted to LAN.',
      type: 'success',
    });
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 4-Digit Connection Code Card */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-4 h-4 text-emerald-500" />
          <h2 className="text-base font-semibold text-inherit">4-Digit Connection Code</h2>
        </div>
        <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} mb-4`}>
          Your device&apos;s unique 4-digit PIN for manual connections on this local Wi-Fi.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">Current Device Code</div>
            <div className="text-3xl sm:text-4xl font-mono font-extrabold text-emerald-400 tracking-widest mt-0.5">
              {profile.deviceCode}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isDark ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
              }`}
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>

            <button
              type="button"
              onClick={() => openConnectModal('my-qr')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isDark ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Show QR</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRegenConfirm(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isDark ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-amber-400' : 'border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-amber-600'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate New Code</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <h2 className="text-base font-semibold text-inherit mb-1">Device Profile</h2>
        <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} mb-6`}>
          This name and avatar represent your device to other devices on the same Wi-Fi network.
        </p>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Device Type / Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-inherit mb-2">
              Device Form Factor
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {deviceTypes.map((dt) => {
                const Icon = dt.icon;
                const isSelected = deviceType === dt.type;

                return (
                  <button
                    type="button"
                    key={dt.type}
                    onClick={() => setDeviceType(dt.type)}
                    className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm'
                        : isDark
                        ? 'border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-white hover:border-neutral-700'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{dt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Device Name Input */}
          <div>
            <label className="block text-xs font-semibold text-inherit mb-2">
              Device Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Ifti's Phone"
              required
              className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-colors ${
                isDark
                  ? 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-emerald-500'
              }`}
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              Example: &quot;Ifti&apos;s Phone&quot; or &quot;Living Room Laptop&quot;
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-inherit mb-2">
              Device Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Personal work computer"
              className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-colors ${
                isDark
                  ? 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Readonly Persistent Device ID */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-neutral-400 mb-1">
              Local Device ID
            </label>
            <div className={`p-3 rounded-xl border text-xs font-mono tabular-nums ${
              isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-400' : 'bg-neutral-100 border-neutral-200 text-neutral-600'
            }`}>
              {profile.deviceId}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Your device ID remains stable across reloads and cannot be changed here (see Privacy settings to regenerate).
            </p>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : null}
              <span>{savedSuccess ? 'Saved' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={showRegenConfirm}
        title="Generate New 4-Digit Code?"
        message="Generating a new connection code will invalidate the previous code. Other devices will need your new code to connect."
        confirmText="Generate New Code"
        cancelText="Keep Current"
        variant="warning"
        onConfirm={handleConfirmRegenerate}
        onCancel={() => setShowRegenConfirm(false)}
      />
    </div>
  );
};
