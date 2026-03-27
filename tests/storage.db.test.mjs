import test from 'node:test';
import assert from 'node:assert/strict';

import { createSessionStorage } from '../src/storage/db.js';

test('createSessionStorage reports IndexedDB unavailable errors with code', async () => {
  const storage = createSessionStorage({
    indexedDBRef: null,
    cryptoRef: { subtle: {} },
    navigatorRef: {}
  });

  await assert.rejects(
    storage.initDatabase(),
    (error) => error?.code === 'INDEXEDDB_UNAVAILABLE'
  );
});

test('createSessionStorage reports Crypto API unavailable errors with code', async () => {
  const fakeDb = {
    objectStoreNames: { contains: () => true },
    transaction() {
      return {
        objectStore() {
          return {
            get() {
              const request = {};
              queueMicrotask(() => {
                request.result = null;
                request.onsuccess?.();
              });
              return request;
            }
          };
        }
      };
    }
  };

  const storage = createSessionStorage({
    indexedDBRef: {
      open() {
        const request = {};
        queueMicrotask(() => {
          request.result = fakeDb;
          request.onsuccess?.();
        });
        return request;
      }
    },
    cryptoRef: null,
    navigatorRef: {}
  });

  await assert.rejects(
    storage.getOrCreateEncryptionKey(),
    (error) => error?.code === 'CRYPTO_UNAVAILABLE'
  );
});
