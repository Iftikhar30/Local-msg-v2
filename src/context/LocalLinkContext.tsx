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
  MessageStatus,
  WebRTCDiagnostics,
  DeviceApprovalStatus,
  DeviceConnectionState,
} from '../types';
import { LocalDB } from '../services/db';
import { NetworkAPI } from '../services/network';
import { sound } from '../services/sound';
import { QRService } from '../services/qr';
import { WebRTCManager } from '../services/webrtc';

export interface IncomingConnectionRequest {
  requestId: string;
  fromDeviceId: string;
  fromDeviceName: string;
  fromDeviceAvatar?: string;
  fromDeviceType?: DeviceType;
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
  connectionStates: Record<string, DeviceConnectionState>;
  toggleTrustDevice: (deviceId: string) => Promise<void>;
  toggleBlockDevice: (deviceId: string) => Promise<void>;
  deleteSavedDevice: (deviceId: string) => Promise<void>;
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

  // Diagnostics
  getDiagnostics: () => WebRTCDiagnostics;

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

  // Server Connection Modal State
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
      allowClipboardSharing: true,
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
  const [connectionStates, setConnectionStates] = useState<Record<string, DeviceConnectionState>>({});
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
        const [savedDevices, convs, trans, notifs, trusted, blocked] = await Promise.all([
          LocalDB.getDevices(),
          LocalDB.getConversations(),
          LocalDB.getTransfers(),
          LocalDB.getNotifications(),
          LocalDB.getTrustedDeviceIds(),
          LocalDB.getBlockedDeviceIds(),
        ]);

        const initialConnectionStates: Record<string, DeviceConnectionState> = {};
        const formattedDevices = savedDevices.map((d) => {
          const isT = trusted.includes(d.deviceId);
          const isB = blocked.includes(d.deviceId);
          const cState = d.connectionState || 'disconnected';
          initialConnectionStates[d.deviceId] = cState;
          return {
            ...d,
            isTrusted: isT,
            isBlocked: isB,
            connectionState: cState,
          };
        });

        setDevices(formattedDevices);
        setConnectionStates(initialConnectionStates);
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

