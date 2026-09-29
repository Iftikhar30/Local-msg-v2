import { Device, ChatMessage, FileTransfer, DeviceType } from '../types';

export interface WebRTCPeerEvents {
  onPeerConnected: (deviceId: string, device: Partial<Device>) => void;
  onPeerDisconnected: (deviceId: string) => void;
  onMessageReceived: (message: ChatMessage) => void;
  onTypingStatus: (deviceId: string, isTyping: boolean) => void;
  onFileTransferProgress: (transfer: Partial<FileTransfer>) => void;
  onFileTransferComplete: (transfer: FileTransfer, blob: Blob) => void;
  onClipboardReceived: (senderName: string, text: string) => void;
  onIncomingConnectionRequest: (fromDevice: { deviceId: string; deviceName: string; deviceCode?: string; deviceType?: DeviceType }) => void;
  onConnectionResponse: (fromDeviceId: string, accepted: boolean) => void;
  onLatencyUpdate: (deviceId: string, latencyMs: number) => void;
  onSignalingStateChange?: (connected: boolean) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  { urls: ['stun:global.stun.twilio.com:3478'] },
];

const CHUNK_SIZE = 64 * 1024; // 64KB per chunk for optimal WebRTC throughput
const MAX_BUFFERED_AMOUNT = 512 * 1024; // 512KB backpressure threshold

interface PeerSession {
  deviceId: string;
  deviceInfo: Partial<Device>;
  pc: RTCPeerConnection;
  controlChannel?: RTCDataChannel;
  fileChannel?: RTCDataChannel;
  isConnected: boolean;
  activeTransfers: Map<string, {
    fileInfo: { id: string; name: string; size: number; type: string; totalChunks: number };
    chunks: ArrayBuffer[];
    bytesReceived: number;
    startTime: number;
  }>;
}

