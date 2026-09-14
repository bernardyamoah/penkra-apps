import assert from "node:assert/strict";
import test from "node:test";

import { createDocumentAssetCache } from "./document-asset-cache.mjs";

test("reuses recently opened document assets and evicts the least recently used document", () => {
  const cache = createDocumentAssetCache(2);
  const first = new Map([["first.png", { sha256: "first" }]]);
  const second = new Map([["second.png", { sha256: "second" }]]);
  const third = new Map([["third.png", { sha256: "third" }]]);

  cache.remember("first", first);
  cache.remember("second", second);
  assert.equal(cache.take("first"), first);
  cache.remember("third", third);

  assert.equal(cache.take("first"), first);
  assert.equal(cache.take("third"), third);
  assert.equal(cache.take("second").size, 0);
});
