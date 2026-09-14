import assert from "node:assert/strict";
import test from "node:test";

import { trashSummary } from "./trash-summary.mjs";

test("Trash distinguishes a filtered result count from the whole collection", () => {
  assert.deepEqual(trashSummary({ query: "campaign", matchingCount: 1, totalCount: 19 }), {
    isFiltered: true,
    matchingCount: 1,
    totalCount: 19,
  });
});

test("Trash treats whitespace-only search as the whole collection", () => {
  assert.deepEqual(trashSummary({ query: "  ", matchingCount: 19, totalCount: 19 }), {
    isFiltered: false,
    matchingCount: 19,
    totalCount: 19,
  });
});
