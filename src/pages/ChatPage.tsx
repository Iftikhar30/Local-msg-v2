import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Image,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  MoreVertical,
  Trash2,
  Copy,
  Clipboard,
  Search,
  X,
  FileText,
  Download,
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
} from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';
import { ChatMessage } from '../types';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ImagePreviewModal } from '../components/chat/ImagePreviewModal';

export const ChatPage: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();

  const {
    profile,
    devices,
    getConversationMessages,
    sendMessage,
    sendTyping,
    typingMap,
    markConversationRead,
    deleteMessage,
    clearConversation,
    sendFile,
    shareClipboard,
    settings,
    addToast,
  } = useLocalLink();

  const { isDark } = useTheme();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Image preview state
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; size?: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const targetDevice = devices.find((d) => d.deviceId === deviceId);
  const peerName = targetDevice?.deviceName || 'Peer Device';
  const isOnline = targetDevice?.isOnline ?? false;
  const isPeerTyping = !!deviceId && !!typingMap[deviceId];

  // Load conversation messages from IndexedDB
  const loadMessages = async () => {
    if (!deviceId) return;
    const msgs = await getConversationMessages(deviceId);
    setMessages(msgs);
  };

  useEffect(() => {
    loadMessages();
    if (deviceId) {
      markConversationRead(deviceId);
    }
  }, [deviceId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPeerTyping]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!deviceId) return;

    if (!isTypingLocal) {
      setIsTypingLocal(true);
      sendTyping(deviceId, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingLocal(false);
      sendTyping(deviceId, false);
    }, 1500);
  };

  // Send text message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !deviceId) return;

    const text = inputText.trim();
    setInputText('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTypingLocal(false);
    sendTyping(deviceId, false);

    const sent = await sendMessage(deviceId, text);
    if (sent) {
      setMessages((prev) => [...prev, sent]);
    }
  };

  // Handle Image Upload & Preview in Chat
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !deviceId) return;

    if (!file.type.startsWith('image/')) {
      addToast({ title: 'Invalid File', message: 'Please select an image file.', type: 'warning' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const sent = await sendMessage(deviceId, '', {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
      });
      if (sent) {
        setMessages((prev) => [...prev, sent]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Generic File Attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !deviceId) return;

    await sendFile(deviceId, file);
    addToast({
      title: 'File Queued',
      message: `Sending "${file.name}" to ${peerName}`,
      type: 'info',
    });
    navigate('/transfers');
    e.target.value = '';
  };

  // Copy message text
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({ title: 'Copied', message: 'Message copied to clipboard.', type: 'info' });
  };

  // Share clipboard snippet directly
  const handleShareClipboard = () => {
    if (!deviceId) return;
    if (!settings.allowClipboardSharing) {
      addToast({
        title: 'Clipboard Sharing Disabled',
        message: 'Enable clipboard sharing in Settings > Privacy first.',
        type: 'warning',
      });
      return;
    }

    navigator.clipboard.readText().then(
      (clipText) => {
        if (!clipText) {
          addToast({ title: 'Empty Clipboard', message: 'No text found in clipboard.', type: 'warning' });
          return;
        }
        shareClipboard(deviceId, clipText);
      },
      () => {
        addToast({ title: 'Clipboard Permission', message: 'Browser denied clipboard access.', type: 'error' });
      }
    );
  };

  const filteredMessages = messages.filter((m) =>
    searchQuery ? m.text.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const getStatusIcon = (status: ChatMessage['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-neutral-400 animate-pulse" />;
      case 'sent':
        return <Check className="w-3 h-3 text-neutral-400" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-neutral-400" />;
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-rose-500" />;
      default:
        return null;
    }
  };

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

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] md:h-[calc(100vh-73px)] max-w-4xl mx-auto">
      {/* CHAT TOP HEADER */}
      <div className={`flex items-center justify-between px-4 sm:px-6 py-3 border-b shrink-0 ${
        isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/chats')}
            className="p-1.5 -ml-1 text-neutral-400 hover:text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-emerald-400 shrink-0">
            {getDeviceIcon(targetDevice?.deviceType)}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-inherit truncate max-w-[200px] sm:max-w-xs">
                {peerName}
              </h2>
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-neutral-500'}`} />
              <span className={isOnline ? 'text-emerald-500 font-medium' : 'text-neutral-500'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {targetDevice?.ip && (
                <>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-400 font-mono tabular-nums">{targetDevice.ip}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg text-neutral-400 hover:text-white transition-colors ${
              showSearch ? 'bg-neutral-800 text-white' : ''
            }`}
            title="Search messages"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={handleShareClipboard}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Send clipboard text"
          >
            <Clipboard className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                className={`absolute right-0 mt-2 w-48 rounded-xl border shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 ${
                  isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                }`}
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-neutral-300 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Send File</span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowClearConfirm(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-rose-400 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Conversation</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH BAR (COLLAPSIBLE) */}
      {showSearch && (
        <div className={`p-2 border-b flex items-center gap-2 shrink-0 ${
          isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
        }`}>
          <Search className="w-4 h-4 text-neutral-400 ml-2" />
          <input
            type="text"
            placeholder="Search this conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-inherit outline-none"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 text-neutral-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* MESSAGE STREAM */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800/60 border border-neutral-700/80 flex items-center justify-center text-neutral-400 mb-3">
              <Laptop className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-xs font-semibold text-neutral-300">Direct LAN Chat with {peerName}</p>
            <p className="text-[11px] text-neutral-500 mt-1 max-w-xs">
              Messages and files travel instantly across your local Wi-Fi network without leaving your premises.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === profile.deviceId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`relative max-w-[85%] sm:max-w-md rounded-2xl p-3.5 text-xs shadow-sm transition-all ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-xs'
                      : isDark
                      ? 'bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-bl-xs'
                      : 'bg-white border border-neutral-200 text-neutral-900 rounded-bl-xs'
                  }`}
                >
                  {/* Image Attachment Preview */}
                  {msg.fileAttachment?.dataUrl && (
                    <div
                      className="mb-2 rounded-xl overflow-hidden cursor-pointer border border-black/10 max-h-60"
                      onClick={() =>
                        setPreviewImage({
                          url: msg.fileAttachment!.dataUrl!,
                          name: msg.fileAttachment!.name,
                          size: msg.fileAttachment!.size,
                        })
                      }
                    >
                      <img
                        src={msg.fileAttachment.dataUrl}
                        alt={msg.fileAttachment.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}

                  {/* Regular Text */}
                  {msg.text && (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                  )}

                  {/* File Metadata (non-image) */}
                  {msg.fileAttachment && !msg.fileAttachment.dataUrl && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-black/10 mt-1">
                      <FileText className="w-4 h-4 shrink-0" />
                      <div className="min-w-0 flex-1 text-[11px]">
                        <div className="truncate font-semibold">{msg.fileAttachment.name}</div>
                        <div className="opacity-75 font-mono tabular-nums">
                          {(msg.fileAttachment.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message Footer: Timestamp & Delivery Status */}
                  <div
                    className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] tabular-nums ${
                      isMe ? 'text-emerald-100/80' : 'text-neutral-400'
                    }`}
                  >
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && getStatusIcon(msg.status)}
                  </div>

                  {/* Hover Quick Actions */}
                  <div
                    className={`absolute top-0 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 shadow-lg ${
                      isMe ? 'right-2' : 'left-2'
                    }`}
                  >
                    {msg.text && (
                      <button
                        onClick={() => handleCopyMessage(msg.text)}
                        className="p-1 text-neutral-400 hover:text-white"
                        title="Copy message"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (deviceId) {
                          await deleteMessage(msg.id, deviceId);
                          setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                        }
                      }}
                      className="p-1 text-neutral-400 hover:text-rose-400"
                      title="Delete message"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Real-time Typing Indicator */}
        {isPeerTyping && (
          <div className="flex items-center gap-2 text-xs text-neutral-400 animate-pulse pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{peerName} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT BAR */}
      <div className={`p-3 sm:p-4 border-t shrink-0 ${
        isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Hidden Pickers */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Image Picker */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="p-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
            title="Attach image"
          >
            <Image className="w-5 h-5" />
          </button>

          {/* File Picker */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
            title="Send large file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={handleInputChange}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-colors ${
              isDark
                ? 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500'
                : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-emerald-500'
            }`}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Confirmation Dialog for Clearing Conversation */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Conversation"
        message="Are you sure you want to erase all messages in this conversation from your browser IndexedDB? This action is permanent."
        confirmLabel="Clear All"
        isDestructive={true}
        onConfirm={async () => {
          if (deviceId) {
            await clearConversation(deviceId);
            setMessages([]);
            setShowClearConfirm(false);
          }
        }}
        onCancel={() => setShowClearConfirm(false)}
      />

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={!!previewImage}
          imageUrl={previewImage.url}
          imageName={previewImage.name}
          fileSize={previewImage.size}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
};
