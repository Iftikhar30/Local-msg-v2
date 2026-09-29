import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { discoveryService } from './discovery.js';
import { DeviceInfo } from './types.js';

interface ClientSession {
  ws: WebSocket;
  deviceId?: string;
  ip: string;
  userAgent?: string;
  registeredAt?: number;
}

export class LocalWebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ClientSession>();
  private deviceSockets = new Map<string, WebSocket>();

  public init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    discoveryService.setOnDevicesUpdated(() => {
      this.broadcastDevicesList();
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress || '127.0.0.1';
      const cleanIp = clientIp.replace(/^::ffff:/, '');

      const session: ClientSession = {
        ws,
        ip: cleanIp,
        userAgent: req.headers['user-agent'],
      };
      this.clients.set(ws, session);

      // Send initial welcome & known devices
      this.send(ws, {
        type: 'server:welcome',
        payload: {
          clientIp: cleanIp,
          serverTime: Date.now(),
        },
      });
      this.sendDevicesListTo(ws);

      ws.on('message', (data: Buffer | string) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf8');
          const message = JSON.parse(raw);
          this.handleClientMessage(ws, message);
        } catch (e) {
          console.warn('[WS Malformed Message]:', e);
        }
      });

      ws.on('close', () => {
        const sess = this.clients.get(ws);
        if (sess && sess.deviceId) {
          this.deviceSockets.delete(sess.deviceId);
          discoveryService.markDeviceOffline(sess.deviceId);
        }
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.warn('[WS Client Error]:', err.message);
      });
    });

    // Heartbeat ping interval
    setInterval(() => {
      for (const [ws] of this.clients.entries()) {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.ping();
          } catch {
            // ignore
          }
        }
      }
    }, 15000);
  }

  public getActiveSocketsCount(): number {
    return this.clients.size;
  }

  private handleClientMessage(ws: WebSocket, message: { type: string; payload: any }) {
    const session = this.clients.get(ws);
    if (!session) return;

    const { type, payload } = message;

    switch (type) {
      case 'device:register': {
        const { deviceId, deviceName, deviceType, os, avatar, deviceCode } = payload;
        if (!deviceId || !deviceName) return;

        session.deviceId = deviceId;
        session.registeredAt = Date.now();
        this.deviceSockets.set(deviceId, ws);

        const dev: DeviceInfo = {
          deviceId,
          deviceName,
          deviceType: deviceType || 'laptop',
          os: os || 'Web',
          ip: session.ip,
          port: 3000,
          lastSeen: Date.now(),
          isOnline: true,
          avatar: avatar || 'laptop',
          deviceCode: deviceCode || undefined,
          version: '1.0.0',
        };

        discoveryService.registerOrUpdateDevice(dev);
        this.broadcastDevicesList();
        break;
      }

      case 'device:lookup_code': {
        const { code } = payload;
        const targetDev = discoveryService.getDeviceByCode(code);
        if (targetDev && targetDev.deviceId !== session.deviceId) {
          this.send(ws, {
            type: 'device:lookup_code_response',
            payload: {
              code,
              found: true,
              device: targetDev,
            },
          });
        } else {
          this.send(ws, {
            type: 'device:lookup_code_response',
            payload: {
              code,
              found: false,
              message: targetDev?.deviceId === session.deviceId 
                ? 'This is your own device code.' 
                : `No active device found with code ${code} on this LAN.`,
            },
          });
        }
        break;
      }

      case 'connection:request_by_code': {
        const { code, requestId, fromDeviceId, fromDeviceName, fromDeviceAvatar, fromDeviceType, fromDeviceCode } = payload;
        const targetDev = discoveryService.getDeviceByCode(code);

        if (!targetDev || !targetDev.isOnline) {
          this.send(ws, {
            type: 'connection:error',
            payload: {
              requestId,
              message: `No active LAN device found with 4-digit code "${code}". Make sure the other device is open on the same Wi-Fi.`,
            },
          });
          break;
        }

        if (targetDev.deviceId === fromDeviceId) {
          this.send(ws, {
            type: 'connection:error',
            payload: {
              requestId,
              message: 'Cannot connect to your own device.',
            },
          });
          break;
        }

        const targetWs = this.deviceSockets.get(targetDev.deviceId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'connection:request',
            payload: {
              requestId,
              fromDeviceId,
              fromDeviceName,
              fromDeviceAvatar,
              fromDeviceType,
              fromDeviceCode,
              fromIp: session.ip,
              toDeviceId: targetDev.deviceId,
              timestamp: Date.now(),
            },
          });

          // Acknowledge to sender that request was routed
          this.send(ws, {
            type: 'connection:request_routed',
            payload: {
              requestId,
              targetDeviceId: targetDev.deviceId,
              targetDeviceName: targetDev.deviceName,
              targetDeviceCode: targetDev.deviceCode,
            },
          });
        } else {
          this.send(ws, {
            type: 'connection:error',
            payload: {
              toDeviceId: targetDev.deviceId,
              requestId,
              message: `Device "${targetDev.deviceName}" is offline or unreachable.`,
            },
          });
        }
        break;
      }

      case 'devices:get': {
        this.sendDevicesListTo(ws);
        break;
      }

      case 'connection:request': {
        const { toDeviceId, requestId, fromDeviceId, fromDeviceName, fromDeviceAvatar, fromDeviceType } = payload;
        const targetWs = this.deviceSockets.get(toDeviceId);

        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'connection:request',
            payload: {
              requestId,
              fromDeviceId,
              fromDeviceName,
              fromDeviceAvatar,
              fromDeviceType,
              fromIp: session.ip,
              toDeviceId,
              timestamp: Date.now(),
            },
          });
        } else {
          // Device unavailable
          this.send(ws, {
            type: 'connection:error',
            payload: {
              toDeviceId,
              requestId,
              message: 'The device is currently offline or unreachable on this LAN.',
            },
          });
        }
        break;
      }

      case 'connection:response': {
        const { toDeviceId, fromDeviceId, requestId, accepted, reason } = payload;
        const targetWs = this.deviceSockets.get(toDeviceId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'connection:response',
            payload: {
              requestId,
              fromDeviceId,
              toDeviceId,
              accepted,
              reason,
            },
          });
        }
        break;
      }

      case 'connection:disconnect': {
        const { targetDeviceId, fromDeviceId } = payload;
        const targetWs = this.deviceSockets.get(targetDeviceId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'connection:disconnected',
            payload: {
              fromDeviceId,
              targetDeviceId,
            },
          });
        }
        break;
      }

      case 'chat:message': {
        const { receiverId, id } = payload;
        const targetWs = this.deviceSockets.get(receiverId);

        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          // Deliver to receiver
          this.send(targetWs, {
            type: 'chat:message',
            payload,
          });

          // Send delivered receipt back to sender
          this.send(ws, {
            type: 'chat:receipt',
            payload: {
              messageId: id,
              conversationId: payload.conversationId,
              senderId: payload.senderId,
              receiverId,
              status: 'delivered',
              timestamp: Date.now(),
            },
          });
        } else {
          // Receiver offline or disconnected
          this.send(ws, {
            type: 'chat:receipt',
            payload: {
              messageId: id,
              conversationId: payload.conversationId,
              senderId: payload.senderId,
              receiverId,
              status: 'failed',
              error: 'Device not reachable',
              timestamp: Date.now(),
            },
          });
        }
        break;
      }

      case 'chat:typing': {
        const { receiverId } = payload;
        const targetWs = this.deviceSockets.get(receiverId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'chat:typing',
            payload,
          });
        }
        break;
      }

      case 'chat:receipt': {
        const { receiverId } = payload;
        const targetWs = this.deviceSockets.get(receiverId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'chat:receipt',
            payload,
          });
        }
        break;
      }

      case 'clipboard:share': {
        const { receiverId } = payload;
        const targetWs = this.deviceSockets.get(receiverId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'clipboard:share',
            payload,
          });
        }
        break;
      }

      case 'transfer:offer': {
        const { receiverId } = payload;
        const targetWs = this.deviceSockets.get(receiverId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'transfer:offer',
            payload,
          });
        } else {
          this.send(ws, {
            type: 'transfer:response',
            payload: {
              transferId: payload.transferId,
              accepted: false,
              reason: 'Recipient device is offline.',
            },
          });
        }
        break;
      }

      case 'transfer:response': {
        const { toDeviceId } = payload;
        const targetWs = this.deviceSockets.get(toDeviceId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'transfer:response',
            payload,
          });
        }
        break;
      }

      case 'transfer:chunk': {
        const { receiverId } = payload;
        const targetWs = this.deviceSockets.get(receiverId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'transfer:chunk',
            payload,
          });
        }
        break;
      }

      case 'transfer:progress': {
        const { receiverId } = payload;
        const targetWs = this.deviceSockets.get(receiverId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'transfer:progress',
            payload,
          });
        }
        break;
      }

      case 'transfer:complete': {
        const { receiverId } = payload;
        const targetWs = this.deviceSockets.get(receiverId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'transfer:complete',
            payload,
          });
        }
        break;
      }

      case 'transfer:cancel': {
        const { receiverId } = payload;
        const targetWs = this.deviceSockets.get(receiverId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          this.send(targetWs, {
            type: 'transfer:cancel',
            payload,
          });
        }
        break;
      }

      case 'ping': {
        this.send(ws, { type: 'pong', payload: { timestamp: Date.now() } });
        break;
      }
    }
  }

  private send(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (e) {
        console.warn('[WS Send Error]:', e);
      }
    }
  }

  public broadcastDevicesList() {
    for (const [ws, session] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendDevicesListTo(ws, session.deviceId);
      }
    }
  }

  private sendDevicesListTo(ws: WebSocket, currentDeviceId?: string) {
    const list = discoveryService.getDevicesList(currentDeviceId);
    this.send(ws, {
      type: 'devices:update',
      payload: {
        devices: list,
      },
    });
  }
}

export const wsManager = new LocalWebSocketManager();
