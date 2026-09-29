import { ChatMessage, Conversation, FileTransfer, AppNotification, UserProfile, AppSettings } from '../types';

const DB_NAME = 'LocalLinkDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('conversations')) {
        const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
        convStore.createIndex('lastTimestamp', 'lastTimestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('conversationId', 'conversationId', { unique: false });
        msgStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('transfers')) {
        const transferStore = db.createObjectStore('transfers', { keyPath: 'id' });
        transferStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('notifications')) {
        const notifStore = db.createObjectStore('notifications', { keyPath: 'id' });
        notifStore.createIndex('timestamp', 'timestamp', { unique: false });
        notifStore.createIndex('read', 'read', { unique: false });
      }

      if (!db.objectStoreNames.contains('trustedDevices')) {
        db.createObjectStore('trustedDevices', { keyPath: 'deviceId' });
      }

      if (!db.objectStoreNames.contains('blockedDevices')) {
        db.createObjectStore('blockedDevices', { keyPath: 'deviceId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export const LocalDB = {
  // --- Conversations ---
  async getConversations(): Promise<Conversation[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readonly');
      const store = tx.objectStore('conversations');
      const index = store.index('lastTimestamp');
      const request = index.getAll();
      request.onsuccess = () => resolve((request.result || []).reverse());
      request.onerror = () => reject(request.error);
    });
  },

  async saveConversation(conv: Conversation): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations');
      const req = store.put(conv);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async deleteConversation(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['conversations', 'messages'], 'readwrite');
    const convStore = tx.objectStore('conversations');
    const msgStore = tx.objectStore('messages');

    convStore.delete(id);

    // Delete associated messages
    const msgIndex = msgStore.index('conversationId');
    const request = msgIndex.getAllKeys(id);
    request.onsuccess = () => {
      const keys = request.result;
      for (const k of keys) {
        msgStore.delete(k);
      }
    };

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // --- Messages ---
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('conversationId');
      const request = index.getAll(conversationId);
      request.onsuccess = () => {
        const msgs = (request.result || []) as ChatMessage[];
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        resolve(msgs);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async saveMessage(message: ChatMessage): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      const req = store.put(message);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async updateMessageStatus(messageId: string, status: ChatMessage['status']): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      const getReq = store.get(messageId);
      getReq.onsuccess = () => {
        const msg = getReq.result as ChatMessage | undefined;
        if (msg) {
          msg.status = status;
          store.put(msg);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  async deleteMessage(messageId: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      const req = store.delete(messageId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  // --- File Transfers ---
  async getTransfers(): Promise<FileTransfer[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transfers', 'readonly');
      const store = tx.objectStore('transfers');
      const index = store.index('timestamp');
      const req = index.getAll();
      req.onsuccess = () => resolve((req.result || []).reverse());
      req.onerror = () => reject(req.error);
    });
  },

  async saveTransfer(transfer: FileTransfer): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transfers', 'readwrite');
      const store = tx.objectStore('transfers');
      // Strip blobData from indexedDB serialization if needed or keep if supported
      const req = store.put(transfer);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async clearTransfers(): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transfers', 'readwrite');
      const store = tx.objectStore('transfers');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  // --- Notifications ---
  async getNotifications(): Promise<AppNotification[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notifications', 'readonly');
      const store = tx.objectStore('notifications');
      const index = store.index('timestamp');
      const req = index.getAll();
      req.onsuccess = () => resolve((req.result || []).reverse());
      req.onerror = () => reject(req.error);
    });
  },

  async saveNotification(notif: AppNotification): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notifications', 'readwrite');
      const store = tx.objectStore('notifications');
      const req = store.put(notif);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async markNotificationRead(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notifications', 'readwrite');
      const store = tx.objectStore('notifications');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result as AppNotification | undefined;
        if (item) {
          item.read = true;
          store.put(item);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  async markAllNotificationsRead(): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notifications', 'readwrite');
      const store = tx.objectStore('notifications');
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const val = cursor.value;
          val.read = true;
          cursor.update(val);
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  },

  async clearNotifications(): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notifications', 'readwrite');
      const store = tx.objectStore('notifications');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  // --- Trusted Devices ---
  async getTrustedDeviceIds(): Promise<string[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trustedDevices', 'readonly');
      const store = tx.objectStore('trustedDevices');
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result || []).map(String));
      req.onerror = () => reject(req.error);
    });
  },

  async setDeviceTrusted(deviceId: string, trusted: boolean): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trustedDevices', 'readwrite');
      const store = tx.objectStore('trustedDevices');
      if (trusted) {
        store.put({ deviceId, addedAt: Date.now() });
      } else {
        store.delete(deviceId);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // --- Blocked Devices ---
  async getBlockedDeviceIds(): Promise<string[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('blockedDevices', 'readonly');
      const store = tx.objectStore('blockedDevices');
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result || []).map(String));
      req.onerror = () => reject(req.error);
    });
  },

  async setDeviceBlocked(deviceId: string, blocked: boolean): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('blockedDevices', 'readwrite');
      const store = tx.objectStore('blockedDevices');
      if (blocked) {
        store.put({ deviceId, blockedAt: Date.now() });
      } else {
        store.delete(deviceId);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // --- Storage Size Estimation ---
  async getStorageEstimates(): Promise<{ chatSize: number; transfersSize: number; cachedSize: number }> {
    try {
      const db = await getDB();
      let chatSize = 0;
      let transfersSize = 0;

      // Estimate chat size
      const msgs = await new Promise<ChatMessage[]>((res) => {
        const tx = db.transaction('messages', 'readonly');
        const store = tx.objectStore('messages');
        const r = store.getAll();
        r.onsuccess = () => res(r.result || []);
        r.onerror = () => res([]);
      });

      for (const m of msgs) {
        chatSize += (m.text?.length || 0) * 2 + 100;
        if (m.fileAttachment?.dataUrl) {
          chatSize += m.fileAttachment.dataUrl.length * 2;
        }
      }

      // Estimate transfers size
      const transfers = await new Promise<FileTransfer[]>((res) => {
        const tx = db.transaction('transfers', 'readonly');
        const store = tx.objectStore('transfers');
        const r = store.getAll();
        r.onsuccess = () => res(r.result || []);
        r.onerror = () => res([]);
      });

      for (const t of transfers) {
        transfersSize += t.bytesTransferred || t.fileSize || 0;
      }

      return {
        chatSize,
        transfersSize,
        cachedSize: chatSize + transfersSize,
      };
    } catch {
      return { chatSize: 0, transfersSize: 0, cachedSize: 0 };
    }
  },

  async clearAllChatHistory(): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['conversations', 'messages'], 'readwrite');
      tx.objectStore('conversations').clear();
      tx.objectStore('messages').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
