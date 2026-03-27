const DB_NAME = 'GaitAnalyzerDB';
const DB_VERSION = 1;

function defaultCreateError(code, message, cause = null) {
  const error = new Error(message);
  error.code = code;
  error.cause = cause;
  return error;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createSessionStorage({
  indexedDBRef = globalThis.indexedDB,
  cryptoRef = globalThis.crypto,
  navigatorRef = globalThis.navigator,
  createError = defaultCreateError,
  now = () => Date.now(),
  logger = console
} = {}) {
  let db = null;
  let encryptionKey = null;

  async function initDatabase() {
    if (!indexedDBRef?.open) {
      throw createError('INDEXEDDB_UNAVAILABLE', 'IndexedDB is not available in this environment');
    }
    if (db) return db;

    db = await new Promise((resolve, reject) => {
      const request = indexedDBRef.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains('sessions')) {
          database.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        }
        if (!database.objectStoreNames.contains('meta')) {
          database.createObjectStore('meta', { keyPath: 'key' });
        }
      };
    });

    return db;
  }

  async function getOrCreateEncryptionKey() {
    const database = await initDatabase();
    if (encryptionKey) return encryptionKey;
    if (!cryptoRef?.subtle) {
      throw createError('CRYPTO_UNAVAILABLE', 'Web Crypto API is not available in this environment');
    }

    return new Promise((resolve, reject) => {
      const tx = database.transaction(['meta'], 'readwrite');
      const store = tx.objectStore('meta');
      const request = store.get('encryptionKey');

      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction aborted'));
      request.onsuccess = async () => {
        try {
          if (request.result?.value) {
            encryptionKey = await cryptoRef.subtle.importKey('raw', request.result.value, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
            resolve(encryptionKey);
            return;
          }

          const key = await cryptoRef.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
          const exported = await cryptoRef.subtle.exportKey('raw', key);
          store.put({ key: 'encryptionKey', value: exported });
          encryptionKey = key;
          resolve(key);
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  async function saveSession(sessionData, { onStorageWarning } = {}) {
    try {
      const database = await initDatabase();
      if (navigatorRef.storage?.estimate) {
        const estimate = await navigatorRef.storage.estimate();
        const usage = Number(estimate?.usage);
        const quota = Number(estimate?.quota);
        if (Number.isFinite(usage) && Number.isFinite(quota) && quota > 0) {
          const percentUsed = (usage / quota) * 100;
          if (percentUsed > 80) {
            onStorageWarning?.(percentUsed);
          }
        }
      }

      const key = await getOrCreateEncryptionKey();
      const iv = cryptoRef.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(JSON.stringify(sessionData));
      const encrypted = await cryptoRef.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
      const encryptedData = { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };

      return await new Promise((resolve, reject) => {
        const tx = database.transaction(['sessions'], 'readwrite');
        const store = tx.objectStore('sessions');
        tx.onerror = () => reject(tx.error || createError('SESSION_SAVE_FAILED', 'IndexedDB transaction failed'));
        tx.onabort = () => reject(createError('SESSION_SAVE_ABORTED', 'IndexedDB transaction aborted'));
        const request = store.add({ patientId: sessionData.patientId, timestamp: now(), encrypted: encryptedData });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || createError('SESSION_SAVE_FAILED', 'Failed to store session'));
      });
    } catch (error) {
      logger.error('Save session error:', error);
      throw error;
    }
  }

  async function clearAllData() {
    const database = await initDatabase();
    const tx = database.transaction(['sessions'], 'readwrite');
    const store = tx.objectStore('sessions');
    await requestToPromise(store.clear());
  }

  async function getAllSessions() {
    const database = await initDatabase();
    const tx = database.transaction(['sessions'], 'readonly');
    const store = tx.objectStore('sessions');
    return requestToPromise(store.getAll());
  }

  async function exportSessions() {
    const allSessions = await getAllSessions();
    if (allSessions.length === 0) {
      return { storedCount: 0, decryptedSessions: [] };
    }

    const key = await getOrCreateEncryptionKey();
    const decryptedSessions = [];

    for (const session of allSessions) {
      try {
        const iv = new Uint8Array(session.encrypted.iv);
        const cipherArray = session.encrypted.data || session.encrypted.ciphertext;
        if (!cipherArray) throw new Error('Encrypted payload missing');
        const ciphertext = new Uint8Array(cipherArray);
        const decrypted = await cryptoRef.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        const sessionData = JSON.parse(new TextDecoder().decode(decrypted));
        decryptedSessions.push({
          id: session.id,
          patientId: session.patientId,
          timestamp: session.timestamp,
          savedDate: new Date(session.timestamp).toISOString(),
          ...sessionData
        });
      } catch (error) {
        logger.error('Decrypt error for session:', session.id, error);
      }
    }

    return {
      storedCount: allSessions.length,
      decryptedSessions
    };
  }

  return {
    initDatabase,
    getOrCreateEncryptionKey,
    saveSession,
    clearAllData,
    exportSessions
  };
}