// ---------------------------------------------------------
// Lightweight Zero-Dependency MQTT 3.1.1 WebSocket Client
// ---------------------------------------------------------
class MqttSignalingClient {
  private ws: WebSocket | null = null;
  private urlIndex = 0;
  private urls = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://test.mosquitto.org:8081',
  ];
  private clientId: string;
  private subscriptions = new Set<string>();
  private onMessageCallback: (topic: string, payload: any) => void;
  private onStateCallback?: (connected: boolean) => void;
  private pingInterval: any = null;
  private isConnected = false;
  private packetIdCounter = 1;
  private isDestroyed = false;

  constructor(
    clientId: string,
    onMessage: (topic: string, payload: any) => void,
    onState?: (connected: boolean) => void
  ) {
    this.clientId = `ll_${clientId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18)}_${Math.random().toString(36).slice(2, 6)}`;
    this.onMessageCallback = onMessage;
    this.onStateCallback = onState;
    this.connect();
  }

  private connect() {
    if (this.isDestroyed || typeof window === 'undefined') return;

    const url = this.urls[this.urlIndex % this.urls.length];
    try {
      this.ws = new WebSocket(url, ['mqtt']);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.sendConnect();
      };

      this.ws.onmessage = (event) => {
        this.handlePacket(event.data);
      };

      this.ws.onerror = () => {
        this.handleDisconnect();
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };
    } catch {
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    if (this.isConnected) {
      this.isConnected = false;
      this.onStateCallback?.(false);
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (!this.isDestroyed) {
      this.urlIndex++;
      setTimeout(() => this.connect(), 4000);
    }
  }

  private encodeVariableLength(length: number): number[] {
    const bytes: number[] = [];
    do {
      let byte = length % 128;
      length = Math.floor(length / 128);
      if (length > 0) {
        byte |= 0x80;
      }
      bytes.push(byte);
    } while (length > 0);
    return bytes;
  }

  private sendConnect() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const encoder = new TextEncoder();
    const idBytes = encoder.encode(this.clientId);
    const protoBytes = encoder.encode('MQTT');

    // Variable header (10 bytes) + payload (2 + clientId.length)
    const varHeader = [
      0x00, 0x04, ...protoBytes, // Protocol Name
      0x04, // Protocol Level (MQTT 3.1.1)
      0x02, // Connect Flags (Clean Session)
      0x00, 0x3c, // Keep Alive (60s)
    ];

    const payload = [
      (idBytes.length >> 8) & 0xff,
      idBytes.length & 0xff,
      ...idBytes,
    ];

    const remainingLength = varHeader.length + payload.length;
    const lengthBytes = this.encodeVariableLength(remainingLength);
    const packet = new Uint8Array([0x10, ...lengthBytes, ...varHeader, ...payload]);

    this.ws.send(packet.buffer);
  }

  public subscribe(topic: string) {
    this.subscriptions.add(topic);
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const encoder = new TextEncoder();
    const topicBytes = encoder.encode(topic);
    const pid = this.packetIdCounter++;

    const payload = [
      (pid >> 8) & 0xff,
      pid & 0xff,
      (topicBytes.length >> 8) & 0xff,
      topicBytes.length & 0xff,
      ...topicBytes,
      0x00, // QoS 0
    ];

    const lengthBytes = this.encodeVariableLength(payload.length);
    const packet = new Uint8Array([0x82, ...lengthBytes, ...payload]);
    this.ws.send(packet.buffer);
  }

  public publish(topic: string, data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      const encoder = new TextEncoder();
      const topicBytes = encoder.encode(topic);
      const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
      const payloadBytes = encoder.encode(jsonStr);

      const varHeader = [
        (topicBytes.length >> 8) & 0xff,
        topicBytes.length & 0xff,
        ...topicBytes,
      ];

      const remainingLength = varHeader.length + payloadBytes.length;
      const lengthBytes = this.encodeVariableLength(remainingLength);
      const packet = new Uint8Array([0x30, ...lengthBytes, ...varHeader, ...payloadBytes]);

      this.ws.send(packet.buffer);
    } catch (e) {
      console.warn('[MQTT Publish Error]', e);
    }
  }

  private handlePacket(data: any) {
    if (!(data instanceof ArrayBuffer)) return;
    const view = new Uint8Array(data);
    if (view.length < 2) return;

    const packetType = (view[0] >> 4) & 0x0f;

    // CONNACK (Packet Type 2)
    if (packetType === 2) {
      this.isConnected = true;
      this.onStateCallback?.(true);

      // Resubscribe to all topics
      for (const topic of this.subscriptions) {
        this.subscribe(topic);
      }

      // Start ping heartbeat
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(new Uint8Array([0xc0, 0x00]).buffer); // PINGREQ
        }
      }, 25000);
    }

    // PUBLISH (Packet Type 3)
    if (packetType === 3) {
      let offset = 1;
      let multiplier = 1;
      let remainingLength = 0;
      let digit = 0;

      do {
        if (offset >= view.length) return;
        digit = view[offset++];
        remainingLength += (digit & 127) * multiplier;
        multiplier *= 128;
      } while ((digit & 128) !== 0);

      if (offset + 2 > view.length) return;
      const topicLen = (view[offset] << 8) | view[offset + 1];
      offset += 2;

      if (offset + topicLen > view.length) return;
      const decoder = new TextDecoder();
      const topic = decoder.decode(view.subarray(offset, offset + topicLen));
      offset += topicLen;

      const payloadRaw = decoder.decode(view.subarray(offset));
      try {
        const payloadJson = JSON.parse(payloadRaw);
        this.onMessageCallback(topic, payloadJson);
      } catch {
        // non-json message
      }
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      try {
        this.ws.send(new Uint8Array([0xe0, 0x00]).buffer); // DISCONNECT
        this.ws.close();
      } catch {
        // ignore
      }
    }
  }
}

