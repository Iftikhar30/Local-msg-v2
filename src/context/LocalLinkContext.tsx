import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  Device,
  ChatMessage,
  Conversation,
  FileTransfer,
  AppNotification,
  AppSettings,
  UserProfile,
  NetworkDiagnosticsData,
  DeviceType,
  ConnectModalTab,
} from '../types';
import { LocalDB } from '../services/db';
import { NetworkAPI } from '../services/network';
import { sound } from '../services/sound';
import { QRService } from '../services/qr';
import { WebRTCManager } from '../services/webrtc';

interface IncomingConnectionRequest {
  requestId: string;
  fromDeviceId: string;
  fromDeviceName: string;
  fromDeviceAvatar?: string;
  fromDeviceType: string;
  fromDeviceCode?: string;
  fromIp?: string;
  timestamp: number;
}

interface LocalLinkContextType {
  // Device & Profile
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  generateNewIdentity: () => void;
  generateNewDeviceCode: () => string;

  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Network & Connectivity
  networkInfo: NetworkDiagnosticsData | null;
  wsState: 'connecting' | 'connected' | 'disconnected';
  latencyMs: number;
  refreshNetwork: () => Promise<void>;
  scanDevices: () => Promise<void>;

  // Devices & Presence
  devices: Device[];
  trustedDeviceIds: string[];
  blockedDeviceIds: string[];
  connectionStates: Record<string, 'disconnected' | 'connecting' | 'connected' | 'requested'>;
  toggleTrustDevice: (deviceId: string) => Promise<void>;
  toggleBlockDevice: (deviceId: string) => Promise<void>;
  requestConnection: (targetDeviceId: string) => void;
  connectByCode: (code: string) => Promise<{ success: boolean; message?: string; device?: Device }>;
  connectByQr: (qrString: string) => Promise<{ success: boolean; message?: string; device?: Device }>;
  acceptConnection: (request: IncomingConnectionRequest) => void;
  rejectConnection: (request: IncomingConnectionRequest) => void;
  disconnectDevice: (targetDeviceId: string) => void;
  pendingConnectionRequest: IncomingConnectionRequest | null;
  dismissPendingRequest: () => void;

  // Connect Modal state
  isConnectModalOpen: boolean;
  connectModalTab: ConnectModalTab;
  openConnectModal: (tab?: ConnectModalTab) => void;
  closeConnectModal: () => void;

  // Local Server Connection Modal (Termux / PC / Vercel Bridge)
  isServerModalOpen: boolean;
  openServerModal: () => void;
  closeServerModal: () => void;
  customServiceUrl: string;
  setCustomServiceUrl: (url: string) => Promise<boolean>;

  // Chat
  conversations: Conversation[];
  getConversationMessages: (deviceId: string) => Promise<ChatMessage[]>;
  sendMessage: (receiverId: string, text: string, fileData?: { name: string; size: number; type: string; dataUrl?: string }) => Promise<ChatMessage | null>;
  sendTyping: (receiverId: string, isTyping: boolean) => void;
  typingMap: Record<string, boolean>; // deviceId -> boolean
  markConversationRead: (deviceId: string) => Promise<void>;
  deleteMessage: (messageId: string, conversationId: string) => Promise<void>;
  clearConversation: (deviceId: string) => Promise<void>;

  // File Transfers
  transfers: FileTransfer[];
  sendFile: (receiverId: string, file: File) => Promise<string | null>;
  cancelTransfer: (transferId: string) => Promise<void>;
  clearTransfersHistory: () => Promise<void>;

  // Clipboard
  shareClipboard: (receiverId: string, text: string) => Promise<boolean>;
  receivedClipboard: { senderName: string; text: string; timestamp: number } | null;
  clearReceivedClipboard: () => void;

  // Notifications
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  addToast: (toast: { title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }) => void;
  toasts: { id: string; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }[];
  removeToast: (id: string) => void;
}

const LocalLinkContext = createContext<LocalLinkContextType | undefined>(undefined);

const CHUNK_SIZE = 128 * 1024; // 128KB chunks for fast reliable transfer

function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'laptop';
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'phone';
  return 'laptop';
}

function detectDefaultDeviceName(): string {
  if (typeof window === 'undefined') return 'LocalLink Device';
  const ua = navigator.userAgent;
  let osName = 'Device';
  if (ua.includes('Win')) osName = 'Windows PC';
  else if (ua.includes('Mac')) osName = 'MacBook';
  else if (ua.includes('Android')) osName = 'Android Phone';
  else if (ua.includes('iPhone')) osName = 'iPhone';
  else if (ua.includes('iPad')) osName = 'iPad';
  else if (ua.includes('Linux')) osName = 'Linux Laptop';
  return osName;
}

