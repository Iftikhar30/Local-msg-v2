import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  FileCheck,
  Radio,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';
import { sound } from '../services/sound';
import { NotificationType } from '../types';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    addToast,
  } = useLocalLink();

  const { isDark } = useTheme();

  const getNotifIcon = (type: NotificationType) => {
    switch (type) {
      case 'connection_request':
        return <Radio className="w-5 h-5 text-emerald-400" />;
      case 'device_connected':
      case 'connection_accepted':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'new_message':
        return <MessageSquare className="w-5 h-5 text-sky-400" />;
      case 'file_completed':
      case 'file_received':
        return <FileCheck className="w-5 h-5 text-amber-400" />;
      case 'transfer_failed':
      case 'connection_rejected':
        return <AlertCircle className="w-5 h-5 text-rose-400" />;
      default:
        return <Bell className="w-5 h-5 text-neutral-400" />;
    }
  };

  const handleTestSound = () => {
    sound.playMessageSound();
    addToast({ title: 'Sound Played', message: 'Synthesized notification chime triggered.', type: 'info' });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit">
            Notifications
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Local real-time alerts for connections, messages, and LAN file activities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              isDark
                ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white'
                : 'border-neutral-200 bg-neutral-100 text-neutral-700 hover:text-neutral-900'
            }`}
            title="Test notification sound"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Test Sound</span>
          </button>

          {notifications.length > 0 && (
            <>
              <button
                onClick={() => markAllNotificationsRead()}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Mark all read
              </button>

              <button
                onClick={() => clearNotifications()}
                className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* NOTIFICATIONS LIST */}
      {notifications.length === 0 ? (
        <div className={`p-10 text-center rounded-3xl border border-dashed ${
          isDark ? 'bg-neutral-900/30 border-neutral-800' : 'bg-white border-neutral-200'
        }`}>
          <Bell className="w-8 h-8 mx-auto text-neutral-500 mb-2" />
          <h3 className="text-sm font-semibold text-inherit">No notifications</h3>
          <p className="text-xs text-neutral-500 mt-1">
            You will receive instant alerts here when peers send messages or files over LAN.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                markNotificationRead(n.id);
                if (n.actionRoute) navigate(n.actionRoute);
              }}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                !n.read
                  ? isDark
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : 'border-emerald-200 bg-emerald-50/50'
                  : isDark
                  ? 'border-neutral-800/80 bg-neutral-900/40 hover:bg-neutral-900/70'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-neutral-800 border border-neutral-700/80 shrink-0">
                {getNotifIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-inherit truncate">{n.title}</h4>
                  <span className="text-[10px] text-neutral-500 font-mono tabular-nums shrink-0">
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  {n.description}
                </p>
              </div>

              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2"></span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