// ---------------------------------------------------------
// Main WebRTC Peer Manager
// ---------------------------------------------------------
export class WebRTCManager {
  private localProfile: {
    deviceId: string;
    deviceName: string;
    deviceType: DeviceType;
    deviceCode: string;
    avatar: string;
  };
  private events: WebRTCPeerEvents;
  private peers: Map<string, PeerSession> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private mqttClient: MqttSignalingClient | null = null;
  private isSignalingConnected = false;
  private isSupported = false;

  constructor(
    localProfile: { deviceId: string; deviceName: string; deviceType: DeviceType; deviceCode: string; avatar: string },
    events: WebRTCPeerEvents
  ) {
    this.localProfile = localProfile;
    this.events = events;
    this.isSupported = typeof window !== 'undefined' && 'RTCPeerConnection' in window;

    this.initBroadcastChannel();
    this.initMqttSignaling();
  }

  public updateProfile(profile: { deviceId: string; deviceName: string; deviceType: DeviceType; deviceCode: string; avatar: string }) {
    this.localProfile = profile;
    this.broadcastPresence();
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public getConnectedPeerIds(): string[] {
    const list: string[] = [];
    this.peers.forEach((peer, id) => {
      if (peer.isConnected) list.push(id);
    });
    return list;
  }

  // 1. Same-device multi-tab / window communication
  private initBroadcastChannel() {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    try {
      this.broadcastChannel = new BroadcastChannel('locallink_p2p_mesh');
      this.broadcastChannel.onmessage = (event) => {
        this.handleSignalingMessage(event.data);
      };
      this.broadcastPresence();
    } catch (e) {
      console.warn('[WebRTC] BroadcastChannel init error:', e);
    }
  }

  // 2. Public Ephemeral Signaling Broker for distinct Wi-Fi / LAN Devices
  private initMqttSignaling() {
    if (typeof window === 'undefined') return;

    this.mqttClient = new MqttSignalingClient(
      this.localProfile.deviceId,
      (topic, payload) => {
        this.handleSignalingMessage(payload);
      },
      (connected) => {
        this.isSignalingConnected = connected;
        this.events.onSignalingStateChange?.(connected);
        if (connected) {
          this.subscribeTopics();
          this.broadcastPresence();
        }
      }
    );
  }

  private subscribeTopics() {
    if (!this.mqttClient) return;
    // 1. General presence for LAN discovery
    this.mqttClient.subscribe('locallink/v1/presence');
    // 2. Direct signaling by Device ID
    this.mqttClient.subscribe(`locallink/v1/peer/${this.localProfile.deviceId}`);
    // 3. Direct pairing by 4-digit Code
    this.mqttClient.subscribe(`locallink/v1/code/${this.localProfile.deviceCode}`);
  }

  public broadcastPresence() {
    const msg = {
      _locallink_signal: true,
      type: 'presence',
      fromDeviceId: this.localProfile.deviceId,
      fromDeviceName: this.localProfile.deviceName,
      fromDeviceType: this.localProfile.deviceType,
      fromDeviceCode: this.localProfile.deviceCode,
      avatar: this.localProfile.avatar,
      timestamp: Date.now(),
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch {
        // ignore
      }
    }

    if (this.mqttClient) {
      this.mqttClient.publish('locallink/v1/presence', msg);
    }
  }

  public async requestConnectByCode(targetCode: string): Promise<boolean> {
    const msg = {
      _locallink_signal: true,
      type: 'connect_request',
      toDeviceCode: targetCode,
      fromDeviceId: this.localProfile.deviceId,
      fromDeviceName: this.localProfile.deviceName,
      fromDeviceCode: this.localProfile.deviceCode,
      fromDeviceType: this.localProfile.deviceType,
      avatar: this.localProfile.avatar,
      timestamp: Date.now(),
    };

    // Broadcast across tabs
    this.broadcastChannel?.postMessage(msg);

    // Broadcast on MQTT topic for target 4-digit code
    this.mqttClient?.publish(`locallink/v1/code/${targetCode}`, msg);
    return true;
  }

  public async requestConnectByDeviceId(targetDeviceId: string): Promise<boolean> {
    const msg = {
      _locallink_signal: true,
      type: 'connect_request',
      toDeviceId: targetDeviceId,
      fromDeviceId: this.localProfile.deviceId,
      fromDeviceName: this.localProfile.deviceName,
      fromDeviceCode: this.localProfile.deviceCode,
      fromDeviceType: this.localProfile.deviceType,
      avatar: this.localProfile.avatar,
      timestamp: Date.now(),
    };

    this.broadcastChannel?.postMessage(msg);
    this.mqttClient?.publish(`locallink/v1/peer/${targetDeviceId}`, msg);
    return true;
  }

  public respondToConnectionRequest(targetDeviceId: string, accepted: boolean) {
    const msg = {
      _locallink_signal: true,
      type: 'connect_response',
      toDeviceId: targetDeviceId,
      fromDeviceId: this.localProfile.deviceId,
      fromDeviceName: this.localProfile.deviceName,
      fromDeviceCode: this.localProfile.deviceCode,
      fromDeviceType: this.localProfile.deviceType,
      accepted,
      timestamp: Date.now(),
    };

    this.broadcastChannel?.postMessage(msg);
    this.mqttClient?.publish(`locallink/v1/peer/${targetDeviceId}`, msg);

    if (accepted) {
      // Start WebRTC connection
      this.initiatePeerConnection(targetDeviceId, {
        deviceId: targetDeviceId,
      });
    }
  }

  // Handle incoming signaling messages
  public async handleSignalingMessage(data: any) {
    if (!data || !data._locallink_signal) return;
    if (data.fromDeviceId === this.localProfile.deviceId) return; // Ignore self

    const isForUs =
      !data.toDeviceId ||
      data.toDeviceId === this.localProfile.deviceId ||
      (data.toDeviceCode && data.toDeviceCode === this.localProfile.deviceCode);

    if (!isForUs) return;

    switch (data.type) {
      case 'presence': {
        this.events.onPeerConnected(data.fromDeviceId, {
          deviceId: data.fromDeviceId,
          deviceName: data.fromDeviceName,
          deviceType: data.fromDeviceType || 'laptop',
          deviceCode: data.fromDeviceCode,
          avatar: data.avatar || 'laptop',
          isOnline: true,
        });
        break;
      }

      case 'connect_request': {
        this.events.onIncomingConnectionRequest({
          deviceId: data.fromDeviceId,
          deviceName: data.fromDeviceName,
          deviceCode: data.fromDeviceCode,
          deviceType: data.fromDeviceType,
        });
        break;
      }

      case 'connect_response': {
        this.events.onConnectionResponse(data.fromDeviceId, data.accepted);
        break;
      }

      case 'webrtc_offer': {
        await this.handleOffer(data.fromDeviceId, data.offer, {
          deviceId: data.fromDeviceId,
          deviceName: data.fromDeviceName,
          deviceCode: data.fromDeviceCode,
        });
        break;
      }

      case 'webrtc_answer': {
        await this.handleAnswer(data.fromDeviceId, data.answer);
        break;
      }

      case 'webrtc_ice': {
        await this.handleIceCandidate(data.fromDeviceId, data.candidate);
        break;
      }
    }
  }

  // 3. WebRTC Peer Connection Life Cycle
  public async initiatePeerConnection(targetDeviceId: string, peerInfo: Partial<Device>): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    const session: PeerSession = {
      deviceId: targetDeviceId,
      deviceInfo: peerInfo,
      pc,
      isConnected: false,
      activeTransfers: new Map(),
    };

    const controlChannel = pc.createDataChannel('control', { ordered: true });
    const fileChannel = pc.createDataChannel('file', { ordered: true });
    fileChannel.binaryType = 'arraybuffer';

    session.controlChannel = controlChannel;
    session.fileChannel = fileChannel;
    this.peers.set(targetDeviceId, session);

    this.setupDataChannelEvents(targetDeviceId, controlChannel, fileChannel);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const iceMsg = {
          _locallink_signal: true,
          type: 'webrtc_ice',
          toDeviceId: targetDeviceId,
          fromDeviceId: this.localProfile.deviceId,
          candidate: event.candidate,
        };
        this.broadcastChannel?.postMessage(iceMsg);
        this.mqttClient?.publish(`locallink/v1/peer/${targetDeviceId}`, iceMsg);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        session.isConnected = true;
        this.events.onPeerConnected(targetDeviceId, peerInfo);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        session.isConnected = false;
        this.events.onPeerDisconnected(targetDeviceId);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const offerMsg = {
      _locallink_signal: true,
      type: 'webrtc_offer',
      toDeviceId: targetDeviceId,
      fromDeviceId: this.localProfile.deviceId,
      fromDeviceName: this.localProfile.deviceName,
      fromDeviceCode: this.localProfile.deviceCode,
      offer,
    };

    this.broadcastChannel?.postMessage(offerMsg);
    this.mqttClient?.publish(`locallink/v1/peer/${targetDeviceId}`, offerMsg);

    return pc;
  }