export const LocalLinkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Profile State
  const [profile, setProfile] = useState<UserProfile>(() => {
    let savedId = localStorage.getItem('locallink_device_id');
    if (!savedId) {
      savedId = `device_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
      localStorage.setItem('locallink_device_id', savedId);
    }
    let savedCode = localStorage.getItem('locallink_device_code');
    if (!savedCode || !/^\d{4}$/.test(savedCode)) {
      savedCode = Math.floor(1000 + Math.random() * 9000).toString();
      localStorage.setItem('locallink_device_code', savedCode);
    }
    const savedName = localStorage.getItem('locallink_device_name') || detectDefaultDeviceName();
    const savedType = (localStorage.getItem('locallink_device_type') as DeviceType) || detectDeviceType();
    const savedAvatar = localStorage.getItem('locallink_device_avatar') || 'laptop';
    const savedDesc = localStorage.getItem('locallink_device_desc') || 'LocalLink user on LAN';

    return {
      deviceId: savedId,
      deviceName: savedName,
      deviceType: savedType,
      avatar: savedAvatar,
      deviceCode: savedCode,
      description: savedDesc,
      createdAt: Date.now(),
    };
  });

  // Modal State
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [connectModalTab, setConnectModalTab] = useState<ConnectModalTab>('code');

  const openConnectModal = useCallback((tab: ConnectModalTab = 'code') => {
    setConnectModalTab(tab);
    setIsConnectModalOpen(true);
  }, []);

  const closeConnectModal = useCallback(() => {
    setIsConnectModalOpen(false);
  }, []);

  // Server Connection Modal State (for PC / Termux / Vercel Bridge)
  const [isServerModalOpen, setIsServerModalOpen] = useState<boolean>(false);
  const [customServiceUrlState, setCustomServiceUrlState] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('locallink_custom_service_url') || '';
  });

  const openServerModal = useCallback(() => {
    setIsServerModalOpen(true);
  }, []);

  const closeServerModal = useCallback(() => {
    setIsServerModalOpen(false);
  }, []);

  // 2. Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('locallink_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      autoReconnect: true,
      allowDiscovery: true,
      allowConnectionRequests: true,
      allowMessages: true,
      allowFileTransfers: true,
      allowClipboardSharing: false,
      notifyMessages: true,
      notifyConnectionRequests: true,
      notifyTransfers: true,
      soundEnabled: true,
      theme: 'dark',
    };
  });

  // 3. Network & WebSocket State
  const [networkInfo, setNetworkInfo] = useState<NetworkDiagnosticsData | null>(null);
  const [wsState, setWsState] = useState<'connecting' | 'connected' | 'disconnected'>('connected');
  const [latencyMs, setLatencyMs] = useState<number>(1);
  const wsRef = useRef<WebSocket | null>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const pingStartRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 4. Devices & Connection State
  const [devices, setDevices] = useState<Device[]>([]);
  const [trustedDeviceIds, setTrustedDeviceIds] = useState<string[]>([]);
  const [blockedDeviceIds, setBlockedDeviceIds] = useState<string[]>([]);
  const [connectionStates, setConnectionStates] = useState<Record<string, 'disconnected' | 'connecting' | 'connected' | 'requested'>>({});
  const [pendingConnectionRequest, setPendingConnectionRequest] = useState<IncomingConnectionRequest | null>(null);

  // 5. Chat & Conversations State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});

  // 6. File Transfers State
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);

  // 7. Clipboard State
  const [receivedClipboard, setReceivedClipboard] = useState<{ senderName: string; text: string; timestamp: number } | null>(null);

  // 8. Notifications & Toasts
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }[]>([]);

  const addToast = useCallback((t: { title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast = { id, title: t.title, message: t.message, type: t.type || 'info' };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync sound settings with sound service
  useEffect(() => {
    sound.setSoundEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Load IndexedDB initial data
  useEffect(() => {
    async function loadInitialDb() {
      try {
        const [convs, trans, notifs, trusted, blocked] = await Promise.all([
          LocalDB.getConversations(),
          LocalDB.getTransfers(),
          LocalDB.getNotifications(),
          LocalDB.getTrustedDeviceIds(),
          LocalDB.getBlockedDeviceIds(),
        ]);
        setConversations(convs);
        setTransfers(trans);
        setNotifications(notifs);
        setTrustedDeviceIds(trusted);
        setBlockedDeviceIds(blocked);
      } catch (e) {
        console.error('Error initializing DB:', e);
      }
    }
    loadInitialDb();
  }, []);

  // Initialize WebRTC P2P DataChannel Mesh
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const webrtc = new WebRTCManager(profile, {
      onPeerConnected: (deviceId, peerInfo) => {
        setDevices((prev) => {
          const idx = prev.findIndex((d) => d.deviceId === deviceId);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...peerInfo, isOnline: true };
            return copy;
          }
          return [
            ...prev,
            {
              deviceId,
              deviceName: peerInfo.deviceName || 'Peer Device',
              deviceType: peerInfo.deviceType || 'laptop',
              deviceCode: peerInfo.deviceCode || '0000',
              os: 'Browser',
              ip: 'WebRTC P2P',
              port: 0,
              lastSeen: Date.now(),
              isOnline: true,
              version: '1.0.0',
            },
          ];
        });
        setConnectionStates((prev) => ({ ...prev, [deviceId]: 'connected' }));
        setWsState('connected');
        sound.playConnectionSound();
      },

      onPeerDisconnected: (deviceId) => {
        setDevices((prev) =>
          prev.map((d) => (d.deviceId === deviceId ? { ...d, isOnline: false } : d))
        );
        setConnectionStates((prev) => ({ ...prev, [deviceId]: 'disconnected' }));
      },

      onMessageReceived: async (msg) => {
        await LocalDB.saveMessage(msg);
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.deviceId === msg.conversationId || c.id === msg.conversationId);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = {
              ...copy[idx],
              lastMessage: msg.text || (msg.fileAttachment ? `📎 ${msg.fileAttachment.name}` : ''),
              lastTimestamp: msg.timestamp,
              unreadCount: copy[idx].unreadCount + 1,
            };
            return copy;
          }
          return [
            {
              id: msg.conversationId,
              deviceId: msg.conversationId,
              deviceName: msg.senderName,
              lastMessage: msg.text || '',
              lastTimestamp: msg.timestamp,
              unreadCount: 1,
            },
            ...prev,
          ];
        });
        sound.playMessageSound();
        addToast({
          title: `Message from ${msg.senderName}`,
          message: msg.text.length > 40 ? `${msg.text.substring(0, 40)}...` : msg.text,
          type: 'info',
        });
      },

      onTypingStatus: (deviceId, isTyping) => {
        setTypingMap((prev) => ({ ...prev, [deviceId]: isTyping }));
      },

      onFileTransferProgress: (progress) => {
        if (!progress.id) return;
        setTransfers((prev) => {
          const idx = prev.findIndex((t) => t.id === progress.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...progress } as FileTransfer;
            return copy;
          }
          return [progress as FileTransfer, ...prev];
        });
      },

      onFileTransferComplete: async (transfer, blob) => {
        await LocalDB.saveTransfer(transfer);
        setTransfers((prev) => {
          const idx = prev.findIndex((t) => t.id === transfer.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = transfer;
            return copy;
          }
          return [transfer, ...prev];
        });
        sound.playSuccessSound();
        addToast({
          title: 'File Received',
          message: `Received "${transfer.fileName}" (${Math.round(transfer.fileSize / 1024)} KB) via P2P.`,
          type: 'success',
        });
      },

      onClipboardReceived: (senderName, text) => {
        setReceivedClipboard({ senderName, text, timestamp: Date.now() });
        addToast({
          title: 'Clipboard Received',
          message: `Received text from ${senderName}`,
          type: 'info',
        });
      },

      onIncomingConnectionRequest: (fromDev) => {
        setPendingConnectionRequest({
          requestId: `req_${Date.now()}`,
          fromDeviceId: fromDev.deviceId,
          fromDeviceName: fromDev.deviceName,
          fromDeviceCode: fromDev.deviceCode,
          fromDeviceType: fromDev.deviceType || 'laptop',
          timestamp: Date.now(),
        });
        sound.playConnectionSound();
      },

      onConnectionResponse: (fromDeviceId, accepted) => {
        setConnectionStates((prev) => ({
          ...prev,
          [fromDeviceId]: accepted ? 'connected' : 'disconnected',
        }));
        if (accepted) {
          sound.playSuccessSound();
          addToast({
            title: 'Connection Accepted',
            message: 'Direct WebRTC DataChannel connection is active.',
            type: 'success',
          });
        } else {
          addToast({
            title: 'Connection Declined',
            message: 'Peer declined connection.',
            type: 'warning',
          });
        }
      },

      onLatencyUpdate: (deviceId, rtt) => {
        setLatencyMs(rtt);
      },
    });

    webrtcRef.current = webrtc;
    if (webrtc.getIsSupported()) {
      setWsState('connected');
    }

    return () => {
      webrtc.destroy();
    };
  }, [profile, addToast]);

  // Fetch LAN Network Info
  const refreshNetwork = useCallback(async () => {
    const info = await NetworkAPI.getNetworkInfo();
    if (info) {
      setNetworkInfo({
        ...info,
        latencyMs,
        wsConnected: wsState === 'connected',
      });
    }
  }, [latencyMs, wsState]);

  useEffect(() => {
    refreshNetwork();
    const interval = setInterval(refreshNetwork, 10000);
    return () => clearInterval(interval);
  }, [refreshNetwork]);

  // Send message over WebSocket
  const sendWs = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  // Initialize and maintain WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
    }

    setWsState('connecting');

    // Determine target WebSocket URL (supports custom Local Server URL when on Vercel/LAN)
    let wsUrl = '';
    const customService = localStorage.getItem('locallink_custom_service_url');
    if (customService && customService.trim().length > 0) {
      const clean = customService.trim().replace(/\/+$/, '');
      const wsProto = clean.startsWith('https:') ? 'wss:' : 'ws:';
      const hostPart = clean.replace(/^https?:\/\//, '');
      wsUrl = `${wsProto}//${hostPart}/ws`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsState('connected');
        // Register current device profile
        socket.send(
          JSON.stringify({
            type: 'device:register',
            payload: {
              deviceId: profile.deviceId,
              deviceName: profile.deviceName,
              deviceType: profile.deviceType,
              os: profile.deviceType === 'phone' ? 'Mobile' : 'Desktop',
              avatar: profile.avatar,
              deviceCode: profile.deviceCode,
            },
          })
        );

        // Ping for latency
        pingStartRef.current = performance.now();
        socket.send(JSON.stringify({ type: 'ping', payload: {} }));
      };

      socket.onmessage = async (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);

          switch (type) {
            case 'pong': {
              const roundtrip = Math.round(performance.now() - pingStartRef.current);
              setLatencyMs(Math.max(1, roundtrip));
              break;
            }

            case 'devices:update': {
              const updatedDevices = (payload.devices || []).map((d: any) => ({
                ...d,
                isTrusted: trustedDeviceIds.includes(d.deviceId),
                isBlocked: blockedDeviceIds.includes(d.deviceId),
              }));
              setDevices(updatedDevices);
              break;
            }

            case 'connection:request': {
              // Check privacy settings
              if (!settings.allowConnectionRequests) {
                // Auto-reject if disabled
                sendWs('connection:response', {
                  requestId: payload.requestId,
                  fromDeviceId: profile.deviceId,
                  toDeviceId: payload.fromDeviceId,
                  accepted: false,
                  reason: 'Device is not accepting connection requests.',
                });
                return;
              }

              // Check if device is blocked
              if (blockedDeviceIds.includes(payload.fromDeviceId)) {
                sendWs('connection:response', {
                  requestId: payload.requestId,
                  fromDeviceId: profile.deviceId,
                  toDeviceId: payload.fromDeviceId,
                  accepted: false,
                  reason: 'Blocked',
                });
                return;
              }

              // Check if already trusted -> auto accept!
              if (trustedDeviceIds.includes(payload.fromDeviceId)) {
                sendWs('connection:response', {
                  requestId: payload.requestId,
                  fromDeviceId: profile.deviceId,
                  toDeviceId: payload.fromDeviceId,
                  accepted: true,
                });
                setConnectionStates((prev) => ({ ...prev, [payload.fromDeviceId]: 'connected' }));
                addToast({
                  title: 'Connected',
                  message: `Reconnected automatically with trusted device ${payload.fromDeviceName}.`,
                  type: 'success',
                });
                return;
              }

              // Show incoming connection modal / notification
              setPendingConnectionRequest(payload);
              if (settings.notifyConnectionRequests) {
                sound.playConnectionSound();
              }

              const notif: AppNotification = {
                id: `notif_${Date.now()}`,
                type: 'connection_request',
                title: 'Connection Request',
                description: `${payload.fromDeviceName} wants to connect with your device.`,
                timestamp: Date.now(),
                read: false,
                data: payload,
              };
              LocalDB.saveNotification(notif);
              setNotifications((prev) => [notif, ...prev]);
              break;
            }

            case 'connection:response': {
              const { fromDeviceId, accepted, reason } = payload;
              if (accepted) {
                setConnectionStates((prev) => ({ ...prev, [fromDeviceId]: 'connected' }));
                sound.playSuccessSound();
                addToast({
                  title: 'Connection Accepted',
                  message: `You are now securely connected on LAN.`,
                  type: 'success',
                });

                const notif: AppNotification = {
                  id: `notif_${Date.now()}`,
                  type: 'device_connected',
                  title: 'Device Connected',
                  description: `Connection established. You can now chat and send files.`,
                  timestamp: Date.now(),
                  read: false,
                };
                LocalDB.saveNotification(notif);
                setNotifications((prev) => [notif, ...prev]);
              } else {
                setConnectionStates((prev) => ({ ...prev, [fromDeviceId]: 'disconnected' }));
                addToast({
                  title: 'Connection Declined',
                  message: reason || 'The device declined your connection request.',
                  type: 'warning',
                });
              }
              break;
            }

            case 'connection:disconnected': {
              const { fromDeviceId } = payload;
              setConnectionStates((prev) => ({ ...prev, [fromDeviceId]: 'disconnected' }));
              addToast({
                title: 'Device Disconnected',
                message: `Peer closed the local connection.`,
                type: 'info',
              });
              break;
            }

            case 'connection:error': {
              const { toDeviceId, message } = payload;
              setConnectionStates((prev) => ({ ...prev, [toDeviceId]: 'disconnected' }));
              addToast({
                title: 'Connection Error',
                message: message || 'Unable to establish connection.',
                type: 'error',
              });
              break;
            }

            case 'chat:message': {
              if (!settings.allowMessages || blockedDeviceIds.includes(payload.senderId)) {
                return;
              }

              const msg: ChatMessage = {
                id: payload.id,
                conversationId: payload.senderId,
                senderId: payload.senderId,
                senderName: payload.senderName || 'Peer',
                receiverId: profile.deviceId,
                text: payload.text,
                timestamp: payload.timestamp || Date.now(),
                status: 'delivered',
                fileAttachment: payload.fileAttachment,
              };

              await LocalDB.saveMessage(msg);

              // Update conversation
              const updatedConv: Conversation = {
                id: payload.senderId,
                deviceId: payload.senderId,
                deviceName: payload.senderName || 'Peer',
                lastMessage: payload.fileAttachment ? `[File] ${payload.fileAttachment.name}` : payload.text,
                lastTimestamp: msg.timestamp,
                unreadCount: 1,
              };
              await LocalDB.saveConversation(updatedConv);
              setConversations((prev) => {
                const rest = prev.filter((c) => c.deviceId !== payload.senderId);
                const existing = prev.find((c) => c.deviceId === payload.senderId);
                const unread = (existing?.unreadCount || 0) + 1;
                return [{ ...updatedConv, unreadCount: unread }, ...rest];
              });

              if (settings.notifyMessages) {
                sound.playMessageSound();
                addToast({
                  title: payload.senderName || 'New Message',
                  message: payload.text.length > 50 ? payload.text.substring(0, 50) + '...' : payload.text,
                  type: 'info',
                });
              }

              // Acknowledge read if currently viewed or delivered receipt
              sendWs('chat:receipt', {
                messageId: msg.id,
                conversationId: payload.senderId,
                senderId: payload.senderId,
                receiverId: profile.deviceId,
                status: 'delivered',
              });
              break;
            }

            case 'chat:typing': {
              const { senderId, isTyping } = payload;
              setTypingMap((prev) => ({ ...prev, [senderId]: isTyping }));
              break;
            }

            case 'chat:receipt': {
              const { messageId, status } = payload;
              await LocalDB.updateMessageStatus(messageId, status);
              break;
            }

            case 'clipboard:share': {
              if (!settings.allowClipboardSharing) {
                return;
              }
              const { senderName, text, timestamp } = payload;
              setReceivedClipboard({ senderName, text, timestamp });
              sound.playMessageSound();
              addToast({
                title: 'Clipboard Shared',
                message: `${senderName} sent you clipboard text: "${text.substring(0, 40)}..."`,
                type: 'info',
              });
              break;
            }

            case 'transfer:offer': {
              if (!settings.allowFileTransfers || blockedDeviceIds.includes(payload.senderId)) {
                sendWs('transfer:response', {
                  transferId: payload.transferId,
                  toDeviceId: payload.senderId,
                  accepted: false,
                  reason: 'Transfers not accepted.',
                });
                return;
              }

              // Record incoming transfer
              const newTransfer: FileTransfer = {
                id: payload.transferId,
                direction: 'received',
                deviceId: payload.senderId,
                deviceName: payload.senderName || 'Peer',
                fileName: payload.fileName,
                fileSize: payload.fileSize,
                fileType: payload.fileType,
                bytesTransferred: 0,
                totalChunks: payload.totalChunks,
                completedChunks: 0,
                speedBps: 0,
                etaSeconds: 0,
                status: 'transferring',
                timestamp: Date.now(),
              };

              await LocalDB.saveTransfer(newTransfer);
              setTransfers((prev) => [newTransfer, ...prev]);

              // Automatically accept valid incoming file transfer from connected peer
              sendWs('transfer:response', {
                transferId: payload.transferId,
                toDeviceId: payload.senderId,
                accepted: true,
              });

              if (settings.notifyTransfers) {
                addToast({
                  title: 'Incoming File',
                  message: `Receiving "${payload.fileName}" (${(payload.fileSize / 1024 / 1024).toFixed(1)} MB)`,
                  type: 'info',
                });
              }
              break;
            }

            case 'transfer:progress': {
              const { transferId, bytesTransferred, totalBytes, speedBps, etaSeconds } = payload;
              setTransfers((prev) =>
                prev.map((t) => {
                  if (t.id === transferId) {
                    return {
                      ...t,
                      bytesTransferred,
                      speedBps,
                      etaSeconds,
                      status: 'transferring',
                    };
                  }
                  return t;
                })
              );
              break;
            }

            case 'transfer:complete': {
              const { transferId, status, error, fileName } = payload;
              const downloadUrl = NetworkAPI.getDownloadUrl(transferId);

              setTransfers((prev) =>
                prev.map((t) => {
                  if (t.id === transferId) {
                    return {
                      ...t,
                      status: status || 'completed',
                      error,
                      bytesTransferred: t.fileSize,
                      downloadUrl,
                    };
                  }
                  return t;
                })
              );

              sound.playSuccessSound();
              addToast({
                title: 'Transfer Completed',
                message: `File transfer completed for "${fileName || 'file'}".`,
                type: 'success',
              });

              const notif: AppNotification = {
                id: `notif_${Date.now()}`,
                type: 'file_completed',
                title: 'File Transfer Complete',
                description: `Received "${fileName || 'file'}" successfully.`,
                timestamp: Date.now(),
                read: false,
                actionRoute: '/transfers',
              };
              LocalDB.saveNotification(notif);
              setNotifications((prev) => [notif, ...prev]);
              break;
            }

            case 'transfer:cancel': {
              const { transferId } = payload;
              setTransfers((prev) =>
                prev.map((t) => (t.id === transferId ? { ...t, status: 'cancelled' } : t))
              );
              addToast({
                title: 'Transfer Cancelled',
                message: `Peer cancelled the transfer.`,
                type: 'warning',
              });
              break;
            }
          }
        } catch (e) {
          console.error('[WS Parse Message Error]:', e);
        }
      };

      socket.onclose = () => {
        // If WebRTC is supported in browser, we remain in active P2P mesh state
        if (typeof window !== 'undefined' && 'RTCPeerConnection' in window) {
          setWsState('connected');
        } else {
          setWsState('disconnected');
        }
        // Auto-reconnect with 3-second delay
        if (settings.autoReconnect) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        }
      };

      socket.onerror = () => {
        if (typeof window !== 'undefined' && 'RTCPeerConnection' in window) {
          setWsState('connected');
        } else {
          setWsState('disconnected');
        }
      };
    } catch {
      if (typeof window !== 'undefined' && 'RTCPeerConnection' in window) {
        setWsState('connected');
      } else {
        setWsState('disconnected');
      }
    }
  }, [
    profile,
    settings,
    trustedDeviceIds,
    blockedDeviceIds,
    sendWs,
    addToast,
  ]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [connectWebSocket]);

  // Periodic ping for latency test
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        pingStartRef.current = performance.now();
        wsRef.current.send(JSON.stringify({ type: 'ping', payload: {} }));
      }
    }, 8000);
    return () => clearInterval(pingInterval);
  }, []);

  // Update profile
  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      if (updates.deviceName) localStorage.setItem('locallink_device_name', updates.deviceName);
      if (updates.deviceType) localStorage.setItem('locallink_device_type', updates.deviceType);
      if (updates.avatar) localStorage.setItem('locallink_device_avatar', updates.avatar);
      if (updates.description) localStorage.setItem('locallink_device_desc', updates.description);

      // Re-register to server
      sendWs('device:register', {
        deviceId: next.deviceId,
        deviceName: next.deviceName,
        deviceType: next.deviceType,
        os: next.deviceType === 'phone' ? 'Mobile' : 'Desktop',
        avatar: next.avatar,
      });

      return next;
    });
  };

  // Generate new identity
  const generateNewIdentity = () => {
    const newId = `device_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem('locallink_device_id', newId);
    setProfile((prev) => {
      const next = { ...prev, deviceId: newId };
      sendWs('device:register', {
        deviceId: newId,
        deviceName: next.deviceName,
        deviceType: next.deviceType,
        os: next.deviceType === 'phone' ? 'Mobile' : 'Desktop',
        avatar: next.avatar,
        deviceCode: next.deviceCode,
      });
      return next;
    });
    addToast({
      title: 'Identity Regenerated',
      message: 'A fresh, anonymous Device ID was generated locally.',
      type: 'success',
    });
  };

  // Generate new 4-digit code
  const generateNewDeviceCode = (): string => {
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    localStorage.setItem('locallink_device_code', newCode);
    setProfile((prev) => {
      const next = { ...prev, deviceCode: newCode };
      sendWs('device:register', {
        deviceId: next.deviceId,
        deviceName: next.deviceName,
        deviceType: next.deviceType,
        os: next.deviceType === 'phone' ? 'Mobile' : 'Desktop',
        avatar: next.avatar,
        deviceCode: newCode,
      });
      return next;
    });
    sound.playSuccessSound();
    addToast({
      title: 'New Code Generated',
      message: `Your new 4-digit connection code is #${newCode}.`,
      type: 'success',
    });
    return newCode;
  };

  // Update settings
  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('locallink_settings', JSON.stringify(next));
      return next;
    });
  };

  // Set Custom Server URL (for PC / Termux / Vercel Bridge)
  const setCustomServiceUrl = useCallback(
    async (url: string): Promise<boolean> => {
      const clean = url.trim().replace(/\/+$/, '');
      if (!clean) {
        localStorage.removeItem('locallink_custom_service_url');
        setCustomServiceUrlState('');
        connectWebSocket();
        refreshNetwork();
        return true;
      }

      try {
        const res = await fetch(`${clean}/api/network/info`, { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          localStorage.setItem('locallink_custom_service_url', clean);
          setCustomServiceUrlState(clean);
          connectWebSocket();
          refreshNetwork();
          return true;
        }
      } catch {
        // network probe error
      }

      // Save anyway and attempt WebSocket connection
      localStorage.setItem('locallink_custom_service_url', clean);
      setCustomServiceUrlState(clean);
      connectWebSocket();
      refreshNetwork();
      return false;
    },
    [connectWebSocket, refreshNetwork]
  );

  // Device Discovery trigger
  const scanDevices = async () => {
    await NetworkAPI.triggerLanScan();
    sendWs('devices:get', {});
    addToast({
      title: 'Scanning LAN',
      message: 'Broadcasting discovery beacon across local network...',
      type: 'info',
    });
  };

  // Trust / Block devices
  const toggleTrustDevice = async (deviceId: string) => {
    const isCurrentlyTrusted = trustedDeviceIds.includes(deviceId);
    await LocalDB.setDeviceTrusted(deviceId, !isCurrentlyTrusted);
    setTrustedDeviceIds((prev) =>
      !isCurrentlyTrusted ? [...prev, deviceId] : prev.filter((id) => id !== deviceId)
    );
    addToast({
      title: !isCurrentlyTrusted ? 'Device Trusted' : 'Trust Removed',
      message: !isCurrentlyTrusted
        ? 'Future connections with this device will connect automatically.'
        : 'Device will require approval for new connections.',
      type: 'info',
    });
  };

  const toggleBlockDevice = async (deviceId: string) => {
    const isCurrentlyBlocked = blockedDeviceIds.includes(deviceId);
    await LocalDB.setDeviceBlocked(deviceId, !isCurrentlyBlocked);
    setBlockedDeviceIds((prev) =>
      !isCurrentlyBlocked ? [...prev, deviceId] : prev.filter((id) => id !== deviceId)
    );
    if (!isCurrentlyBlocked) {
      setConnectionStates((prev) => ({ ...prev, [deviceId]: 'disconnected' }));
    }
    addToast({
      title: !isCurrentlyBlocked ? 'Device Blocked' : 'Device Unblocked',
      message: !isCurrentlyBlocked
        ? 'All messages, connection requests and transfers from this device will be rejected.'
        : 'Device unblocked.',
      type: 'warning',
    });
  };

  // Connection handling
  const requestConnection = (targetDeviceId: string) => {
    setConnectionStates((prev) => ({ ...prev, [targetDeviceId]: 'requested' }));

    // 1. Send via WebRTC P2P mesh
    webrtcRef.current?.requestConnectByDeviceId(targetDeviceId);

    // 2. Fallback via WebSocket if connected
    sendWs('connection:request', {
      toDeviceId: targetDeviceId,
      requestId: `req_${Date.now()}`,
      fromDeviceId: profile.deviceId,
      fromDeviceName: profile.deviceName,
      fromDeviceAvatar: profile.avatar,
      fromDeviceType: profile.deviceType,
      fromDeviceCode: profile.deviceCode,
    });

    addToast({
      title: 'Connection Requested',
      message: 'Requesting P2P connection...',
      type: 'info',
    });
  };

  const connectByCode = async (
    code: string
  ): Promise<{ success: boolean; message?: string; device?: Device }> => {
    const cleanCode = code.trim();
    if (cleanCode.length !== 4) {
      return { success: false, message: 'Code must be exactly 4 digits.' };
    }
    if (cleanCode === profile.deviceCode) {
      return { success: false, message: 'This is your own device code.' };
    }

    // 1. Broadcast WebRTC connection request for this code
    webrtcRef.current?.requestConnectByCode(cleanCode);

    // 2. Check in currently known devices state
    const foundDev = devices.find((d) => d.deviceCode === cleanCode && !d.isSelf);
    if (foundDev) {
      requestConnection(foundDev.deviceId);
      return { success: true, device: foundDev };
    }

    // 3. Fallback: send WebSocket connection:request_by_code
    sendWs('connection:request_by_code', {
      code: cleanCode,
      requestId: `req_${Date.now()}`,
      fromDeviceId: profile.deviceId,
      fromDeviceName: profile.deviceName,
      fromDeviceAvatar: profile.avatar,
      fromDeviceType: profile.deviceType,
      fromDeviceCode: profile.deviceCode,
    });

    addToast({
      title: 'Connecting by Code',
      message: `Searching LAN for device #${cleanCode}...`,
      type: 'info',
    });

    return { success: true };
  };

  const connectByQr = async (
    qrString: string
  ): Promise<{ success: boolean; message?: string; device?: Device }> => {
    const parsed = QRService.parseQrPayload(qrString);
    if (!parsed) {
      return { success: false, message: 'Invalid or unrecognized LocalLink QR code.' };
    }
    if (parsed.deviceId && parsed.deviceId === profile.deviceId) {
      return { success: false, message: 'Cannot connect to your own QR code.' };
    }
    if (parsed.deviceCode && parsed.deviceCode === profile.deviceCode) {
      return { success: false, message: 'Cannot connect to your own QR code.' };
    }

    if (parsed.deviceId) {
      requestConnection(parsed.deviceId);
      return { success: true };
    }
    if (parsed.deviceCode) {
      return await connectByCode(parsed.deviceCode);
    }
    return { success: false, message: 'No valid device ID or 4-digit code found in QR.' };
  };

  const acceptConnection = (req: IncomingConnectionRequest) => {
    // 1. Respond via WebRTC
    webrtcRef.current?.respondToConnectionRequest(req.fromDeviceId, true);

    // 2. Respond via WebSocket
    sendWs('connection:response', {
      requestId: req.requestId,
      fromDeviceId: profile.deviceId,
      toDeviceId: req.fromDeviceId,
      accepted: true,
    });

    setConnectionStates((prev) => ({ ...prev, [req.fromDeviceId]: 'connected' }));
    setPendingConnectionRequest(null);
    sound.playSuccessSound();
    addToast({
      title: 'Connection Established',
      message: `You are connected with ${req.fromDeviceName} via WebRTC.`,
      type: 'success',
    });
  };

  const rejectConnection = (req: IncomingConnectionRequest) => {
    webrtcRef.current?.respondToConnectionRequest(req.fromDeviceId, false);
    sendWs('connection:response', {
      requestId: req.requestId,
      fromDeviceId: profile.deviceId,
      toDeviceId: req.fromDeviceId,
      accepted: false,
      reason: 'User declined connection.',
    });
    setPendingConnectionRequest(null);
  };

  const dismissPendingRequest = () => {
    setPendingConnectionRequest(null);
  };

  const disconnectDevice = (targetDeviceId: string) => {
    webrtcRef.current?.disconnect(targetDeviceId);
    sendWs('connection:disconnect', {
      targetDeviceId,
      fromDeviceId: profile.deviceId,
    });
    setConnectionStates((prev) => ({ ...prev, [targetDeviceId]: 'disconnected' }));
    addToast({
      title: 'Disconnected',
      message: 'Connection closed.',
      type: 'info',
    });
  };

  // Chat Actions
  const getConversationMessages = async (deviceId: string): Promise<ChatMessage[]> => {
    return LocalDB.getMessages(deviceId);
  };

  const sendMessage = async (
    receiverId: string,
    text: string,
    fileData?: { name: string; size: number; type: string; dataUrl?: string }
  ): Promise<ChatMessage | null> => {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const msg: ChatMessage = {
      id: msgId,
      conversationId: receiverId,
      senderId: profile.deviceId,
      senderName: profile.deviceName,
      receiverId,
      text,
      timestamp: Date.now(),
      status: 'sending',
      fileAttachment: fileData
        ? {
            fileId: `file_${Date.now()}`,
            name: fileData.name,
            size: fileData.size,
            type: fileData.type,
            dataUrl: fileData.dataUrl,
          }
        : undefined,
    };

    // Save locally in IndexedDB
    await LocalDB.saveMessage(msg);

    // Update conversation in IndexedDB
    const targetDev = devices.find((d) => d.deviceId === receiverId);
    const updatedConv: Conversation = {
      id: receiverId,
      deviceId: receiverId,
      deviceName: targetDev?.deviceName || 'Peer Device',
      lastMessage: fileData ? `[Image] ${fileData.name}` : text,
      lastTimestamp: msg.timestamp,
      unreadCount: 0,
    };
    await LocalDB.saveConversation(updatedConv);
    setConversations((prev) => {
      const rest = prev.filter((c) => c.deviceId !== receiverId);
      return [updatedConv, ...rest];
    });

    // 1. Send via WebRTC P2P DataChannel
    const sentP2P = webrtcRef.current?.sendMessage(receiverId, msg);

    // 2. Fallback to WebSocket if available and P2P not open
    if (!sentP2P) {
      sendWs('chat:message', {
        id: msg.id,
        conversationId: receiverId,
        senderId: profile.deviceId,
        senderName: profile.deviceName,
        receiverId,
        text,
        timestamp: msg.timestamp,
        fileAttachment: msg.fileAttachment,
      });
    }

    return msg;
  };

  const sendTyping = (receiverId: string, isTyping: boolean) => {
    webrtcRef.current?.sendTyping(receiverId, isTyping);
    sendWs('chat:typing', {
      senderId: profile.deviceId,
      receiverId,
      isTyping,
    });
  };

  const markConversationRead = async (deviceId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.deviceId === deviceId ? { ...c, unreadCount: 0 } : c))
    );
  };

  const deleteMessage = async (messageId: string, conversationId: string) => {
    await LocalDB.deleteMessage(messageId);
    const msgs = await LocalDB.getMessages(conversationId);
    const last = msgs[msgs.length - 1];
    if (last) {
      const conv = conversations.find((c) => c.deviceId === conversationId);
      if (conv) {
        const updated = {
          ...conv,
          lastMessage: last.text || '[File]',
          lastTimestamp: last.timestamp,
        };
        await LocalDB.saveConversation(updated);
        setConversations((prev) => prev.map((c) => (c.deviceId === conversationId ? updated : c)));
      }
    }
  };

  const clearConversation = async (deviceId: string) => {
    await LocalDB.deleteConversation(deviceId);
    setConversations((prev) => prev.filter((c) => c.deviceId !== deviceId));
    addToast({
      title: 'Conversation Cleared',
      message: 'All local messages for this conversation were deleted.',
      type: 'info',
    });
  };

  // High-Speed Direct WebRTC File Transfer Implementation (Chunked binary streaming with backpressure)
  const sendFile = async (receiverId: string, file: File): Promise<string | null> => {
    const transferId = `trans_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    const targetDev = devices.find((d) => d.deviceId === receiverId);

    const newTransfer: FileTransfer = {
      id: transferId,
      direction: 'sent',
      deviceId: receiverId,
      deviceName: targetDev?.deviceName || 'Peer Device',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      bytesTransferred: 0,
      totalChunks,
      completedChunks: 0,
      speedBps: 0,
      etaSeconds: 0,
      status: 'transferring',
      timestamp: Date.now(),
    };

    await LocalDB.saveTransfer(newTransfer);
    setTransfers((prev) => [newTransfer, ...prev]);

    try {
      // 1. Send directly via WebRTC DataChannel streaming with backpressure
      if (webrtcRef.current) {
        await webrtcRef.current.sendFile(receiverId, file, transferId, (progress) => {
          setTransfers((prev) =>
            prev.map((t) => (t.id === transferId ? { ...t, ...progress } : t))
          );
        });

        newTransfer.status = 'completed';
        newTransfer.bytesTransferred = file.size;
        newTransfer.completedChunks = totalChunks;
        await LocalDB.saveTransfer(newTransfer);
        setTransfers((prev) => prev.map((t) => (t.id === transferId ? newTransfer : t)));
        sound.playSuccessSound();
        addToast({
          title: 'Transfer Completed',
          message: `Sent "${file.name}" successfully via direct WebRTC.`,
          type: 'success',
        });
        return transferId;
      }
    } catch (err: any) {
      console.warn('[P2P] WebRTC sendFile fallback:', err);
    }

    // Fallback: Optional Local Node server upload if configured
    sendWs('transfer:offer', {
      transferId,
      senderId: profile.deviceId,
      senderName: profile.deviceName,
      receiverId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks,
      timestamp: Date.now(),
    });

    return transferId;
  };

  const cancelTransfer = async (transferId: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, status: 'cancelled' } : t))
    );
    await LocalDB.saveTransfer({
      id: transferId,
      status: 'cancelled',
    } as any);
  };

  const clearTransfersHistory = async () => {
    await LocalDB.clearTransfers();
    setTransfers([]);
    addToast({
      title: 'Transfers Cleared',
      message: 'Transfer history removed.',
      type: 'info',
    });
  };

  // Clipboard Sharing
  const shareClipboard = async (receiverId: string, text: string): Promise<boolean> => {
    if (!settings.allowClipboardSharing) {
      addToast({
        title: 'Clipboard Sharing Disabled',
        message: 'Enable clipboard sharing in Settings > Privacy first.',
        type: 'warning',
      });
      return false;
    }

    const sentP2P = webrtcRef.current?.shareClipboard(receiverId, text);
    if (!sentP2P) {
      sendWs('clipboard:share', {
        id: `clip_${Date.now()}`,
        senderId: profile.deviceId,
        senderName: profile.deviceName,
        receiverId,
        text,
        timestamp: Date.now(),
      });
    }

    addToast({
      title: 'Clipboard Shared',
      message: 'Text sent to peer device.',
      type: 'success',
    });
    return true;
  };

  const clearReceivedClipboard = () => {
    setReceivedClipboard(null);
  };

  // Notification actions
  const markNotificationRead = async (id: string) => {
    await LocalDB.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = async () => {
    await LocalDB.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = async () => {
    await LocalDB.clearNotifications();
    setNotifications([]);
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <LocalLinkContext.Provider
      value={{
        profile,
        updateProfile,
        generateNewIdentity,
        generateNewDeviceCode,
        settings,
        updateSettings,
        networkInfo,
        wsState,
        latencyMs,
        refreshNetwork,
        scanDevices,
        devices,
        trustedDeviceIds,
        blockedDeviceIds,
        connectionStates,
        toggleTrustDevice,
        toggleBlockDevice,
        requestConnection,
        connectByCode,
        connectByQr,
        acceptConnection,
        rejectConnection,
        disconnectDevice,
        pendingConnectionRequest,
        dismissPendingRequest,
        isConnectModalOpen,
        connectModalTab,
        openConnectModal,
        closeConnectModal,
        isServerModalOpen,
        openServerModal,
        closeServerModal,
        customServiceUrl: customServiceUrlState,
        setCustomServiceUrl,
        conversations,
        getConversationMessages,
        sendMessage,
        sendTyping,
        typingMap,
        markConversationRead,
        deleteMessage,
        clearConversation,
        transfers,
        sendFile,
        cancelTransfer,
        clearTransfersHistory,
        shareClipboard,
        receivedClipboard,
        clearReceivedClipboard,
        notifications,
        unreadNotificationCount,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
        addToast,
        toasts,
        removeToast,
      }}
    >
      {children}
    </LocalLinkContext.Provider>
  );
};

export const useLocalLink = () => {
  const ctx = useContext(LocalLinkContext);
  if (!ctx) throw new Error('useLocalLink must be used within LocalLinkProvider');
  return ctx;
};
