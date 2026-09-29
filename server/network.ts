import os from 'os';
import { NetworkDiagnostics, NetworkInterfaceInfo } from './types.js';

export function getNetworkInfo(activeSockets = 0, knownDevicesCount = 0, udpDiscoveryActive = false, port = 3000): NetworkDiagnostics {
  const interfaces = os.networkInterfaces();
  const flatInterfaces: NetworkInterfaceInfo[] = [];

  let primaryIp = '127.0.0.1';

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      flatInterfaces.push({
        name,
        address: net.address,
        netmask: net.netmask,
        family: net.family,
        mac: net.mac,
        internal: net.internal,
        cidr: net.cidr,
      });

      // Find primary non-internal IPv4
      if (net.family === 'IPv4' && !net.internal) {
        // Prioritize standard LAN subnets: 192.168.x, 10.x, 172.16-31.x
        if (
          primaryIp === '127.0.0.1' ||
          net.address.startsWith('192.168.') ||
          net.address.startsWith('10.') ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(net.address)
        ) {
          primaryIp = net.address;
        }
      }
    }
  }

  // OS friendly name
  const platform = os.platform();
  let friendlyPlatform = 'Unknown';
  if (platform === 'win32') friendlyPlatform = 'Windows';
  else if (platform === 'darwin') friendlyPlatform = 'macOS';
  else if (platform === 'linux') friendlyPlatform = 'Linux';
  else if (platform === 'android') friendlyPlatform = 'Android';

  return {
    localIp: primaryIp,
    hostname: os.hostname(),
    platform: friendlyPlatform,
    osRelease: os.release(),
    interfaces: flatInterfaces,
    port,
    activeSockets,
    knownDevicesCount,
    uptimeSeconds: Math.floor(os.uptime()),
    udpDiscoveryActive,
  };
}

export function getBroadcastAddresses(): string[] {
  const addresses: string[] = ['255.255.255.255'];
  const interfaces = os.networkInterfaces();

  for (const netList of Object.values(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        try {
          const ipParts = net.address.split('.').map(Number);
          const maskParts = net.netmask.split('.').map(Number);
          if (ipParts.length === 4 && maskParts.length === 4) {
            const broadcast = ipParts.map((part, i) => (part | (~maskParts[i] & 255)) >>> 0).join('.');
            if (!addresses.includes(broadcast)) {
              addresses.push(broadcast);
            }
          }
        } catch {
          // ignore error calculating broadcast
        }
      }
    }
  }

  return addresses;
}
