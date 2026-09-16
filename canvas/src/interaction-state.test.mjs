import assert from "node:assert/strict";
import test from "node:test";

import { actionButtonState, pendingActionMatches } from "./interaction-state.mjs";

test("pending actions only disable the matching control", () => {
  const pending = { key: "restore", subjectId: "document-a" };

  assert.equal(pendingActionMatches(pending, "restore", "document-a"), true);
  assert.equal(pendingActionMatches(pending, "restore", "document-b"), false);
  assert.equal(pendingActionMatches(pending, "delete", "document-a"), false);
});

test("busy button state exposes accessible progress without changing unrelated controls", () => {
  const pending = { key: "invite", subjectId: "folder-a" };
  const busy = actionButtonState(pending, {
    key: "invite",
    subjectId: "folder-a",
    label: "idle",
    pendingLabel: "pending",
    icon: "person-plus",
  });
  const idle = actionButtonState(pending, {
    key: "invite",
    subjectId: "folder-b",
    label: "idle",
    pendingLabel: "pending",
    icon: "person-plus",
  });

  assert.deepEqual(busy, {
    busy: true,
    disabled: true,
    ariaBusy: "true",
    label: "pending",
    icon: "loader",
  });
  assert.deepEqual(idle, {
    busy: false,
    disabled: false,
    ariaBusy: null,
    label: "idle",
    icon: "person-plus",
  });
});
