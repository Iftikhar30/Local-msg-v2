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
} from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const ChatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { conversations, devices, clearConversation } = useLocalLink();
  const { isDark } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

  const filteredConversations = conversations.filter(
    (c) =>
      c.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} min ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const onlineCount = devices.filter((d) => d.isOnline && !d.isSelf).length;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit">
              Chats
            </h1>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                onlineCount > 0
                  ? isDark
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : isDark
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-600'
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${onlineCount > 0 ? 'bg-emerald-500' : 'bg-neutral-500'}`} />
              <span className="font-semibold tabular-nums">Devices Online: {onlineCount}</span>
            </div>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            End-to-end local network conversations. Saved privately in your browser storage.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none transition-colors ${
              isDark
                ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500'
                : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* CONVERSATION LIST */}
      {conversations.length === 0 ? (
        <div className={`p-10 text-center rounded-3xl border border-dashed ${
          isDark ? 'bg-neutral-900/30 border-neutral-800' : 'bg-white border-neutral-200'
        }`}>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-neutral-800/60 border border-neutral-700/80 flex items-center justify-center text-neutral-400 mb-4">
            <MessageSquare className="w-8 h-8 text-emerald-500" />
          </div>

          <h3 className="text-base font-semibold text-inherit">No conversations yet</h3>
          <p className={`text-xs max-w-sm mx-auto mt-2 leading-relaxed ${
            isDark ? 'text-neutral-400' : 'text-neutral-600'
          }`}>
            Connect to a device to start chatting over the local network.
          </p>

          <div className="mt-6">
            <button
              onClick={() => navigate('/devices')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              Discover Devices
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
                className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isDark
                    ? 'border-neutral-800/80 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300'
                }`}
              >
                <div
                  className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer"
                  onClick={() => navigate(`/chats/${conv.deviceId}`)}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-emerald-400">
                      {getDeviceIcon(dev?.deviceType)}
                    </div>
                    {/* Status dot */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${
                        isDark ? 'border-neutral-900' : 'border-white'
                      } ${isOnline ? 'bg-emerald-500' : 'bg-neutral-500'}`}
                      title={isOnline ? 'Online' : 'Offline'}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-neutral-500'}`} />
                        <h3 className="text-sm font-bold text-inherit truncate">
                          {conv.deviceName}
                        </h3>
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
        message="Are you sure you want to delete this conversation and all its messages from your local browser database? This cannot be undone."
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
