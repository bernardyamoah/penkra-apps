import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { bytesToBase64 } from "./codec.mjs";
import { createPendingUpdateQueue } from "./pending-update-queue.mjs";

self.onmessage = async (event) => {
  const { documentId, serverStateVector } = event.data ?? {};
  if (!documentId || !(serverStateVector instanceof Uint8Array)) {
    self.postMessage({ error: "Canvas received an invalid legacy-cache migration request." });
    return;
  }

  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`penkra-canvas:${documentId}`, doc);
  try {
    await persistence.whenSynced;
    const update = Y.encodeStateAsUpdate(doc, serverStateVector);
    let item = null;
    if (update.byteLength > 2) {
      item = {
        clientUpdateId: crypto.randomUUID(),
        update: bytesToBase64(update),
        createdAt: Date.now(),
      };
      await createPendingUpdateQueue().enqueue(documentId, item);
    }
    await persistence.clearData();
    await createPendingUpdateQueue().markMigrationComplete(documentId);
    self.postMessage({ item });
  } catch (error) {
    await persistence.destroy().catch(() => undefined);
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  } finally {
    doc.destroy();
  }
};