  // Initialize WebRTC P2P DataChannel Manager
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const webrtc = new WebRTCManager(profile, {
      onPeerDiscovered: (deviceId, peerInfo) => {
        setDevices((prev) => {
          const idx = prev.findIndex((d) => d.deviceId === deviceId);
          if (idx >= 0) {
            const existing = prev[idx];
            const updated: Device = {
              ...existing,
              ...peerInfo,
              lastSeen: Date.now(),
              isOnline: true,
            };
            LocalDB.saveDevice(updated);
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          }

          const newDevice: Device = {
            deviceId,
            deviceName: peerInfo.deviceName || 'Peer Device',
            deviceType: peerInfo.deviceType || 'laptop',
            deviceCode: peerInfo.deviceCode || '0000',
            os: peerInfo.os || 'Browser',
            ip: peerInfo.ip || 'WebRTC LAN',
            port: 0,
            lastSeen: Date.now(),
            isOnline: true,
            version: '1.0.0',
            status: 'pending',
            connectionState: 'discovered',
            addedAt: Date.now(),
          };
          LocalDB.saveDevice(newDevice);
          return [...prev, newDevice];
        });

        setConnectionStates((prev) => {
          // Keep current state if already connected or requested
          if (prev[deviceId] === 'connected' || prev[deviceId] === 'requested' || prev[deviceId] === 'connecting') {
            return prev;
          }
          return { ...prev, [deviceId]: 'discovered' };
        });
      },

      onPeerConnected: (deviceId, peerInfo) => {
        setDevices((prev) => {
          const idx = prev.findIndex((d) => d.deviceId === deviceId);
          if (idx >= 0) {
            const updated: Device = {
              ...prev[idx],
              ...peerInfo,
              status: 'accepted',
              connectionState: 'connected',
              isOnline: true,
              lastSeen: Date.now(),
            };
            LocalDB.saveDevice(updated);
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          }

          const newDev: Device = {
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
            status: 'accepted',
            connectionState: 'connected',
            addedAt: Date.now(),
          };
          LocalDB.saveDevice(newDev);
          return [...prev, newDev];
        });

        setConnectionStates((prev) => ({ ...prev, [deviceId]: 'connected' }));
        setWsState('connected');
        sound.playConnectionSound();

        addToast({
          title: 'Connected',
          message: `Connected with ${peerInfo.deviceName || 'Peer'} via WebRTC DataChannel.`,
          type: 'success',
        });
      },

      onPeerDisconnected: (deviceId) => {
        setDevices((prev) =>
          prev.map((d) => {
            if (d.deviceId === deviceId) {
              const updated = { ...d, connectionState: 'disconnected' as DeviceConnectionState };
              LocalDB.saveDevice(updated);
              return updated;
            }
            return d;
          })
        );
        setConnectionStates((prev) => ({ ...prev, [deviceId]: 'disconnected' }));
      },

      onIncomingConnectionRequest: (req) => {
        // Auto-check if blocked
        if (blockedDeviceIds.includes(req.fromDeviceId)) {
          webrtc.respondToConnectionRequest(req.fromDeviceId, false);
          return;
        }

        // Check if auto-accept for trusted device
        if (settings.autoReconnect && trustedDeviceIds.includes(req.fromDeviceId)) {
          webrtc.respondToConnectionRequest(req.fromDeviceId, true);
          setConnectionStates((prev) => ({ ...prev, [req.fromDeviceId]: 'connecting' }));
          return;
        }

        // Otherwise show modal prompt
        setPendingConnectionRequest({
          requestId: req.requestId,
          fromDeviceId: req.fromDeviceId,
          fromDeviceName: req.fromDeviceName,
          fromDeviceCode: req.fromDeviceCode,
          fromDeviceType: req.fromDeviceType || 'laptop',
          timestamp: Date.now(),
        });
        sound.playConnectionSound();
      },

      onConnectionResponse: (fromDeviceId, accepted) => {
        setConnectionStates((prev) => ({
          ...prev,
          [fromDeviceId]: accepted ? 'connecting' : 'disconnected',
        }));

        setDevices((prev) =>
          prev.map((d) => {
            if (d.deviceId === fromDeviceId) {
              const updated = {
                ...d,
                status: (accepted ? 'accepted' : 'rejected') as DeviceApprovalStatus,
                connectionState: (accepted ? 'connecting' : 'disconnected') as DeviceConnectionState,
              };
              LocalDB.saveDevice(updated);
              return updated;
            }
            return d;
          })
        );

        if (accepted) {
          addToast({
            title: 'Connection Accepted',
            message: 'Negotiating direct WebRTC DataChannel connection...',
            type: 'info',
          });
        } else {
          addToast({
            title: 'Connection Rejected',
            message: 'Target device rejected the connection request.',
            type: 'warning',
          });
        }
      },

      onMessageReceived: async (msg) => {
        // Check duplicate
        const exists = await LocalDB.hasMessage(msg.id);
        if (exists) return;

        await LocalDB.saveMessage(msg);

        // Update conversation
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.deviceId === msg.conversationId || c.id === msg.conversationId);
          if (idx >= 0) {
            const updated = {
              ...prev[idx],
              lastMessage: msg.text || (msg.fileAttachment ? `📎 ${msg.fileAttachment.name}` : ''),
              lastTimestamp: msg.timestamp,
              unreadCount: (prev[idx].unreadCount || 0) + 1,
            };
            LocalDB.saveConversation(updated);
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          }

          const newConv: Conversation = {
            id: msg.conversationId,
            deviceId: msg.conversationId,
            deviceName: msg.senderName,
            lastMessage: msg.text || (msg.fileAttachment ? `📎 ${msg.fileAttachment.name}` : ''),
            lastTimestamp: msg.timestamp,
            unreadCount: 1,
          };
          LocalDB.saveConversation(newConv);
          return [newConv, ...prev];
        });

