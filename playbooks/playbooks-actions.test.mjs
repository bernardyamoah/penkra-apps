import assert from "node:assert/strict";
import test from "node:test";

import {
  playbookComposition,
  runActionComposition,
  stagePlaybook,
  stageRunAction,
} from "./playbooks-actions.js";

const playbook = {
  title: "WhatsApp Sales",
  path: "playbooks://playbook/11111111-1111-4111-8111-111111111111",
  models: [
    { provider: "claudeAgent", model: "claude-sonnet", options: { thinking: true } },
    { provider: "codex", model: "gpt-5", options: { reasoningEffort: "high" } },
  ],
};

test("stages the short Play instruction with ordered model preferences intact", async () => {
  const calls = [];
  const runtime = { thread: { compose: async (input) => (calls.push(input), { resolvedModel: input.model[1] }) } };

  const result = await stagePlaybook(runtime, playbook);

  assert.deepEqual(calls, [playbookComposition(playbook)]);
  assert.deepEqual(calls[0].model, playbook.models);
  assert.deepEqual(result.resolvedModel, playbook.models[1]);
});

test("leaves model selection to the host when no declared model is available", async () => {
  const calls = [];
  const runtime = { thread: { compose: async (input) => (calls.push(input), { resolvedModel: null }) } };

  const result = await stagePlaybook(runtime, { ...playbook, models: [] });

  assert.deepEqual(calls[0].model, []);
  assert.equal(result.resolvedModel, null);
});

test("preserves occupied-composer errors from the host", async () => {
  const conflict = Object.assign(new Error("Composer occupied"), { code: "COMPOSER_NOT_EMPTY" });
  const runtime = { thread: { compose: async () => { throw conflict; } } };
  await assert.rejects(stagePlaybook(runtime, playbook), (error) => error === conflict);
});

test("opens the linked run Thread with the exact lifecycle instruction", async () => {
  const calls = [];
  const run = {
    threadId: "thread-1",
    label: "WhatsApp Sales",
    path: "playbooks://run/22222222-2222-4222-8222-222222222222",
  };
  const runtime = { thread: { open: async (input) => (calls.push(input), { threadId: input.threadId }) } };

  await stageRunAction(runtime, "pause", run);

  assert.deepEqual(calls, [{ threadId: "thread-1", composition: runActionComposition("pause", run) }]);
});
