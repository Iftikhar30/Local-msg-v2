import dgram from 'dgram';
import { DeviceInfo } from './types.js';
import { getNetworkInfo, getBroadcastAddresses } from './network.js';

const DISCOVERY_PORT = 41235;
const BEACON_INTERVAL_MS = 4000;
const DEVICE_OFFLINE_TIMEOUT_MS = 18000;

export class DeviceDiscoveryService {
  private devices = new Map<string, DeviceInfo>();
  private udpSocket: dgram.Socket | null = null;
  private isUdpActive = false;
  private beaconTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private onDevicesUpdatedCallback: ((devices: DeviceInfo[]) => void) | null = null;
  private currentServerDevice: DeviceInfo | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  public setOnDevicesUpdated(callback: (devices: DeviceInfo[]) => void) {
    this.onDevicesUpdatedCallback = callback;
  }

  public initUdp(serverPort = 3000) {
    const netInfo = getNetworkInfo(0, 0, false, serverPort);
    this.currentServerDevice = {
      deviceId: `host_${netInfo.hostname.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'server'}`,
      deviceName: `${netInfo.hostname} (${netInfo.platform})`,
      deviceType: 'desktop',
      os: netInfo.platform,
      ip: netInfo.localIp,
      port: serverPort,
      lastSeen: Date.now(),
      isOnline: true,
      version: '1.0.0',
    };

    try {
      this.udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.udpSocket.on('error', (err) => {
        console.warn('[Discovery UDP Error (LAN broadcast fallback active)]:', err.message);
        this.isUdpActive = false;
        try {
          this.udpSocket?.close();
        } catch {
          // ignore
        }
      });

      this.udpSocket.on('message', (msg, rinfo) => {
        try {
          const parsed = JSON.parse(msg.toString('utf8'));
          if (parsed && parsed.type === 'locallink_beacon' && parsed.device) {
            const dev = parsed.device as DeviceInfo;
            // Don't register self
            if (this.currentServerDevice && dev.deviceId === this.currentServerDevice.deviceId) {
              return;
            }
            dev.ip = rinfo.address;
            dev.lastSeen = Date.now();
            dev.isOnline = true;
            this.registerOrUpdateDevice(dev);
          }
        } catch {
          // invalid beacon packet
        }
      });

      this.udpSocket.bind(DISCOVERY_PORT, '0.0.0.0', () => {
        try {
          this.udpSocket?.setBroadcast(true);
          this.isUdpActive = true;
          this.startBeaconTimer();
        } catch (e) {
          console.warn('[Discovery UDP setBroadcast failed]:', e);
        }
      });
    } catch (e) {
      console.warn('[Discovery UDP init failed (fallback mode active)]:', e);
      this.isUdpActive = false;
    }
  }

  private startBeaconTimer() {
    if (this.beaconTimer) clearInterval(this.beaconTimer);

    this.beaconTimer = setInterval(() => {
      if (!this.udpSocket || !this.isUdpActive || !this.currentServerDevice) return;

      const payload = Buffer.from(
        JSON.stringify({
          type: 'locallink_beacon',
          device: {
            ...this.currentServerDevice,
            lastSeen: Date.now(),
          },
        }),
        'utf8'
      );

      const broadcasts = getBroadcastAddresses();
      for (const bAddr of broadcasts) {
        try {
          this.udpSocket.send(payload, 0, payload.length, DISCOVERY_PORT, bAddr, (err) => {
            if (err) {
              // Ignore broadcast route errors
            }
          });
        } catch {
          // ignore
        }
      }
    }, BEACON_INTERVAL_MS);
  }

  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;

      for (const [id, dev] of this.devices.entries()) {
        if (now - dev.lastSeen > DEVICE_OFFLINE_TIMEOUT_MS) {
          if (dev.isOnline) {
            dev.isOnline = false;
            changed = true;
          }
        }
      }

      if (changed) {
        this.notifyUpdate();
      }
    }, 5000);
  }

  public registerOrUpdateDevice(device: DeviceInfo): void {
    const existing = this.devices.get(device.deviceId);
    if (!existing) {
      this.devices.set(device.deviceId, { ...device, lastSeen: Date.now(), isOnline: true });
      this.notifyUpdate();
    } else {
      let changed = false;
      if (existing.deviceName !== device.deviceName || existing.avatar !== device.avatar || !existing.isOnline) {
        changed = true;
      }
      existing.deviceName = device.deviceName;
      existing.deviceType = device.deviceType;
      existing.avatar = device.avatar;
      existing.deviceCode = device.deviceCode || existing.deviceCode;
      existing.ip = device.ip || existing.ip;
      existing.port = device.port || existing.port;
      existing.os = device.os || existing.os;
      existing.lastSeen = Date.now();
      existing.isOnline = true;
      if (changed) {
        this.notifyUpdate();
      }
    }
  }

  public getDeviceByCode(code: string): DeviceInfo | undefined {
    const cleanCode = code.trim();
    if (!cleanCode) return undefined;
    for (const dev of this.devices.values()) {
      if (dev.deviceCode === cleanCode && dev.isOnline) {
        return dev;
      }
    }
    // Fallback: search even if lastSeen within 60s
    for (const dev of this.devices.values()) {
      if (dev.deviceCode === cleanCode) {
        return dev;
      }
    }
    return undefined;
  }

  public markDeviceOffline(deviceId: string) {
    const dev = this.devices.get(deviceId);
    if (dev && dev.isOnline) {
      dev.isOnline = false;
      this.notifyUpdate();
    }
  }

  public removeDevice(deviceId: string) {
    if (this.devices.delete(deviceId)) {
      this.notifyUpdate();
    }
  }

  public getDevicesList(requesterDeviceId?: string): DeviceInfo[] {
    const list: DeviceInfo[] = [];
    for (const dev of this.devices.values()) {
      if (requesterDeviceId && dev.deviceId === requesterDeviceId) {
        list.push({ ...dev, isSelf: true });
      } else {
        list.push({ ...dev, isSelf: false });
      }
    }
    return list;
  }

  public getDevice(deviceId: string): DeviceInfo | undefined {
    return this.devices.get(deviceId);
  }

  public isUdpDiscoveryRunning(): boolean {
    return this.isUdpActive;
  }

  private notifyUpdate() {
    if (this.onDevicesUpdatedCallback) {
      this.onDevicesUpdatedCallback(Array.from(this.devices.values()));
    }
  }

  public destroy() {
    if (this.beaconTimer) clearInterval(this.beaconTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    try {
      this.udpSocket?.close();
    } catch {
      // ignore
    }
  }
}

export const discoveryService = new DeviceDiscoveryService();