  private async handleOffer(fromDeviceId: string, offer: RTCSessionDescriptionInit, peerInfo: Partial<Device>) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const session: PeerSession = {
      deviceId: fromDeviceId,
      deviceInfo: peerInfo,
      pc,
      isConnected: false,
      activeTransfers: new Map(),
    };

    this.peers.set(fromDeviceId, session);

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      if (channel.label === 'control') {
        session.controlChannel = channel;
      } else if (channel.label === 'file') {
        channel.binaryType = 'arraybuffer';
        session.fileChannel = channel;
      }
      if (session.controlChannel && session.fileChannel) {
        this.setupDataChannelEvents(fromDeviceId, session.controlChannel, session.fileChannel);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const iceMsg = {
          _locallink_signal: true,
          type: 'webrtc_ice',
          toDeviceId: fromDeviceId,
          fromDeviceId: this.localProfile.deviceId,
          candidate: event.candidate,
        };
        this.broadcastChannel?.postMessage(iceMsg);
        this.mqttClient?.publish(`locallink/v1/peer/${fromDeviceId}`, iceMsg);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        session.isConnected = true;
        this.events.onPeerConnected(fromDeviceId, peerInfo);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        session.isConnected = false;
        this.events.onPeerDisconnected(fromDeviceId);
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const answerMsg = {
      _locallink_signal: true,
      type: 'webrtc_answer',
      toDeviceId: fromDeviceId,
      fromDeviceId: this.localProfile.deviceId,
      answer,
    };

    this.broadcastChannel?.postMessage(answerMsg);
    this.mqttClient?.publish(`locallink/v1/peer/${fromDeviceId}`, answerMsg);
  }

