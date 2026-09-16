import { createPlaybooksApi, parsePlaybooksReference } from "./playbooks-api.js";

const runtime = globalThis.penkra;
if (!runtime?.operations) throw new Error("Playbooks operations require the Penkra App runtime.");
const api = createPlaybooksApi(runtime);

runtime.operations.handle("open", async ({ url }, context) => {
  const reference = parsePlaybooksReference(url);
  const route = JSON.stringify({
    name: reference.kind === "run" ? "run" : reference.kind,
    id: reference.id,
  });
  if (context.tab) {
    await context.tab.navigate({ route });
    return { tabId: context.tab.id, kind: reference.kind, id: reference.id };
  }
  const tab = await context.tabs.open({ route });
  return { tabId: tab.id, kind: reference.kind, id: reference.id };
});

runtime.operations.handle("search", async (input = {}) => {
  const query = String(input.query ?? "").trim();
  const kind = input.kind ?? "all";
  const limit = Math.min(100, Math.max(1, Number(input.limit ?? 25)));
  const includeProfiles = kind === "all" || kind === "profile";
  const [playbooks, collections, profilePlaybooks, profileCollections] = await Promise.all([
    kind === "collection" || kind === "profile" ? { items: [] } : api.listPlaybooks({ query, view: "explore", limit }),
    kind === "playbook" || kind === "profile" ? { items: [] } : api.listCollections({ query }),
    includeProfiles ? api.listPlaybooks({ query: "", view: "explore", limit: 100 }) : { items: [] },
    includeProfiles ? api.listCollections({ query: "" }) : { items: [] },
  ]);
  const normalizedQuery = query.toLocaleLowerCase();
  const authors = new Map();
  for (const item of [...profilePlaybooks.items, ...profileCollections.items.filter((entry) => entry.visibility === "public")]) {
    if (!item.author.name?.toLocaleLowerCase().includes(normalizedQuery)) continue;
    if (!authors.has(item.author.id)) authors.set(item.author.id, item.author);
  }
  if (kind === "profile") {
    return { items: [...authors.values()].slice(0, limit).map((author) => ({ kind: "profile", ...author })) };
  }
  return {
    items: [
      ...playbooks.items.map((item) => ({ kind: "playbook", ...item })),
      ...collections.items.filter((item) => item.visibility === "public").map((item) => ({ kind: "collection", ...item })),
      ...authors.values().map((author) => ({ kind: "profile", ...author })),
    ].slice(0, limit),
  };
});

runtime.operations.handle("get", async ({ playbook }) => {
  const { id } = parsePlaybooksReference(playbook, "playbook");
  return api.getPlaybook(id);
});

runtime.operations.handle("collections.get", async ({ collection }) => {
  const { id } = parsePlaybooksReference(collection, "collection");
  return api.getCollection(id);
});

runtime.operations.handle("runs.create", async ({ playbook, label }, context) => {
  const { id } = parsePlaybooksReference(playbook, "playbook");
  return api.createRun({ playbookId: id, threadId: context.invocation.threadId, ...(label ? { label } : {}) });
});

runtime.operations.handle("runs.status", async ({ id }) => api.getRun(parsePlaybooksReference(id, "run").id));
runtime.operations.handle("runs.list", async (input = {}) => api.listRuns({
  ...(input.status ? { status: input.status } : {}),
  ...(input.playbook ? { playbookId: parsePlaybooksReference(input.playbook, "playbook").id } : {}),
  includeDeleted: input.includeDeleted === true,
  limit: input.limit ?? 50,
}));
runtime.operations.handle("runs.needs-input", async ({ id, reason }) => api.runNeedsInput(parsePlaybooksReference(id, "run").id, reason));
runtime.operations.handle("runs.continue", async ({ id, note }) => api.continueRun(parsePlaybooksReference(id, "run").id, note));
runtime.operations.handle("runs.complete", async ({ id, note }) => api.completeRun(parsePlaybooksReference(id, "run").id, note));
for (const action of ["pause", "resume", "delete"]) {
  runtime.operations.handle(`runs.${action}`, async ({ id, outcome, summary }) =>
    api.reportRunAction(parsePlaybooksReference(id, "run").id, action, { outcome, summary }));
}
