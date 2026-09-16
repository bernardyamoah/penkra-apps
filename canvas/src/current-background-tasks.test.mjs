import assert from "node:assert/strict";
import test from "node:test";

import { runCurrentBackgroundTasks } from "./current-background-tasks.mjs";

test("background tasks stop starting work after their route becomes stale", async () => {
  let current = true;
  const started = [];
  await runCurrentBackgroundTasks([1, 2, 3, 4], async (item) => {
    started.push(item);
    current = false;
  }, { concurrency: 1, isCurrent: () => current });
  assert.deepEqual(started, [1]);
});

test("background tasks keep their configured concurrency bound", async () => {
  let active = 0;
  let maximum = 0;
  await runCurrentBackgroundTasks([1, 2, 3, 4], async () => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
  }, { concurrency: 2 });
  assert.equal(maximum, 2);
});
