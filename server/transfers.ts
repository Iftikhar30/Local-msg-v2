import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ServerFileTransfer {
  transferId: string;
  senderId: string;
  receiverId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  receivedChunks: Set<number>;
  tempFilePath: string;
  completed: boolean;
  failed: boolean;
  error?: string;
  createdAt: number;
  lastUpdatedAt: number;
  bytesReceived: number;
}

const TRANSFERS_DIR = path.join(os.tmpdir(), 'locallink_transfers');

// Ensure transfer directory exists safely
try {
  if (!fs.existsSync(TRANSFERS_DIR)) {
    fs.mkdirSync(TRANSFERS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create transfers dir:', e);
}

const activeTransfers = new Map<string, ServerFileTransfer>();

// Clean up old transfers periodically (older than 2 hours)
setInterval(() => {
  const now = Date.now();
  for (const [id, transfer] of activeTransfers.entries()) {
    if (now - transfer.lastUpdatedAt > 2 * 60 * 60 * 1000) {
      try {
        if (fs.existsSync(transfer.tempFilePath)) {
          fs.unlinkSync(transfer.tempFilePath);
        }
      } catch {
        // ignore
      }
      activeTransfers.delete(id);
    }
  }
}, 10 * 60 * 1000);

export function sanitizeFilename(filename: string): string {
  // Strip paths and dangerous characters
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function initTransfer(
  transferId: string,
  senderId: string,
  receiverId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  totalChunks: number
): ServerFileTransfer {
  const safeName = sanitizeFilename(fileName);
  const tempFilePath = path.join(TRANSFERS_DIR, `${transferId}_${safeName}`);

  // Truncate/create empty file
  try {
    fs.writeFileSync(tempFilePath, Buffer.alloc(0));
  } catch (e) {
    console.error('Error creating temp transfer file:', e);
  }

  const transfer: ServerFileTransfer = {
    transferId,
    senderId,
    receiverId,
    fileName: safeName,
    fileSize,
    fileType: fileType || 'application/octet-stream',
    totalChunks,
    receivedChunks: new Set<number>(),
    tempFilePath,
    completed: false,
    failed: false,
    createdAt: Date.now(),
    lastUpdatedAt: Date.now(),
    bytesReceived: 0,
  };

  activeTransfers.set(transferId, transfer);
  return transfer;
}

export function appendChunk(
  transferId: string,
  chunkIndex: number,
  chunkBuffer: Buffer
): { completed: boolean; bytesReceived: number; percent: number } {
  const transfer = activeTransfers.get(transferId);
  if (!transfer) {
    throw new Error('Transfer not found');
  }

  // Append chunk to file or write at chunk offset
  fs.appendFileSync(transfer.tempFilePath, chunkBuffer);
  transfer.receivedChunks.add(chunkIndex);
  transfer.bytesReceived += chunkBuffer.length;
  transfer.lastUpdatedAt = Date.now();

  const isComplete = transfer.receivedChunks.size >= transfer.totalChunks;
  if (isComplete) {
    transfer.completed = true;
  }

  const percent = transfer.fileSize > 0 
    ? Math.min(100, Math.round((transfer.bytesReceived / transfer.fileSize) * 100))
    : 100;

  return {
    completed: isComplete,
    bytesReceived: transfer.bytesReceived,
    percent,
  };
}

export function getTransfer(transferId: string): ServerFileTransfer | undefined {
  return activeTransfers.get(transferId);
}

export function cancelTransfer(transferId: string): boolean {
  const transfer = activeTransfers.get(transferId);
  if (!transfer) return false;

  try {
    if (fs.existsSync(transfer.tempFilePath)) {
      fs.unlinkSync(transfer.tempFilePath);
    }
  } catch {
    // ignore
  }

  transfer.failed = true;
  activeTransfers.delete(transferId);
  return true;
}
