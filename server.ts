import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { getNetworkInfo } from './server/network.js';
import { discoveryService } from './server/discovery.js';
import { wsManager } from './server/websocket.js';
import {
  initTransfer,
  appendChunk,
  getTransfer,
  cancelTransfer,
  sanitizeFilename,
} from './server/transfers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);

// JSON and URL-encoded body parsers
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Configurable CORS for Local, LAN and Vercel deployments
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize WebSocket Manager
wsManager.init(server);

// ================= API ENDPOINTS =================

// 1. Network Info & LAN Diagnostics
app.get('/api/network/info', (req: Request, res: Response) => {
  const activeSockets = wsManager.getActiveSocketsCount();
  const knownDevices = discoveryService.getDevicesList().length;
  const isUdp = discoveryService.isUdpDiscoveryRunning();
  const port = (server.address() as any)?.port || DEFAULT_PORT;
  const info = getNetworkInfo(activeSockets, knownDevices, isUdp, port);
  res.json({
    success: true,
    data: info,
  });
});

// 2. Discovered Devices
app.get('/api/devices', (req: Request, res: Response) => {
  const currentDeviceId = req.query.deviceId as string | undefined;
  const devices = discoveryService.getDevicesList(currentDeviceId);
  res.json({
    success: true,
    data: devices,
  });
});

// 2b. Lookup Device by 4-digit Code
app.get('/api/devices/lookup', (req: Request, res: Response) => {
  const code = (req.query.code as string || '').trim();
  if (!code) {
    return res.status(400).json({ success: false, error: 'Code parameter is required' });
  }
  const dev = discoveryService.getDeviceByCode(code);
  if (dev) {
    return res.json({
      success: true,
      found: true,
      data: dev,
    });
  }
  res.json({
    success: true,
    found: false,
    message: `No active device found with code "${code}" on this LAN`,
  });
});

// 3. Trigger manual scan
app.post('/api/devices/scan', (req: Request, res: Response) => {
  wsManager.broadcastDevicesList();
  res.json({
    success: true,
    message: 'LAN discovery beacon triggered',
    timestamp: Date.now(),
  });
});

// 4. File Transfer Init
app.post('/api/transfers/init', (req: Request, res: Response) => {
  const { transferId, senderId, receiverId, fileName, fileSize, fileType, totalChunks } = req.body;

  if (!transferId || !fileName || totalChunks === undefined) {
    return res.status(400).json({ success: false, error: 'Invalid transfer payload' });
  }

  try {
    const transfer = initTransfer(
      transferId,
      senderId || 'unknown',
      receiverId || 'unknown',
      fileName,
      Number(fileSize) || 0,
      fileType || 'application/octet-stream',
      Number(totalChunks) || 1
    );

    res.json({
      success: true,
      data: {
        transferId: transfer.transferId,
        fileName: transfer.fileName,
        fileSize: transfer.fileSize,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 5. File Transfer Chunk Upload
app.post('/api/transfers/chunk', (req: Request, res: Response) => {
  const { transferId, chunkIndex, chunkData } = req.body;

  if (!transferId || chunkIndex === undefined || !chunkData) {
    return res.status(400).json({ success: false, error: 'Missing chunk parameters' });
  }

  try {
    const buffer = Buffer.from(chunkData, 'base64');
    const result = appendChunk(transferId, Number(chunkIndex), buffer);
    res.json({
      success: true,
      data: result,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 6. File Transfer Download
app.get('/api/transfers/file/:transferId', (req: Request, res: Response) => {
  const { transferId } = req.params;
  const transfer = getTransfer(transferId);

  if (!transfer || !fs.existsSync(transfer.tempFilePath)) {
    return res.status(404).json({ success: false, error: 'File transfer not found or expired' });
  }

  const stat = fs.statSync(transfer.tempFilePath);
  const safeFilename = sanitizeFilename(transfer.fileName);

  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', transfer.fileType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

  const readStream = fs.createReadStream(transfer.tempFilePath);
  readStream.pipe(res);
});

// 7. File Transfer Status
app.get('/api/transfers/status/:transferId', (req: Request, res: Response) => {
  const { transferId } = req.params;
  const transfer = getTransfer(transferId);

  if (!transfer) {
    return res.status(404).json({ success: false, error: 'Transfer not found' });
  }

  res.json({
    success: true,
    data: {
      transferId: transfer.transferId,
      fileName: transfer.fileName,
      fileSize: transfer.fileSize,
      bytesReceived: transfer.bytesReceived,
      completed: transfer.completed,
      failed: transfer.failed,
      totalChunks: transfer.totalChunks,
      receivedChunksCount: transfer.receivedChunks.size,
    },
  });
});

// 8. Cancel File Transfer
app.post('/api/transfers/cancel/:transferId', (req: Request, res: Response) => {
  const { transferId } = req.params;
  const cancelled = cancelTransfer(transferId);
  res.json({ success: true, cancelled });
});

// ================= FRONTEND MOUNTING & STARTUP =================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Vite Dev Middleware Mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production Static Serve with SPA Fallback
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  // Dynamic Port Binding (fallback to 3001, 3002 if 3000 is occupied)
  function listenOnPort(port: number) {
    server.listen(port, HOST, () => {
      // Initialize UDP Discovery with active port
      discoveryService.initUdp(port);

      const netInfo = getNetworkInfo(0, 0, true, port);
      const localUrl = `http://localhost:${port}`;
      const lanUrl = `http://${netInfo.localIp}:${port}`;

      console.log('\n' + [
        '╔═══════════════════════════════════════════════════════════════╗',
        '║                     LocalLink v1.0.0                          ║',
        '╠═══════════════════════════════════════════════════════════════╣',
        '║ Status: 🟢 Running on LAN                                     ║',
        '║                                                               ║',
        `║ Local:   ${localUrl.padEnd(52)} ║`,
        `║ LAN:     ${lanUrl.padEnd(52)} ║`,
        '║                                                               ║',
        '║ Architecture: Dual Deployment (Local Node & Vercel Free)      ║',
        '║                                                               ║',
        '║ Open the LAN URL on any phone or laptop on the same Wi-Fi.    ║',
        '╚═══════════════════════════════════════════════════════════════╝',
      ].join('\n') + '\n');
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && port < DEFAULT_PORT + 10) {
        console.warn(`[LocalLink] Port ${port} is occupied, falling back to ${port + 1}...`);
        listenOnPort(port + 1);
      } else {
        console.error('[LocalLink Server Error]:', err);
      }
    });
  }

  listenOnPort(DEFAULT_PORT);
}

startServer().catch((err) => {
  console.error('[LocalLink Server] Failed to start:', err);
});
