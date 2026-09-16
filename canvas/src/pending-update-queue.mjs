const DATABASE_NAME = "penkra-canvas-pending-updates";
const DATABASE_VERSION = 1;
const UPDATE_STORE = "updates";
const META_STORE = "metadata";

export function createPendingUpdateQueue(options = {}) {
  const storage = options.storage ?? createIndexedDbStorage(
    options.indexedDB ?? globalThis.indexedDB,
  );

  return {
    async load(documentId) {
      return (await storage.list(documentId))
        .map(normalizeItem)
        .sort((left, right) => left.createdAt - right.createdAt);
    },
    enqueue(documentId, item) {
      return storage.put({
        key: updateKey(documentId, item.clientUpdateId),
        documentId,
        clientUpdateId: item.clientUpdateId,
        update: item.update,
        createdAt: Number(item.createdAt ?? Date.now()),
      });
    },
    acknowledge(documentId, clientUpdateId) {
      return storage.delete(updateKey(documentId, clientUpdateId));
    },
    migrationComplete(documentId) {
      return storage.getMetadata(migrationKey(documentId)).then(Boolean);
    },
    markMigrationComplete(documentId) {
      return storage.setMetadata(migrationKey(documentId), true);
    },
  };
}

export function createMemoryPendingUpdateStorage() {
  const updates = new Map();
  const metadata = new Map();
  return {
    async list(documentId) {
      return [...updates.values()].filter((item) => item.documentId === documentId);
    },
    async put(item) {
      updates.set(item.key, structuredClone(item));
    },
    async delete(key) {
      updates.delete(key);
    },
    async getMetadata(key) {
      return metadata.get(key);
    },
    async setMetadata(key, value) {
      metadata.set(key, value);
    },
  };
}

function createIndexedDbStorage(indexedDB) {
  if (!indexedDB) throw new Error("Canvas offline updates require IndexedDB.");
  const database = openDatabase(indexedDB);
  return {
    async list(documentId) {
      const db = await database;
      const transaction = db.transaction(UPDATE_STORE, "readonly");
      const done = transactionDone(transaction);
      const request = transaction.objectStore(UPDATE_STORE)
        .index("documentId")
        .getAll(documentId);
      const result = await requestResult(request);
      await done;
      return result;
    },
    async put(item) {
      const db = await database;
      const transaction = db.transaction(UPDATE_STORE, "readwrite");
      transaction.objectStore(UPDATE_STORE).put(item);
      await transactionDone(transaction);
    },
    async delete(key) {
      const db = await database;
      const transaction = db.transaction(UPDATE_STORE, "readwrite");
      transaction.objectStore(UPDATE_STORE).delete(key);
      await transactionDone(transaction);
    },
    async getMetadata(key) {
      const db = await database;
      const transaction = db.transaction(META_STORE, "readonly");
      const done = transactionDone(transaction);
      const result = await requestResult(transaction.objectStore(META_STORE).get(key));
      await done;
      return result;
    },
    async setMetadata(key, value) {
      const db = await database;
      const transaction = db.transaction(META_STORE, "readwrite");
      transaction.objectStore(META_STORE).put(value, key);
      await transactionDone(transaction);
    },
  };
}

function openDatabase(indexedDB) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(UPDATE_STORE)) {
        db.createObjectStore(UPDATE_STORE, { keyPath: "key" })
          .createIndex("documentId", "documentId", { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Canvas could not open its offline update store."));
    request.onblocked = () => reject(new Error("Canvas offline update storage is blocked by another window."));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Canvas offline storage request failed."));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Canvas offline storage transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Canvas offline storage transaction was aborted."));
  });
}

function normalizeItem(item) {
  return {
    clientUpdateId: String(item.clientUpdateId),
    update: String(item.update),
    createdAt: Number(item.createdAt ?? 0),
  };
}

function updateKey(documentId, clientUpdateId) {
  return `${documentId}:${clientUpdateId}`;
}

function migrationKey(documentId) {
  return `legacy-y-indexeddb:${documentId}`;
}
