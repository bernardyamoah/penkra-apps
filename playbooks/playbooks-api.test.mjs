import assert from "node:assert/strict";
import test from "node:test";

import { createPlaybooksApi, parsePlaybooksReference } from "./playbooks-api.js";

const ID = "11111111-1111-4111-8111-111111111111";

test("parses generated IDs and playbooks paths", () => {
  assert.deepEqual(parsePlaybooksReference(ID, "playbook"), { kind: "playbook", id: ID });
  assert.deepEqual(parsePlaybooksReference(`playbooks://run/${ID}`, "run"), { kind: "run", id: ID });
  assert.throws(() => parsePlaybooksReference(`playbooks://collection/${ID}`, "playbook"), { code: "INVALID_PLAYBOOKS_REFERENCE" });
});

test("uses the App account-data namespace and JSON bodies", async () => {
  const calls = [];
  const runtime = {
    account: {
      request: async (input) => {
        calls.push(input);
        return { status: 200, headers: {}, body: new TextEncoder().encode('{"id":"ok"}') };
      },
      subscribe: async () => () => undefined,
    },
  };
  const api = createPlaybooksApi(runtime);
  await api.createRun({ playbookId: ID, threadId: "thread-1" });
  assert.equal(calls[0].path, "/playbooks/runs");
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(JSON.parse(new TextDecoder().decode(calls[0].body)), { playbookId: ID, threadId: "thread-1" });
});

test("surfaces backend error codes", async () => {
  const runtime = { account: { request: async () => ({ status: 409, headers: {}, body: new TextEncoder().encode('{"code":"THREAD_HAS_ACTIVE_RUN","message":"Already active"}') }) } };
  const api = createPlaybooksApi(runtime);
  await assert.rejects(api.createRun({ playbookId: ID, threadId: "thread-1" }), { code: "THREAD_HAS_ACTIVE_RUN", message: "Already active" });
});
