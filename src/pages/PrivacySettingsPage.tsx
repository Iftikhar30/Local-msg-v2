import React, { useState } from 'react';
import {
  Shield,
  Eye,
  Radio,
  MessageSquare,
  ArrowLeftRight,
  Clipboard,
  ShieldAlert,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const PrivacySettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    blockedDeviceIds,
    toggleBlockDevice,
    profile,
    generateNewIdentity,
  } = useLocalLink();

  const { isDark } = useTheme();
  const [showIdentityConfirm, setShowIdentityConfirm] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* PRIVACY TOGGLES */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <h2 className="text-base font-semibold text-inherit mb-1">LAN Privacy & Visibility</h2>
        <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} mb-6`}>
          Control how visible and accessible your device is to other clients on this local Wi-Fi.
        </p>

        <div className="divide-y divide-inherit">
          {/* Discoverable on LAN */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-inherit">Discoverable on LAN</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Broadcast beacons allowing nearby LocalLink instances to find you
                </p>
              </div>
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

          {/* Allow Connection Requests */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <Radio className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-inherit">Allow Connection Requests</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Permit incoming connection popups from un-trusted peers
                </p>
              </div>
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

          {/* Allow Messages */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-inherit">Allow Messages</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Receive real-time chat messages from connected devices
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ allowMessages: !settings.allowMessages })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.allowMessages ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.allowMessages ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Allow File Transfers */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <ArrowLeftRight className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-inherit">Allow File Transfers</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Accept incoming chunked file streams from connected peers
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ allowFileTransfers: !settings.allowFileTransfers })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.allowFileTransfers ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.allowFileTransfers ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Allow Clipboard Sharing (OFF by default for security) */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <Clipboard className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-inherit">Allow Clipboard Sharing</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Allow receiving text snippets to copy to your system clipboard
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ allowClipboardSharing: !settings.allowClipboardSharing })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.allowClipboardSharing ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.allowClipboardSharing ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* BLOCKED DEVICES SECTION */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h2 className="text-base font-semibold text-inherit">Blocked Devices</h2>
        </div>
        <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} mb-4`}>
          Blocked devices cannot discover your details, send connection requests, or transmit messages/files.
        </p>

        {blockedDeviceIds.length === 0 ? (
          <p className="text-xs text-neutral-500 italic py-2">
            No devices are currently blocked on this LAN.
          </p>
        ) : (
          <div className="space-y-2">
            {blockedDeviceIds.map((id) => (
              <div
                key={id}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="min-w-0 font-mono text-xs text-neutral-300 truncate">
                  {id}
                </div>
                <button
                  onClick={() => toggleBlockDevice(id)}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DEVICE IDENTITY RESET (Requirement 28) */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <h2 className="text-base font-semibold text-inherit mb-1">Anonymous Device Identity</h2>
        <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} mb-4`}>
          Your persistent device ID uniquely identifies your client to trusted peers without any account, email, or passwords.
        </p>

        <div className={`p-3.5 rounded-xl border text-xs font-mono tabular-nums mb-4 ${
          isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-400' : 'bg-neutral-100 border-neutral-200 text-neutral-600'
        }`}>
          {profile.deviceId}
        </div>

        <button
          onClick={() => setShowIdentityConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors border border-neutral-700/80"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Generate New Device Identity</span>
        </button>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showIdentityConfirm}
        title="Regenerate Device Identity?"
        message="Generating a new identity will assign a completely fresh, anonymous ID to your device. Existing trusted peers will need to re-pair with you. Do you wish to proceed?"
        confirmLabel="Generate New ID"
        isDestructive={true}
        onConfirm={() => {
          generateNewIdentity();
          setShowIdentityConfirm(false);
        }}
        onCancel={() => setShowIdentityConfirm(false)}
      />
    </div>
  );
};
