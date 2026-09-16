import assert from "node:assert/strict";
import test from "node:test";

import { createSnapshotMaintenance } from "./snapshot-maintenance.mjs";

test("acknowledged edits stay successful when maintenance snapshot upload fails", async () => {
  const failures = [];
  const scheduled = [];
  const maintenance = createSnapshotMaintenance({
    canRun: () => true,
    createPayload: () => ({ throughSequence: 12 }),
    upload: async () => { throw Object.assign(new Error("unavailable"), { status: 503 }); },
    onSuccess: () => assert.fail("snapshot should not succeed"),
    onFailure: (error, detail) => failures.push({ error, detail }),
    onAccessRemoved: () => assert.fail("access should remain"),
    setTimeout: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
    clearTimeout: () => {},
  });

  assert.equal(await maintenance.request("document-1"), false);
  assert.equal(failures.length, 1);
  assert.deepEqual(failures[0].detail, { willRetry: true });
  assert.equal(scheduled[0].delay, 5_000);
});

test("permanent snapshot validation failures do not enter a retry loop", async () => {
  const scheduled = [];
  const maintenance = createSnapshotMaintenance({
    canRun: () => true,
    createPayload: () => ({ throughSequence: 12 }),
    upload: async () => { throw Object.assign(new Error("invalid"), { status: 422 }); },
    onSuccess: () => assert.fail("snapshot should not succeed"),
    onFailure: (_error, detail) => assert.deepEqual(detail, { willRetry: false }),
    onAccessRemoved: () => assert.fail("access should remain"),
    setTimeout: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
    clearTimeout: () => {},
  });

  assert.equal(await maintenance.request("document-1"), false);
  assert.equal(scheduled.length, 0);
});

test("successful maintenance reports the exact covered update count", async () => {
  let runnable = true;
  let completed = null;
  const payload = { throughSequence: 18, coveredUpdates: 10 };
  const maintenance = createSnapshotMaintenance({
    canRun: () => runnable,
    createPayload: () => payload,
    upload: async () => {},
    onSuccess: (_documentId, value) => {
      completed = value;
      runnable = false;
    },
    onFailure: () => assert.fail("snapshot should succeed"),
    onAccessRemoved: () => assert.fail("access should remain"),
  });

  assert.equal(await maintenance.request("document-1"), true);
  assert.equal(completed, payload);
});
