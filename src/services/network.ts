import { NetworkDiagnosticsData, Device } from '../types';

export const NetworkAPI = {
  getBaseUrl(): string {
    if (typeof window === 'undefined') return '';
    const custom = localStorage.getItem('locallink_custom_service_url');
    if (custom && custom.trim().length > 0) {
      return custom.trim().replace(/\/+$/, '');
    }
    return '';
  },

  async getNetworkInfo(): Promise<NetworkDiagnosticsData | null> {
    try {
      const base = this.getBaseUrl();
      const res = await fetch(`${base}/api/network/info`, { signal: AbortSignal.timeout(3500) });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  },

  async getDevices(currentDeviceId?: string): Promise<Device[]> {
    try {
      const base = this.getBaseUrl();
      const url = currentDeviceId 
        ? `${base}/api/devices?deviceId=${encodeURIComponent(currentDeviceId)}` 
        : `${base}/api/devices`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  },

  async triggerLanScan(): Promise<boolean> {
    try {
      const base = this.getBaseUrl();
      const res = await fetch(`${base}/api/devices/scan`, { method: 'POST', signal: AbortSignal.timeout(4000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  async initTransfer(payload: {
    transferId: string;
    senderId: string;
    receiverId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    totalChunks: number;
  }): Promise<{ transferId: string; fileName: string; fileSize: number } | null> {
    try {
      const base = this.getBaseUrl();
      const res = await fetch(`${base}/api/transfers/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  async uploadChunk(payload: {
    transferId: string;
    chunkIndex: number;
    chunkData: string; // base64
  }): Promise<{ completed: boolean; bytesReceived: number; percent: number } | null> {
    try {
      const base = this.getBaseUrl();
      const res = await fetch(`${base}/api/transfers/chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  getDownloadUrl(transferId: string): string {
    const base = this.getBaseUrl();
    return `${base}/api/transfers/file/${encodeURIComponent(transferId)}`;
  },

  async getTransferStatus(transferId: string): Promise<any> {
    try {
      const base = this.getBaseUrl();
      const res = await fetch(`${base}/api/transfers/status/${encodeURIComponent(transferId)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  async cancelTransfer(transferId: string): Promise<boolean> {
    try {
      const base = this.getBaseUrl();
      const res = await fetch(`${base}/api/transfers/cancel/${encodeURIComponent(transferId)}`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  },
};
