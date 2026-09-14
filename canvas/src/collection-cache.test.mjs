import assert from "node:assert/strict";
import test from "node:test";

import { readCollectionCache, writeCollectionCache } from "./collection-cache.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("collection summaries survive a new Canvas renderer without thumbnail payloads", () => {
  const storage = memoryStorage();
  const collection = {
    documents: [{ id: "document-1", title: "Draft" }],
    folders: [{ id: "folder-1", name: "Work" }],
    recentFolders: [],
    folderCollections: new Map([["folder-1", {
      folder: { id: "folder-1", name: "Work" },
      children: [],
      documents: [{ id: "document-1", title: "Draft" }],
    }]]),
  };

  writeCollectionCache(storage, "account-1", collection);
  const restored = readCollectionCache(storage, "account-1");

  assert.deepEqual(restored?.documents, collection.documents);
  assert.deepEqual(restored?.folderCollections.get("folder-1"), collection.folderCollections.get("folder-1"));
});

test("collection caches are account scoped and malformed entries are ignored", () => {
  const storage = memoryStorage();
  writeCollectionCache(storage, "account-1", {
    documents: [], folders: [], recentFolders: [], folderCollections: new Map(),
  });

  assert.equal(readCollectionCache(storage, "account-2"), null);
  storage.setItem("canvas.collections.v1.account-2", "not-json");
  assert.equal(readCollectionCache(storage, "account-2"), null);
});
