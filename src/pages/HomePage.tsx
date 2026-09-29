import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  Radio,
  ChevronRight,
  Trash2,
  Plus,
  Users,
  Wifi,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    conversations,
    devices,
    clearConversation,
    openConnectModal,
    scanDevices,
    wsState,
  } = useLocalLink();
  const { isDark } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const onlineDevices = devices.filter((d) => d.isOnline && !d.isSelf);
  const onlineCount = onlineDevices.length;

  const getDeviceIcon = (type?: string) => {
    switch (type) {
      case 'phone':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Laptop className="w-4 h-4" />;
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5 animate-in fade-in duration-150">
      {/* COMPACT TOP BAR: TITLE, DEVICES ONLINE BADGE & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit">
              Chats
            </h1>
            
            {/* Devices Online Indicator (Small counter requested by user) */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                onlineCount > 0
                  ? isDark
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : isDark
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-600'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {onlineCount > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    onlineCount > 0 ? 'bg-emerald-500' : 'bg-neutral-500'
                  }`}
                ></span>
              </span>
              <span className="font-semibold tabular-nums">
                Devices Online: {onlineCount}
              </span>
            </div>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Direct peer-to-peer messaging across your local network.
          </p>
        </div>

        {/* Search Bar & Connect Trigger */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search chats or peers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none transition-colors ${
                isDark
                  ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500'
                  : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-emerald-500'
              }`}
            />
          </div>

          <button
            onClick={() => openConnectModal('code')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm shrink-0"
            title="Connect with 4-digit code or QR"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* ACTIVE ONLINE PEERS HORIZONTAL ROW (Quick 1-click start chat) */}
      {onlineDevices.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Wifi className="w-3 h-3 text-emerald-500" />
            <span>Active on LAN ({onlineCount})</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {onlineDevices.map((dev) => (
              <button
                key={dev.deviceId}
                onClick={() => navigate(`/chats/${dev.deviceId}`)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all shrink-0 cursor-pointer ${
                  isDark
                    ? 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 hover:border-emerald-500/40 text-neutral-200'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-emerald-300 text-neutral-800 shadow-xs'
                }`}
              >
                <div className="relative">
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-emerald-400">
                    {getDeviceIcon(dev.deviceType)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-neutral-950" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold truncate max-w-[110px]">
                    {dev.deviceName}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    Online
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CONVERSATION LIST */}
      {conversations.length === 0 ? (
        <div
          className={`p-8 sm:p-12 text-center rounded-3xl border border-dashed transition-all ${
            isDark ? 'bg-neutral-900/30 border-neutral-800' : 'bg-white border-neutral-200'
          }`}
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-800/60 border border-neutral-700/80 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
            <MessageSquare className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-inherit">No conversations yet</h3>
          <p
            className={`text-xs max-w-sm mx-auto mt-1.5 leading-relaxed ${
              isDark ? 'text-neutral-400' : 'text-neutral-600'
            }`}
          >
            Start a direct message with any device on this local Wi-Fi, or enter a 4-digit connection code.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={() => openConnectModal('code')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Connect by Code / QR</span>
            </button>

            <button
              onClick={() => {
                scanDevices();
                navigate('/devices');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isDark
                  ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  : 'border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Discover Devices</span>
            </button>
          </div>
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="p-8 text-center text-xs text-neutral-400">
          No conversations matched &quot;{searchTerm}&quot;
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conv) => {
            const dev = devices.find((d) => d.deviceId === conv.deviceId);
            const isOnline = dev?.isOnline ?? false;

            return (
              <div
                key={conv.deviceId}
                className={`group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isDark
                    ? 'border-neutral-800/80 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 shadow-xs'
                }`}
              >
                <div
                  className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                  onClick={() => navigate(`/chats/${conv.deviceId}`)}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-emerald-400">
                      {getDeviceIcon(dev?.deviceType)}
                    </div>
                    {/* Status dot */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${
                        isDark ? 'border-neutral-900' : 'border-white'
                      } ${isOnline ? 'bg-emerald-500' : 'bg-neutral-500'}`}
                      title={isOnline ? 'Online on LAN' : 'Offline'}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            isOnline ? 'bg-emerald-500' : 'bg-neutral-500'
                          }`}
                        />
                        <h3 className="text-sm font-bold text-inherit truncate">
                          {conv.deviceName}
                        </h3>
                        {dev?.deviceCode && (
                          <span className="text-[10px] font-mono font-bold text-neutral-400 bg-neutral-800/60 px-1.5 py-0.5 rounded border border-neutral-700/50">
                            #{dev.deviceCode}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400 font-mono tabular-nums shrink-0">
                        {formatTimestamp(conv.lastTimestamp)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className={`text-xs truncate ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        {conv.lastMessage}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-neutral-950 tabular-nums shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ml-3 flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTargetId(conv.deviceId);
                    }}
                    className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => navigate(`/chats/${conv.deviceId}`)}
                    className="p-2 text-neutral-400 hover:text-neutral-200 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation and all its messages from your local storage? This cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={async () => {
          if (deleteTargetId) {
            await clearConversation(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
