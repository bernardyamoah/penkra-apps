import assert from "node:assert/strict";
import test from "node:test";

import {
  createMemoryPendingUpdateStorage,
  createPendingUpdateQueue,
} from "./pending-update-queue.mjs";

test("stores only pending updates and returns them in creation order", async () => {
  const queue = createPendingUpdateQueue({ storage: createMemoryPendingUpdateStorage() });

  await queue.enqueue("document-a", {
    clientUpdateId: "later",
    update: "update-2",
    createdAt: 20,
  });
  await queue.enqueue("document-b", {
    clientUpdateId: "other-document",
    update: "other",
    createdAt: 5,
  });
  await queue.enqueue("document-a", {
    clientUpdateId: "earlier",
    update: "update-1",
    createdAt: 10,
  });

  assert.deepEqual(await queue.load("document-a"), [
    { clientUpdateId: "earlier", update: "update-1", createdAt: 10 },
    { clientUpdateId: "later", update: "update-2", createdAt: 20 },
  ]);
});

test("removes an acknowledged update without touching another document", async () => {
  const queue = createPendingUpdateQueue({ storage: createMemoryPendingUpdateStorage() });
  await queue.enqueue("document-a", { clientUpdateId: "same", update: "a", createdAt: 1 });
  await queue.enqueue("document-b", { clientUpdateId: "same", update: "b", createdAt: 1 });

  await queue.acknowledge("document-a", "same");

  assert.deepEqual(await queue.load("document-a"), []);
  assert.equal((await queue.load("document-b"))[0].update, "b");
});

test("tracks legacy cache migration per document", async () => {
  const queue = createPendingUpdateQueue({ storage: createMemoryPendingUpdateStorage() });
  assert.equal(await queue.migrationComplete("document-a"), false);
  await queue.markMigrationComplete("document-a");
  assert.equal(await queue.migrationComplete("document-a"), true);
  assert.equal(await queue.migrationComplete("document-b"), false);
});
