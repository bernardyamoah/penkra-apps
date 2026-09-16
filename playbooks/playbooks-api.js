const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function createPlaybooksApi(runtime = globalThis.penkra) {
  if (!runtime?.account) throw new Error("Playbooks requires Penkra Account data support.");
  const request = async (path, options = {}) => {
    const response = await runtime.account.request({
      path: `/playbooks${path}`,
      method: options.method ?? "GET",
      ...(options.body === undefined ? {} : { body: encoder.encode(JSON.stringify(options.body)), contentType: "application/json" }),
    });
    const value = response.body.byteLength ? JSON.parse(decoder.decode(response.body)) : null;
    if (response.status < 200 || response.status >= 300) {
      const error = new Error(value?.message ?? `Playbooks request failed (${response.status}).`);
      error.code = value?.code ?? "PLAYBOOKS_REQUEST_FAILED";
      error.status = response.status;
      throw error;
    }
    return value;
  };
  const query = (input = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(input)) if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    return params.toString();
  };
  return {
    listPlaybooks: (input) => request(`?${query(input)}`),
    createPlaybook: (input) => request("", { method: "POST", body: input }),
    getPlaybook: (id) => request(`/${encodeURIComponent(id)}`),
    updatePlaybook: (id, input) => request(`/${encodeURIComponent(id)}`, { method: "PATCH", body: input }),
    deletePlaybook: (id) => request(`/${encodeURIComponent(id)}`, { method: "DELETE" }),
    setPublication: (id, lifecycle) => request(`/${encodeURIComponent(id)}/publication`, { method: "PUT", body: { lifecycle } }),
    setVisibility: (id, visibility) => request(`/${encodeURIComponent(id)}/visibility`, { method: "PUT", body: { visibility } }),
    setPlaybookLike: (id, liked) => request(`/${encodeURIComponent(id)}/like`, { method: "PUT", body: { liked } }),
    listPlaybookGrants: (id) => request(`/${encodeURIComponent(id)}/grants`),
    grantPlaybook: (id, input) => request(`/${encodeURIComponent(id)}/grants`, { method: "POST", body: input }),
    revokePlaybookGrant: (id, grantId) => request(`/${encodeURIComponent(id)}/grants/${encodeURIComponent(grantId)}`, { method: "DELETE" }),
    listTags: () => request("/tags"),
    getProfile: (id) => request(`/profiles/${encodeURIComponent(id)}`),
    listCollections: (input = {}) => request(`/collections/list?${query(input)}`),
    createCollection: (input) => request("/collections", { method: "POST", body: input }),
    getCollection: (id) => request(`/collections/${encodeURIComponent(id)}`),
    updateCollection: (id, input) => request(`/collections/${encodeURIComponent(id)}`, { method: "PATCH", body: input }),
    deleteCollection: (id) => request(`/collections/${encodeURIComponent(id)}`, { method: "DELETE" }),
    addCollectionItem: (id, input) => request(`/collections/${encodeURIComponent(id)}/items`, { method: "POST", body: input }),
    removeCollectionItem: (id, playbookId) => request(`/collections/${encodeURIComponent(id)}/items/${encodeURIComponent(playbookId)}`, { method: "DELETE" }),
    reorderCollection: (id, playbookIds) => request(`/collections/${encodeURIComponent(id)}/order`, { method: "PUT", body: { playbookIds } }),
    listCollectionGrants: (id) => request(`/collections/${encodeURIComponent(id)}/grants`),
    grantCollection: (id, input) => request(`/collections/${encodeURIComponent(id)}/grants`, { method: "POST", body: input }),
    revokeCollectionGrant: (id, grantId) => request(`/collections/${encodeURIComponent(id)}/grants/${encodeURIComponent(grantId)}`, { method: "DELETE" }),
    setCollectionLike: (id, liked) => request(`/collections/${encodeURIComponent(id)}/like`, { method: "PUT", body: { liked } }),
    listRuns: (input = {}) => request(`/runs/list?${query(input)}`),
    createRun: (input) => request("/runs", { method: "POST", body: input }),
    getRun: (id) => request(`/runs/${encodeURIComponent(id)}`),
    runNeedsInput: (id, reason) => request(`/runs/${encodeURIComponent(id)}/needs-input`, { method: "POST", body: { reason } }),
    continueRun: (id, note) => request(`/runs/${encodeURIComponent(id)}/continue`, { method: "POST", body: note ? { note } : {} }),
    completeRun: (id, note) => request(`/runs/${encodeURIComponent(id)}/complete`, { method: "POST", body: note ? { note } : {} }),
    reportRunAction: (id, action, report) => request(`/runs/${encodeURIComponent(id)}/${action}`, { method: "POST", body: report }),
    subscribeLibrary: (listener) => runtime.account.subscribe("library", listener),
    subscribeExplore: (listener) => runtime.account.subscribe("explore", listener),
    subscribeRuns: (listener) => runtime.account.subscribe("runs", listener),
  };
}

export function parsePlaybooksReference(value, expectedKind) {
  const text = String(value ?? "").trim();
  const match = /^(?:playbooks:\/\/)?(?:(playbook|collection|run)\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(text);
  const kind = match?.[1]?.toLowerCase() ?? expectedKind;
  if (!match || !kind || (expectedKind && kind !== expectedKind)) {
    const error = new Error(`Expected a ${expectedKind ?? "Playbooks"} ID or path.`);
    error.code = "INVALID_PLAYBOOKS_REFERENCE";
    throw error;
  }
  return { kind, id: match[2].toLowerCase() };
}