        sound.playMessageSound();
        addToast({
          title: `Message from ${msg.senderName}`,
          message: msg.text.length > 50 ? `${msg.text.substring(0, 50)}...` : msg.text,
          type: 'info',
        });
      },

      onMessageStatusUpdate: async (messageId, status) => {
        await LocalDB.updateMessageStatus(messageId, status);
      },

      onConversationReadReceived: async (conversationId, lastTimestamp) => {
        await LocalDB.markConversationMessagesRead(conversationId);
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
          message: `Received "${transfer.fileName}" (${Math.round(transfer.fileSize / 1024)} KB) via WebRTC.`,
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

      onLatencyUpdate: (deviceId, rtt) => {
        setLatencyMs(rtt);
      },

      onSignalingStateChange: (connected) => {
        if (connected) {
          setWsState('connected');
        }
      },
    });

    webrtcRef.current = webrtc;
    if (webrtc.getIsSupported()) {
      setWsState('connected');
    }

    return () => {
      webrtc.destroy();
    };
  }, [profile, blockedDeviceIds, trustedDeviceIds, settings.autoReconnect, addToast]);

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
    const interval = setInterval(refreshNetwork, 12000);
    return () => clearInterval(interval);
  }, [refreshNetwork]);

  // Update profile
  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      if (updates.deviceName) localStorage.setItem('locallink_device_name', updates.deviceName);
      if (updates.deviceType) localStorage.setItem('locallink_device_type', updates.deviceType);
      if (updates.avatar) localStorage.setItem('locallink_device_avatar', updates.avatar);
      if (updates.description) localStorage.setItem('locallink_device_desc', updates.description);

      webrtcRef.current?.updateProfile(next);
      return next;
    });
  };

  // Generate new identity
  const generateNewIdentity = () => {
    const newId = `device_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem('locallink_device_id', newId);
    setProfile((prev) => {
      const next = { ...prev, deviceId: newId };
      webrtcRef.current?.updateProfile(next);
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
      webrtcRef.current?.updateProfile(next);
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

  // Set Custom Server URL
  const setCustomServiceUrl = useCallback(
    async (url: string): Promise<boolean> => {
      const clean = url.trim().replace(/\/+$/, '');
      if (!clean) {
        localStorage.removeItem('locallink_custom_service_url');
        setCustomServiceUrlState('');
        refreshNetwork();
        return true;
      }

      localStorage.setItem('locallink_custom_service_url', clean);
      setCustomServiceUrlState(clean);
      refreshNetwork();
      return true;
    },
    [refreshNetwork]
  );

  // Device Discovery trigger
  const scanDevices = async () => {
    webrtcRef.current?.broadcastPresence();
    addToast({
      title: 'Scanning LAN',
      message: 'Broadcasting discovery beacon across local network...',
      type: 'info',
    });
  };

  // Diagnostics summary for Settings -> Connection Diagnostics
  const getDiagnostics = useCallback((): WebRTCDiagnostics => {
    return {
      localDeviceId: profile.deviceId,
      localDeviceCode: profile.deviceCode,
      signalingConnected: webrtcRef.current?.getSignalingState() ?? true,
      connectedPeerCount: webrtcRef.current?.getConnectedPeerIds().length ?? 0,
      activePeers: webrtcRef.current?.getActivePeersDiagnostics() ?? [],
      lastMessageSent: webrtcRef.current?.lastMessageSent,
      lastMessageReceived: webrtcRef.current?.lastMessageReceived,
      lastAckReceived: webrtcRef.current?.lastAckReceived,
    };
  }, [profile.deviceId, profile.deviceCode]);

  // Trust / Block devices
  const toggleTrustDevice = async (deviceId: string) => {
    const isCurrentlyTrusted = trustedDeviceIds.includes(deviceId);
    await LocalDB.setDeviceTrusted(deviceId, !isCurrentlyTrusted);
    setTrustedDeviceIds((prev) =>
      !isCurrentlyTrusted ? [...prev, deviceId] : prev.filter((id) => id !== deviceId)
    );
    setDevices((prev) =>
      prev.map((d) => (d.deviceId === deviceId ? { ...d, isTrusted: !isCurrentlyTrusted } : d))
    );
    addToast({
      title: !isCurrentlyTrusted ? 'Device Trusted' : 'Trust Removed',
      message: !isCurrentlyTrusted
        ? 'Future connections from this device can connect automatically.'
        : 'Device will require approval for future connections.',
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
      webrtcRef.current?.disconnect(deviceId);
      setConnectionStates((prev) => ({ ...prev, [deviceId]: 'disconnected' }));
    }
    setDevices((prev) =>
      prev.map((d) =>
        d.deviceId === deviceId
          ? { ...d, isBlocked: !isCurrentlyBlocked, status: (!isCurrentlyBlocked ? 'blocked' : 'pending') as DeviceApprovalStatus }
          : d
      )
    );
    addToast({
      title: !isCurrentlyBlocked ? 'Device Blocked' : 'Device Unblocked',
      message: !isCurrentlyBlocked
        ? 'All messages and requests from this device will be rejected.'
        : 'Device unblocked.',
      type: 'warning',
    });
  };

  const deleteSavedDevice = async (deviceId: string) => {
    await LocalDB.deleteDevice(deviceId);
    webrtcRef.current?.disconnect(deviceId);
    setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
    setConnectionStates((prev) => {
      const copy = { ...prev };
      delete copy[deviceId];
      return copy;
    });
    addToast({ title: 'Device Removed', message: 'Device removed from local list.', type: 'info' });
  };

  // Connection Request Handling (DISCOVERED -> REQUESTED -> CONNECTED)
  const requestConnection = (targetDeviceId: string) => {
    setConnectionStates((prev) => ({ ...prev, [targetDeviceId]: 'requested' }));
    setDevices((prev) =>
      prev.map((d) =>
        d.deviceId === targetDeviceId
          ? { ...d, connectionState: 'requested', status: 'pending' }
          : d
      )
    );

    webrtcRef.current?.requestConnectByDeviceId(targetDeviceId);

    addToast({
      title: 'Connection Requested',
      message: 'Waiting for peer permission...',
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

    // 1. Send request by code
    await webrtcRef.current?.requestConnectByCode(cleanCode);

    // 2. Check if already known
    const foundDev = devices.find((d) => d.deviceCode === cleanCode && !d.isSelf);
    if (foundDev) {
      setConnectionStates((prev) => ({ ...prev, [foundDev.deviceId]: 'requested' }));
      return { success: true, device: foundDev };
    }

    addToast({
      title: 'Connecting by Code',
      message: `Searching LAN for device #${cleanCode}. Waiting for permission...`,
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
    webrtcRef.current?.respondToConnectionRequest(req.fromDeviceId, true);

    setConnectionStates((prev) => ({ ...prev, [req.fromDeviceId]: 'connecting' }));
    setDevices((prev) =>
      prev.map((d) =>
        d.deviceId === req.fromDeviceId
          ? { ...d, connectionState: 'connecting', status: 'accepted' }
          : d
      )
    );

    setPendingConnectionRequest(null);
    addToast({
      title: 'Request Accepted',
      message: `Connecting with ${req.fromDeviceName}...`,
      type: 'info',
    });
  };

  const rejectConnection = (req: IncomingConnectionRequest) => {
    webrtcRef.current?.respondToConnectionRequest(req.fromDeviceId, false);

    setConnectionStates((prev) => ({ ...prev, [req.fromDeviceId]: 'disconnected' }));
    setDevices((prev) =>
      prev.map((d) =>
        d.deviceId === req.fromDeviceId
          ? { ...d, connectionState: 'disconnected', status: 'rejected' }
          : d
      )
    );

    setPendingConnectionRequest(null);
    addToast({
      title: 'Connection Rejected',
      message: `Declined connection request from ${req.fromDeviceName}.`,
      type: 'info',
    });
  };

  const dismissPendingRequest = () => {
    setPendingConnectionRequest(null);
  };

  const disconnectDevice = (targetDeviceId: string) => {
    webrtcRef.current?.disconnect(targetDeviceId);
    setConnectionStates((prev) => ({ ...prev, [targetDeviceId]: 'disconnected' }));
    setDevices((prev) =>
      prev.map((d) =>
        d.deviceId === targetDeviceId
          ? { ...d, connectionState: 'disconnected' }
          : d
      )
    );
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
    // Check if connected
    const isConn = connectionStates[receiverId] === 'connected' || webrtcRef.current?.isPeerConnected(receiverId);
    if (!isConn) {
      addToast({
        title: 'Not Connected',
        message: 'Device is not connected. Please request connection first.',
        type: 'warning',
      });
      return null;
    }

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

    // 1. Save locally in IndexedDB
    await LocalDB.saveMessage(msg);

    // 2. Update conversation
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

    // 3. Send over WebRTC DataChannel
    const sent = webrtcRef.current?.sendMessage(receiverId, msg);
    if (sent) {
      msg.status = 'sent';
      await LocalDB.updateMessageStatus(msg.id, 'sent');
    } else {
      msg.status = 'failed';
      await LocalDB.updateMessageStatus(msg.id, 'failed');
    }

    return msg;
  };

  const sendTyping = (receiverId: string, isTyping: boolean) => {
    webrtcRef.current?.sendTyping(receiverId, isTyping);
  };

  const markConversationRead = async (deviceId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.deviceId === deviceId ? { ...c, unreadCount: 0 } : c))
    );
    await LocalDB.markConversationMessagesRead(deviceId);
    webrtcRef.current?.sendReadReceipt(deviceId, deviceId);
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

  // High-Speed Direct WebRTC File Transfer
  const sendFile = async (receiverId: string, file: File): Promise<string | null> => {
    const isConn = connectionStates[receiverId] === 'connected' || webrtcRef.current?.isPeerConnected(receiverId);
    if (!isConn) {
      addToast({
        title: 'Not Connected',
        message: 'Device is not connected. Connect first before sending files.',
        type: 'warning',
      });
      return null;
    }

    const transferId = `trans_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const totalChunks = Math.max(1, Math.ceil(file.size / (64 * 1024)));
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

    // Send in background
    webrtcRef.current
      ?.sendFile(receiverId, file, transferId, (progress) => {
        setTransfers((prev) =>
          prev.map((t) => (t.id === transferId ? ({ ...t, ...progress } as FileTransfer) : t))
        );
      })
      .then(() => {
        sound.playSuccessSound();
        addToast({
          title: 'Transfer Completed',
          message: `Sent "${file.name}" successfully.`,
          type: 'success',
        });
      })
      .catch((err) => {
        console.error('File send error:', err);
        setTransfers((prev) =>
          prev.map((t) => (t.id === transferId ? { ...t, status: 'failed', error: err.message } : t))
        );
        addToast({
          title: 'Transfer Failed',
          message: `Failed to send "${file.name}".`,
          type: 'error',
        });
      });

    return transferId;
  };

  const cancelTransfer = async (transferId: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, status: 'cancelled' } : t))
    );
  };

  const clearTransfersHistory = async () => {
    await LocalDB.clearTransfers();
    setTransfers([]);
    addToast({
      title: 'Transfers Cleared',
      message: 'Transfer history cleared.',
      type: 'info',
    });
  };

  // Clipboard Actions
  const shareClipboard = async (receiverId: string, text: string): Promise<boolean> => {
    if (!settings.allowClipboardSharing) {
      addToast({
        title: 'Clipboard Disabled',
        message: 'Enable clipboard sharing in Settings > Privacy first.',
        type: 'warning',
      });
      return false;
    }

    const sent = webrtcRef.current?.shareClipboard(receiverId, text);
    if (!sent) {
      addToast({
        title: 'Not Connected',
        message: 'Connect to peer to send clipboard text.',
        type: 'warning',
      });
      return false;
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
        deleteSavedDevice,
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
        getDiagnostics,
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
