export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'laptop' | 'phone' | 'tablet';
  os: string;
  ip: string;
  port: number;
  lastSeen: number;
  isOnline: boolean;
  avatar?: string;
  deviceCode?: string;
  version: string;
  isSelf?: boolean;
}

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  netmask: string;
  family: string;
  mac: string;
  internal: boolean;
  cidr: string | null;
}

export interface NetworkDiagnostics {
  localIp: string;
  hostname: string;
  platform: string;
  osRelease: string;
  interfaces: NetworkInterfaceInfo[];
  port: number;
  activeSockets: number;
  knownDevicesCount: number;
  uptimeSeconds: number;
  udpDiscoveryActive: boolean;
}

export interface ConnectionRequestPayload {
  requestId: string;
  fromDeviceId: string;
  fromDeviceName: string;
  fromDeviceAvatar?: string;
  fromDeviceType: string;
  fromIp?: string;
  toDeviceId: string;
  timestamp: number;
}

export interface ConnectionResponsePayload {
  requestId: string;
  fromDeviceId: string;
  toDeviceId: string;
  accepted: boolean;
  reason?: string;
}

export interface ChatMessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  fileAttachment?: {
    fileId: string;
    name: string;
    size: number;
    type: string;
    thumbnailUrl?: string;
  };
}

export interface TypingPayload {
  senderId: string;
  receiverId: string;
  isTyping: boolean;
}

export interface ReadReceiptPayload {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
}

export interface ClipboardSharePayload {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface TransferOfferPayload {
  transferId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  timestamp: number;
}

export interface TransferResponsePayload {
  transferId: string;
  accepted: boolean;
  reason?: string;
}

export interface TransferChunkPayload {
  transferId: string;
  chunkIndex: number;
  totalChunks: number;
  chunkData: string; // base64
  bytesInChunk: number;
}

export interface TransferProgressPayload {
  transferId: string;
  bytesTransferred: number;
  totalBytes: number;
  speedBps: number;
  etaSeconds: number;
  percent: number;
}
