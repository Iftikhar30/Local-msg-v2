import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { QrDevicePayload, UserProfile } from '../types';

export class QRService {
  /**
   * Generates a data URL for a QR code with modern, high-contrast aesthetics.
   */
  public static async generateDataUrl(text: string): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (e) {
      console.error('QR generation error:', e);
      return '';
    }
  }

  /**
   * Renders QR code onto an existing HTMLCanvasElement.
   */
  public static async renderToCanvas(canvas: HTMLCanvasElement, text: string): Promise<void> {
    try {
      await QRCode.toCanvas(canvas, text, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 280,
        color: {
          dark: '#09090b',
          light: '#ffffff',
        },
      });
    } catch (e) {
      console.error('Canvas QR render error:', e);
    }
  }

  /**
   * Formats the device payload into standard LocalLink QR string.
   * Deterministic and stable: does NOT include dynamic timestamps.
   */
  public static formatDeviceQrString(profile: UserProfile): string {
    const payload: QrDevicePayload = {
      type: 'locallink-device',
      deviceId: profile.deviceId,
      deviceName: profile.deviceName,
      deviceCode: profile.deviceCode,
      deviceType: profile.deviceType,
    };
    return JSON.stringify(payload);
  }

  /**
   * Parses decoded QR string or link format into a structured payload.
   */
  public static parseQrPayload(raw: string): QrDevicePayload | null {
    if (!raw) return null;
    const clean = raw.trim();

    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(clean);
      if (parsed && (parsed.type === 'locallink-device' || parsed.deviceCode || parsed.deviceId)) {
        return {
          type: 'locallink-device',
          deviceId: parsed.deviceId || '',
          deviceName: parsed.deviceName || 'Local Device',
          deviceCode: String(parsed.deviceCode || ''),
          deviceType: parsed.deviceType || 'laptop',
          ip: parsed.ip,
          port: parsed.port || 3000,
        };
      }
    } catch {
      // Continue to URL / query string parser
    }

    // Try parsing as URI format: locallink://connect?code=1234&id=... or http://.../?connect_code=1234
    try {
      if (clean.startsWith('locallink://') || clean.includes('connect')) {
        const urlStr = clean.startsWith('http') ? clean : clean.replace('locallink://', 'http://locallink.lan/');
        const url = new URL(urlStr);
        const code = url.searchParams.get('code') || url.searchParams.get('connect_code');
        const id = url.searchParams.get('id') || url.searchParams.get('deviceId');
        const name = url.searchParams.get('name') || url.searchParams.get('deviceName');
        if (code) {
          return {
            type: 'locallink-device',
            deviceId: id || '',
            deviceName: name ? decodeURIComponent(name) : 'Local Device',
            deviceCode: code,
          };
        }
      }
    } catch {
      // Continue
    }

    // Direct 4-digit code in QR string
    if (/^\d{4}$/.test(clean)) {
      return {
        type: 'locallink-device',
        deviceId: '',
        deviceName: 'Local Device',
        deviceCode: clean,
      };
    }

    return null;
  }

  /**
   * Decodes QR code from ImageData using jsQR.
   */
  public static decodeImageData(imageData: ImageData): string | null {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code && code.data) {
        return code.data;
      }
      // Retry with attemptBoth
      const codeInverted = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      return codeInverted?.data || null;
    } catch (e) {
      console.error('jsQR decode error:', e);
      return null;
    }
  }

  /**
   * Decodes QR code from an Image file or Blob.
   */
  public static async decodeFromFile(file: File | Blob): Promise<string | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const result = QRService.decodeImageData(imageData);
          resolve(result);
        };
        img.onerror = () => resolve(null);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
}