  private async handleAnswer(fromDeviceId: string, answer: RTCSessionDescriptionInit) {
    const session = this.peers.get(fromDeviceId);
    if (session && session.pc) {
      await session.pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  private async handleIceCandidate(fromDeviceId: string, candidate: RTCIceCandidateInit) {
    const session = this.peers.get(fromDeviceId);
    if (session && session.pc && session.pc.remoteDescription) {
      try {
        await session.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC] Add ICE candidate error:', err);
      }
    }
  }

  // 4. Data Channels: Real P2P Chat, Control, Backpressured Chunk Streaming
  private setupDataChannelEvents(peerId: string, controlChannel: RTCDataChannel, fileChannel: RTCDataChannel) {
    const session = this.peers.get(peerId);
    if (!session) return;

    controlChannel.onopen = () => {
      session.isConnected = true;
      this.events.onPeerConnected(peerId, session.deviceInfo);
      controlChannel.send(
        JSON.stringify({
          type: 'handshake',
          payload: {
            deviceId: this.localProfile.deviceId,
            deviceName: this.localProfile.deviceName,
            deviceType: this.localProfile.deviceType,
            deviceCode: this.localProfile.deviceCode,
          },
        })
      );
    };

    controlChannel.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        switch (type) {
          case 'handshake': {
            session.deviceInfo = { ...session.deviceInfo, ...payload, isOnline: true };
            this.events.onPeerConnected(peerId, session.deviceInfo);
            break;
          }
          case 'chat_message': {
            this.events.onMessageReceived(payload);
            break;
          }
          case 'typing': {
            this.events.onTypingStatus(peerId, payload.isTyping);
            break;
          }
          case 'clipboard': {
            this.events.onClipboardReceived(payload.senderName, payload.text);
            break;
          }
          case 'ping': {
            controlChannel.send(JSON.stringify({ type: 'pong', payload: { time: payload.time } }));
            break;
          }
          case 'pong': {
            const rtt = Math.round(performance.now() - payload.time);
            this.events.onLatencyUpdate(peerId, Math.max(1, rtt));
            break;
          }
          case 'file_meta': {
            session.activeTransfers.set(payload.id, {
              fileInfo: payload,
              chunks: [],
              bytesReceived: 0,
              startTime: performance.now(),
            });
            this.events.onFileTransferProgress({
              id: payload.id,
              deviceId: peerId,
              direction: 'received',
              fileName: payload.name,
              fileSize: payload.size,
              fileType: payload.type,
              bytesTransferred: 0,
              totalChunks: payload.totalChunks,
              completedChunks: 0,
              status: 'transferring',
            });
            break;
          }
        }
      } catch (err) {
        console.error('[WebRTC] Control parse error:', err);
      }
    };

