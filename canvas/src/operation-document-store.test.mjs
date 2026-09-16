import assert from "node:assert/strict";
import test from "node:test";

import { createOperationDocumentStore } from "./operation-document-store.mjs";
import { createDocumentModel, encodeState, mutate, restoreDocumentModel } from "./document-model.mjs";

test("reuses a hydrated document after a successful update catch-up", async () => {
  const loads = [];
  const catchUps = [];
  const source = documentSource("Before");
  const api = {
    async getDocumentForExecution(documentId) {
      loads.push(documentId);
      return { payload: documentPayload(source, 7), projectionOnly: false };
    },
    async listUpdates(documentId, afterSequence) {
      catchUps.push({ documentId, afterSequence });
      return { requiresSnapshot: false, latestSequence: 7, hasMore: false, updates: [] };
    },
  };
  const store = createOperationDocumentStore(api);

  assert.equal(await store.run("document", (entry) => store.source(entry).children[0].name), "Before");
  assert.equal(await store.run("document", (entry) => store.source(entry).children[0].name), "Before");
  assert.deepEqual(loads, ["document"]);
  assert.deepEqual(catchUps, [{ documentId: "document", afterSequence: 7 }]);
  store.clear();
});

test("applies verified incremental updates before reusing a hydrated document", async () => {
  const original = documentSource("Before");
  const initialPayload = documentPayload(original, 7);
  const changed = restoreDocumentModel(initialPayload);
  mutate(changed, { kind: "set-property", nodeId: "frame", property: "name", value: "After" });
  const update = encodeState(changed);
  changed.doc.destroy();
  let catchUps = 0;
  const api = {
    async getDocumentForExecution() {
      return { payload: initialPayload, projectionOnly: false };
    },
    async listUpdates() {
      catchUps += 1;
      return {
        requiresSnapshot: false,
        latestSequence: 8,
        hasMore: false,
        updates: [{ sequence: 8, update }],
      };
    },
  };
  const store = createOperationDocumentStore(api);

  await store.run("document", () => undefined);
  const result = await store.run("document", (entry) => ({
    name: store.source(entry).children[0].name,
    sequence: entry.sequence,
  }));

  assert.deepEqual(result, { name: "After", sequence: 8 });
  assert.equal(catchUps, 1);
  store.clear();
});

test("reloads a projection-only entry when collaborative updates appear", async () => {
  const loads = [];
  const sources = [documentSource("Projection"), documentSource("Reloaded")];
  const api = {
    async getDocumentForExecution() {
      const index = loads.length;
      loads.push(index);
      return index === 0
        ? { payload: projectionPayload(sources[0], 7), projectionOnly: true }
        : { payload: documentPayload(sources[1], 8), projectionOnly: false };
    },
    async listUpdates() {
      return {
        requiresSnapshot: false,
        latestSequence: 8,
        hasMore: false,
        updates: [{ sequence: 8, update: "AQ==" }],
      };
    },
  };
  const store = createOperationDocumentStore(api);

  await store.run("document", () => undefined);
  assert.equal(await store.run("document", (entry) => store.source(entry).children[0].name), "Reloaded");
  assert.equal(loads.length, 2);
  store.clear();
});

test("does not expose a retained document after access removal", async () => {
  let loads = 0;
  const denied = Object.assign(new Error("Forbidden"), { status: 403 });
  const api = {
    async getDocumentForExecution() {
      loads += 1;
      return { payload: documentPayload(documentSource("Private"), 7), projectionOnly: false };
    },
    async listUpdates() { throw denied; },
  };
  const store = createOperationDocumentStore(api);

  await store.run("document", () => undefined);
  await assert.rejects(store.run("document", () => assert.fail("retained state was exposed")), denied);
  await store.run("document", () => undefined);
  assert.equal(loads, 2);
  store.clear();
});

test("serializes operations for one document", async () => {
  let releaseFirst;
  const firstMayFinish = new Promise((resolve) => { releaseFirst = resolve; });
  let markFirstStarted;
  const firstStarted = new Promise((resolve) => { markFirstStarted = resolve; });
  const order = [];
  const api = {
    async getDocumentForExecution() {
      return { payload: documentPayload(documentSource("Shared"), 7), projectionOnly: false };
    },
    async listUpdates() {
      order.push("catch-up");
      return { requiresSnapshot: false, latestSequence: 7, hasMore: false, updates: [] };
    },
  };
  const store = createOperationDocumentStore(api);
  const first = store.run("document", async () => {
    order.push("first-start");
    markFirstStarted();
    await firstMayFinish;
    order.push("first-end");
  });
  const second = store.run("document", async () => { order.push("second"); });
  await firstStarted;
  assert.deepEqual(order, ["first-start"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(order, ["first-start", "first-end", "catch-up", "second"]);
  store.clear();
});

test("evicts the least recently used unpinned document", async () => {
  const loads = [];
  const api = {
    async getDocumentForExecution(documentId) {
      loads.push(documentId);
      return { payload: documentPayload(documentSource(documentId), 7), projectionOnly: false };
    },
    async listUpdates() {
      return { requiresSnapshot: false, latestSequence: 7, hasMore: false, updates: [] };
    },
  };
  const store = createOperationDocumentStore(api, { maxEntries: 2 });

  await store.run("a", () => undefined);
  await store.run("b", () => undefined);
  await store.run("c", () => undefined);
  await store.run("a", () => undefined);

  assert.deepEqual(loads, ["a", "b", "c", "a"]);
  store.clear();
});

function documentSource(name) {
  return {
    version: "2.17",
    children: [{ id: "frame", type: "frame", name, width: 100, height: 80, children: [] }],
  };
}

function documentPayload(source, sequence) {
  const model = createDocumentModel(source);
  const state = encodeState(model);
  model.doc.destroy();
  return {
    snapshot: { throughSequence: sequence, state, projection: source },
    updates: [],
  };
}

function projectionPayload(source, sequence) {
  return {
    snapshot: { throughSequence: sequence, projection: source, source },
    updates: [],
  };
}
