export type DeviceType = 'desktop' | 'laptop' | 'phone' | 'tablet';

export interface Device {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  os: string;
  ip: string;
  port: number;
  lastSeen: number;
  isOnline: boolean;
  avatar?: string;
  deviceCode?: string;
  version: string;
  isSelf?: boolean;
  isTrusted?: boolean;
  isBlocked?: boolean;
  connectionState?: 'disconnected' | 'connecting' | 'connected' | 'requested';
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
  id: string;
  conversationId: string; // The other device's deviceId
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: number;
  status: MessageStatus;
  fileAttachment?: {
    fileId: string;
    name: string;
    size: number;
    type: string;
    dataUrl?: string; // For images
  };
}

export interface Conversation {
  id: string; // Device ID of the peer
  deviceId: string;
  deviceName: string;
  deviceAvatar?: string;
  deviceType?: DeviceType;
  lastMessage: string;
  lastTimestamp: number;
  unreadCount: number;
}

export type TransferStatus = 'queued' | 'transferring' | 'completed' | 'cancelled' | 'failed';

export interface FileTransfer {
  id: string;
  direction: 'sent' | 'received';
  deviceId: string;
  deviceName: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  bytesTransferred: number;
  totalChunks: number;
  completedChunks: number;
  speedBps: number;
  etaSeconds: number;
  status: TransferStatus;
  timestamp: number;
  error?: string;
  downloadUrl?: string;
  blobData?: Blob;
}

export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'connection_rejected'
  | 'device_connected'
  | 'device_disconnected'
  | 'new_message'
  | 'file_offered'
  | 'file_received'
  | 'file_completed'
  | 'transfer_failed'
  | 'clipboard_received';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: number;
  read: boolean;
  actionRoute?: string;
  data?: any;
}

export interface UserProfile {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  avatar: string;
  deviceCode: string;
  description: string;
  createdAt: number;
}

export interface QrDevicePayload {
  type: 'locallink-device';
  deviceId: string;
  deviceName: string;
  deviceCode: string;
  deviceType?: DeviceType;
  ip?: string;
  port?: number;
  timestamp?: number;
}

export type ConnectModalTab = 'code' | 'qr-scan' | 'my-qr';

export interface AppSettings {
  autoReconnect: boolean;
  allowDiscovery: boolean;
  allowConnectionRequests: boolean;
  allowMessages: boolean;
  allowFileTransfers: boolean;
  allowClipboardSharing: boolean;
  notifyMessages: boolean;
  notifyConnectionRequests: boolean;
  notifyTransfers: boolean;
  soundEnabled: boolean;
  theme: 'dark' | 'light' | 'system';
}

export interface NetworkDiagnosticsData {
  localIp: string;
  hostname: string;
  platform: string;
  osRelease: string;
  interfaces: {
    name: string;
    address: string;
    netmask: string;
    family: string;
    mac: string;
    internal: boolean;
  }[];
  port: number;
  activeSockets: number;
  knownDevicesCount: number;
  uptimeSeconds: number;
  udpDiscoveryActive: boolean;
  latencyMs: number;
  wsConnected: boolean;
}
