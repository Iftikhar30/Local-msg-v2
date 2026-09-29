import { NetworkDiagnosticsData, Device } from '../types';

export const NetworkAPI = {
  async getNetworkInfo(): Promise<NetworkDiagnosticsData | null> {
    try {
      const res = await fetch('/api/network/info');
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  },

  async getDevices(currentDeviceId?: string): Promise<Device[]> {
    try {
      const url = currentDeviceId ? `/api/devices?deviceId=${encodeURIComponent(currentDeviceId)}` : '/api/devices';
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  },

  async triggerLanScan(): Promise<boolean> {
    try {
      const res = await fetch('/api/devices/scan', { method: 'POST' });
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
      const res = await fetch('/api/transfers/init', {
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
      const res = await fetch('/api/transfers/chunk', {
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
    return `/api/transfers/file/${encodeURIComponent(transferId)}`;
  },

  async getTransferStatus(transferId: string): Promise<any> {
    try {
      const res = await fetch(`/api/transfers/status/${encodeURIComponent(transferId)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  async cancelTransfer(transferId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/transfers/cancel/${encodeURIComponent(transferId)}`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  },
};
