import assert from "node:assert/strict";
import test from "node:test";
import { sortCollection } from "./collection-toolbar.mjs";

const records = [
  { id: "late", title: "Zebra", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-03T00:00:00.000Z" },
  { id: "early", name: "alpha", createdAt: "2026-01-03T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "middle", title: "Mango", createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" },
];

test("sortCollection orders folders and designs by each toolbar criterion", () => {
  assert.deepEqual(sortCollection(records, "updated").map(({ id }) => id), ["late", "middle", "early"]);
  assert.deepEqual(sortCollection(records, "created").map(({ id }) => id), ["early", "middle", "late"]);
  assert.deepEqual(sortCollection(records, "name").map(({ id }) => id), ["early", "middle", "late"]);
});
