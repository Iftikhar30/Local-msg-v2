import React from 'react';
import { Bell, Volume2, MessageSquare, Radio, ArrowLeftRight } from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';
import { sound } from '../services/sound';

export const NotificationSettingsPage: React.FC = () => {
  const { settings, updateSettings, addToast } = useLocalLink();
  const { isDark } = useTheme();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <h2 className="text-base font-semibold text-inherit mb-1">Notification Preferences</h2>
        <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} mb-6`}>
          Configure which events trigger in-app banners and synthesized audio chimes.
        </p>

        <div className="divide-y divide-inherit">
          {/* Messages */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-inherit">Messages</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Notify when a connected LAN device sends you a text or image
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ notifyMessages: !settings.notifyMessages })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.notifyMessages ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.notifyMessages ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Connection Requests */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <Radio className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-inherit">Connection Requests</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Alert when an un-trusted peer on your Wi-Fi asks to pair
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ notifyConnectionRequests: !settings.notifyConnectionRequests })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.notifyConnectionRequests ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.notifyConnectionRequests ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* File Transfers */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <ArrowLeftRight className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-inherit">File Transfers</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Alert when a file transfer starts or completes
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ notifyTransfers: !settings.notifyTransfers })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.notifyTransfers ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.notifyTransfers ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Message Sound */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <Volume2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-inherit">Message Sound</h4>
                  <button
                    onClick={() => sound.playMessageSound()}
                    className="text-[10px] text-emerald-500 hover:underline font-medium"
                  >
                    Play preview
                  </button>
                </div>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Synthesized soft chime on incoming messages
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.soundEnabled ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Connection Sound */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <Volume2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-inherit">Connection Sound</h4>
                  <button
                    onClick={() => sound.playConnectionSound()}
                    className="text-[10px] text-emerald-500 hover:underline font-medium"
                  >
                    Play preview
                  </button>
                </div>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Pleasant rising chord when pairing with a device
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 font-mono">
              ON
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