    fileChannel.onmessage = (event) => {
      const buffer = event.data as ArrayBuffer;
      if (!buffer || buffer.byteLength < 36) return;

      const headerDecoder = new TextDecoder();
      const transferId = headerDecoder.decode(new Uint8Array(buffer, 0, 36)).trim();
      const chunkData = buffer.slice(36);

      const transfer = session.activeTransfers.get(transferId);
      if (transfer) {
        transfer.chunks.push(chunkData);
        transfer.bytesReceived += chunkData.byteLength;

        const elapsed = (performance.now() - transfer.startTime) / 1000;
        const speed = elapsed > 0 ? Math.round(transfer.bytesReceived / elapsed) : 0;
        const remainingBytes = transfer.fileInfo.size - transfer.bytesReceived;
        const eta = speed > 0 ? Math.round(remainingBytes / speed) : 0;

        this.events.onFileTransferProgress({
          id: transferId,
          deviceId: peerId,
          bytesTransferred: transfer.bytesReceived,
          completedChunks: transfer.chunks.length,
          speedBps: speed,
          etaSeconds: eta,
          status: 'transferring',
        });

        if (transfer.bytesReceived >= transfer.fileInfo.size || transfer.chunks.length >= transfer.fileInfo.totalChunks) {
          const blob = new Blob(transfer.chunks, { type: transfer.fileInfo.type || 'application/octet-stream' });
          const downloadUrl = URL.createObjectURL(blob);

          const finalTransfer: FileTransfer = {
            id: transferId,
            deviceId: peerId,
            deviceName: session.deviceInfo.deviceName || 'Peer',
            direction: 'received',
            fileName: transfer.fileInfo.name,
            fileSize: transfer.fileInfo.size,
            fileType: transfer.fileInfo.type,
            bytesTransferred: transfer.bytesReceived,
            totalChunks: transfer.fileInfo.totalChunks,
            completedChunks: transfer.chunks.length,
            speedBps: speed,
            etaSeconds: 0,
            status: 'completed',
            timestamp: Date.now(),
            downloadUrl,
            blobData: blob,
          };

          session.activeTransfers.delete(transferId);
          this.events.onFileTransferComplete(finalTransfer, blob);
        }
      }
    };
  }

  // 5. Actions: Chat, Clipboard, High-Speed Backpressured File Transfer
  public sendMessage(receiverId: string, message: ChatMessage): boolean {
    const session = this.peers.get(receiverId);
    if (session && session.controlChannel && session.controlChannel.readyState === 'open') {
      session.controlChannel.send(
        JSON.stringify({
          type: 'chat_message',
          payload: message,
        })
      );
      return true;
    }
    return false;
  }

  public sendTyping(receiverId: string, isTyping: boolean) {
    const session = this.peers.get(receiverId);
    if (session && session.controlChannel && session.controlChannel.readyState === 'open') {
      session.controlChannel.send(
        JSON.stringify({
          type: 'typing',
          payload: { isTyping },
        })
      );
    }
  }

  public shareClipboard(receiverId: string, text: string): boolean {
    const session = this.peers.get(receiverId);
    if (session && session.controlChannel && session.controlChannel.readyState === 'open') {
      session.controlChannel.send(
        JSON.stringify({
          type: 'clipboard',
          payload: {
            senderName: this.localProfile.deviceName,
            text,
          },
        })
      );
      return true;
    }
    return false;
  }

  public async sendFile(
    receiverId: string,
    file: File,
    transferId: string,
    onProgress: (progress: Partial<FileTransfer>) => void
  ): Promise<boolean> {
    const session = this.peers.get(receiverId);
    if (!session || !session.fileChannel || session.fileChannel.readyState !== 'open') {
      throw new Error('Peer is not connected via WebRTC DataChannel');
    }

    const fileChannel = session.fileChannel;
    const controlChannel = session.controlChannel;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    if (controlChannel && controlChannel.readyState === 'open') {
      controlChannel.send(
        JSON.stringify({
          type: 'file_meta',
          payload: {
            id: transferId,
            name: file.name,
            size: file.size,
            type: file.type,
            totalChunks,
          },
        })
      );
    }

    const headerEncoder = new TextEncoder();
    const idBytes = headerEncoder.encode(transferId.padEnd(36, ' ')).slice(0, 36);

    let offset = 0;
    let chunkIndex = 0;
    const startTime = performance.now();

    while (offset < file.size) {
      if (fileChannel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        await new Promise<void>((resolve) => {
          fileChannel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT / 4;
          fileChannel.onbufferedamountlow = () => {
            fileChannel.onbufferedamountlow = null;
            resolve();
          };
        });
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const arrayBuffer = await slice.arrayBuffer();

      const packet = new Uint8Array(36 + arrayBuffer.byteLength);
      packet.set(idBytes, 0);
      packet.set(new Uint8Array(arrayBuffer), 36);

      fileChannel.send(packet.buffer);

      offset += arrayBuffer.byteLength;
      chunkIndex++;

      const elapsed = (performance.now() - startTime) / 1000;
      const speed = elapsed > 0 ? Math.round(offset / elapsed) : 0;
      const remainingBytes = file.size - offset;
      const eta = speed > 0 ? Math.round(remainingBytes / speed) : 0;

      onProgress({
        id: transferId,
        bytesTransferred: offset,
        completedChunks: chunkIndex,
        speedBps: speed,
        etaSeconds: eta,
        status: offset >= file.size ? 'completed' : 'transferring',
      });
    }

    return true;
  }

  public disconnect(peerId: string) {
    const session = this.peers.get(peerId);
    if (session) {
      try {
        session.controlChannel?.close();
        session.fileChannel?.close();
        session.pc.close();
      } catch {
        // ignore
      }
      this.peers.delete(peerId);
      this.events.onPeerDisconnected(peerId);
    }
  }

  public destroy() {
    this.broadcastChannel?.close();
    this.mqttClient?.destroy();
    this.peers.forEach((peer) => {
      try {
        peer.pc.close();
      } catch {
        // ignore
      }
    });
    this.peers.clear();
  }
}
