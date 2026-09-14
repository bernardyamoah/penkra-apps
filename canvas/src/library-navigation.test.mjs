import assert from "node:assert/strict";
import test from "node:test";

import { activateLibraryTab } from "./library-navigation.mjs";

test("library tabs leave Trash before displaying the selected collection", async () => {
  const calls = [];

  await activateLibraryTab("trash", "shared", {
    select: (filter) => calls.push(`select:${filter}`),
    navigateToLibrary: async () => calls.push("library"),
    render: () => calls.push("render"),
  });

  assert.deepEqual(calls, ["select:shared", "library"]);
});

test("library tabs switch collections in place while already in the library", async () => {
  const calls = [];

  await activateLibraryTab("library", "all", {
    select: (filter) => calls.push(`select:${filter}`),
    navigateToLibrary: async () => calls.push("library"),
    render: () => calls.push("render"),
  });

  assert.deepEqual(calls, ["select:all", "render"]);
});
