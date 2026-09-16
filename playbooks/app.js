import { createPlaybooksApi } from "./playbooks-api.js";
import { stagePlaybook, stageRunAction } from "./playbooks-actions.js";

const runtime = globalThis.penkra;
const api = createPlaybooksApi(runtime);
const root = document.querySelector("#app");

const state = {
  route: { name: "explore" },
  history: [{ name: "explore" }],
  historyIndex: 0,
  loading: true,
  error: null,
  data: null,
  query: "",
  libraryTab: "drafts",
  editor: null,
  possibleModels: [],
  busy: false,
  modal: null,
  autosaveStatus: "",
  rail: { published: 0, drafts: 0, likes: 0, runs: [] },
};

const icons = {
  search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>',
  back: '<path d="m15 18-6-6 6-6"></path>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"></path>',
  play: '<path d="m8 5 11 7-11 7Z"></path>',
  plus: '<path d="M12 5v14M5 12h14"></path>',
  more: '<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>',
  thread: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"></path>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z"></path><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z"></path>',
  compass: '<circle cx="12" cy="12" r="9"></circle><path d="m15.5 8.5-2 5-5 2 2-5Z"></path>',
  document: '<path d="M6 2h8l4 4v16H6Z"></path><path d="M14 2v5h5M9 12h6M9 16h6"></path>',
  edit: '<path d="m12 20 8-8-4-4-8 8-1 5Z"></path><path d="m14 6 4 4"></path>',
  pause: '<path d="M9 5v14M15 5v14"></path>',
  chevron: '<path d="m9 18 6-6-6-6"></path>',
};

function icon(name, className = "") {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function markdown(source) {
  const safe = esc(source);
  return safe
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .split(/\n{2,}/)
    .map((block) => block.startsWith("<h") || block.startsWith("<li") ? block : `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function navigate(route, { replace = false } = {}) {
  state.route = route;
  if (replace) state.history[state.historyIndex] = route;
  else {
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(route);
    state.historyIndex += 1;
  }
  window.scrollTo(0, 0);
  document.querySelector(".rail")?.scrollTo(0, 0);
  void runtime?.tab?.setRoute?.({ route: JSON.stringify(route) }).catch(() => undefined);
  void load();
}

function goBack() {
  if (state.historyIndex === 0) return;
  state.historyIndex -= 1;
  state.route = state.history[state.historyIndex];
  window.scrollTo(0, 0);
  document.querySelector(".rail")?.scrollTo(0, 0);
  void load();
}

function shell(content) {
  const active = state.route.name;
  const accountActive = active === "library" ? state.libraryTab : active === "editor" ? "drafts" : "";
  const runItems = state.rail.runs.slice(0, 5);
  return `<div class="shell">
    <aside class="rail">
      <div class="rail-brand"><button class="brand" data-nav="explore">${icon("book")}<span>Playbooks</span></button><button class="rail-add" data-action="new-playbook" aria-label="New Playbook">${icon("plus")}</button></div>
      <nav class="rail-nav"><button class="rail-item ${active === "explore" ? "active" : ""}" data-nav="explore">${icon("compass")}<span>Explore</span></button></nav>
      <div class="rail-section"><div class="rail-label"><span>Account</span><b>♥ ${compactCount(state.rail.likes)}</b></div>
        <button class="rail-item ${accountActive === "published" ? "active" : ""}" data-account-tab="published">${icon("document")}<span>Published</span><small>${state.rail.published || ""}</small></button>
        <button class="rail-item ${accountActive === "drafts" ? "active" : ""}" data-account-tab="drafts">${icon("edit")}<span>Drafts</span><small>${state.rail.drafts || ""}</small></button>
        <button class="rail-item ${accountActive === "likes" ? "active" : ""}" data-account-tab="likes">${icon("heart")}<span>Likes</span></button>
      </div>
      <div class="rail-section rail-runs"><div class="rail-label"><span>Runs</span>${runItems.some((run) => run.status === "needs_input") ? '<b class="warning">1 needs you</b>' : ""}</div>
        ${runItems.map((run) => `<button class="rail-item run-link ${active === "run" && state.route.id === run.id ? "active" : ""}" data-run="${esc(run.id)}"><i class="status ${esc(run.status)}"></i><span>${esc(run.label)}</span><small>${relative(run.updatedAt)}</small></button>`).join("")}
        <button class="rail-see" data-nav="runs">${icon("chevron")}<span>See all${state.rail.runs.length ? ` ${state.rail.runs.length}` : ""}</span></button>
      </div>
    </aside>
    <main class="content">${content}</main>
    ${renderModal()}
  </div>`;
}

function pageHeader(title, subtitle = "", actions = "", { rawSubtitle = false, showBack = true } = {}) {
  const back = showBack && state.historyIndex > 0 ? `<button class="icon-button" data-action="back" aria-label="Back">${icon("back")}</button>` : "";
  const renderedSubtitle = subtitle ? `<div class="page-subtitle">${rawSubtitle ? subtitle : esc(subtitle)}</div>` : "";
  return `<div class="page-header"><div class="heading-row">${back}<div><h1>${esc(title)}</h1>${renderedSubtitle}</div></div><div class="actions">${actions}</div></div>`;
}

function compactCount(value) {
  if (!value) return "0";
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(value);
}

function author(author) {
  const initials = (author?.name || "?").trim().slice(0, 1).toUpperCase();
  return `<button class="author" data-profile="${esc(author?.id)}">${author?.avatarUrl ? `<img src="${esc(author.avatarUrl)}" alt="" />` : `<span>${esc(initials)}</span>`}<b>${esc(author?.name || "Unknown")}</b></button>`;
}

function badges(item) {
  return `${item.visibility === "private" ? `<span class="badge">${icon("lock")} Private</span>` : ""}${item.lifecycle === "draft" ? '<span class="badge">Draft</span>' : ""}`;
}

function playbookCard(item) {
  return `<article class="card clickable" data-playbook="${esc(item.id)}">
    <div class="card-title"><h3>${esc(item.title)}</h3><button class="like ${item.liked ? "liked" : ""}" data-like-playbook="${esc(item.id)}" aria-label="Like">${item.visibility === "private" ? icon("lock") : ""}${icon("heart")} ${item.likes}</button></div>
    <p>${esc(item.description || "No description")}</p>
    <footer>${author(item.author)}${item.access === "owner" || item.access === "editor" ? `<time>◷ updated ${relative(item.updatedAt)} ago</time>` : ""}</footer>
  </article>`;
}

function collectionCard(item) {
  return `<article class="card collection-card clickable" data-collection="${esc(item.id)}">
    <div class="collection-art"><i></i><i>${icon("book")}</i></div>
    <div class="card-title"><h3>${esc(item.title)}</h3><button class="like ${item.liked ? "liked" : ""}" data-like-collection="${esc(item.id)}">${item.visibility === "private" ? icon("lock") : ""}${icon("heart")} ${item.likes}</button></div>
    <footer>${author(item.author)}<span>· ${item.playbookCount} playbooks</span></footer>
  </article>`;
}

function profileCard(item) {
  const initials = (item.name || "?").trim().slice(0, 1).toUpperCase();
  return `<button class="profile-card" data-profile="${esc(item.id)}">${item.avatarUrl ? `<img src="${esc(item.avatarUrl)}" alt="" />` : `<span>${esc(initials)}</span>`}<b>${esc(item.name || "Unknown")}</b></button>`;
}

function grid(items, renderer, empty = "Nothing here yet.") {
  return items?.length ? `<div class="grid">${items.map(renderer).join("")}</div>` : `<div class="empty"><h3>${esc(empty)}</h3></div>`;
}

function renderExplore() {
  const { playbooks, collections, tags, profiles } = state.data;
  return `<section class="explore-hero"><h1>What should your agent do?</h1><p>Playbooks are plain instructions anyone can write, share, and run. Pick one, press play.</p>
    <label class="search hero-search">${icon("search")}<input data-search value="${esc(state.query)}" placeholder='Try "follow up unpaid invoices" or "Ama Owusu"' /></label>
    ${tags.items.length ? `<div class="chips category-row"><button class="${!state.route.tag ? "selected" : ""}" data-tag="">All</button>${tags.items.slice(0, 6).map(({ tag }) => `<button class="${state.route.tag === tag ? "selected" : ""}" data-tag="${esc(tag)}">${esc(tag)}</button>`).join("")}</div>` : ""}</section>
    <section><div class="section-title"><h2>Most popular</h2></div>${grid(playbooks.items, playbookCard, "No published Playbooks yet.")}</section>
    ${profiles.length ? `<section><div class="section-title"><h2>Authors</h2></div><div class="profile-results">${profiles.map(profileCard).join("")}</div></section>` : ""}
    ${collections.items.length ? `<section><div class="section-title"><div><h2>Collections</h2><p>Curated sets from the community</p></div><button class="see-all" data-nav="collections">See all ${icon("chevron")}</button></div>${grid(collections.items.slice(0, 6), collectionCard)}</section>` : ""}`;
}

function renderLibrary() {
  const actions = `<button class="button" data-action="new-collection">New collection</button><button class="button primary" data-action="new-playbook">${icon("plus")} New Playbook</button>`;
  const items = state.data.items ?? [];
  const title = ({ drafts: "Drafts", published: "Published", likes: "Likes", collections: "Collections" })[state.libraryTab];
  const subtitle = state.libraryTab === "published" ? `${items.length} published${state.data.collections?.length ? ` · ${state.data.collections.length} collections` : ""} · ♥ ${compactCount(state.rail.likes)} likes received` : "";
  return `${pageHeader(title, subtitle, actions, { showBack: false })}
    ${state.libraryTab === "collections" ? grid(items, collectionCard, "Create your first collection.") : state.libraryTab === "likes" ? `<section><h2>Playbooks</h2>${grid(items, playbookCard, "No liked Playbooks.")}</section>${state.data.collections.length ? `<section><div class="section-title"><h2>Collections</h2></div>${grid(state.data.collections, collectionCard)}</section>` : ""}` : `${state.data.collections?.length ? `<section><div class="section-title"><h2>Collections <small class="count">${state.data.collections.length}</small></h2></div>${grid(state.data.collections, collectionCard)}</section>` : ""}<section><div class="section-title"><h2>${title} <small class="count">${items.length}</small></h2></div>${grid(items, playbookCard, `No ${state.libraryTab} yet.`)}</section>`}`;
}

function renderPlaybook(item) {
  const canEdit = item.access === "owner" || item.access === "editor";
  const actions = `<button class="button ${item.liked ? "liked" : ""}" data-like-playbook="${esc(item.id)}">${icon("heart")} ${item.liked ? "Liked" : "Like"}</button>
    <button class="button" data-add-to-collection="${esc(item.id)}">Add to collection</button>
    <button class="button" data-copy="${esc(item.path)}">${icon("copy")} Copy path</button>
    ${canEdit ? `<button class="button" data-edit-playbook="${esc(item.id)}">Edit</button>` : ""}
    <button class="button primary" data-play="${esc(item.id)}">${icon("play")} Play</button>`;
  const meta = `<div class="detail-meta">${author(item.author)}<span>·</span><span>updated ${relative(item.updatedAt)} ago</span><span>·</span><button class="like ${item.liked ? "liked" : ""}" data-like-playbook="${esc(item.id)}">${icon("heart")} ${item.likes} likes</button><span>·</span><span>${item.visibility === "private" ? `${icon("lock")} Private` : "◎ Public"}</span></div>`;
  return `<div class="detail-crumb"><button class="icon-button" data-action="back">${icon("back")}</button><span>Playbooks</span><span>›</span><b>${esc(item.title)}</b></div>${pageHeader(item.title, meta, actions, { rawSubtitle: true, showBack: false })}
    <p class="detail-description">${esc(item.description)}</p><div class="detail-layout"><article class="prose">${markdown(item.body)}</article>
      <aside class="detail-side">
      ${(item.models ?? []).length ? `<div class="panel"><h3>Preferred models</h3><ol class="model-list">${item.models.map((model) => `<li><b>${esc(model.provider)}</b><span>${esc(model.model)}</span></li>`).join("")}</ol><small>Uses the current composer model if none are available.</small></div>` : ""}
      ${canEdit && item.files.length ? `<div class="panel"><h3>Supporting files</h3>${item.files.map((file) => `<button class="file-row" data-file="${esc(file.path)}">${esc(file.path)}</button>`).join("")}</div>` : ""}
      </aside></div>`;
}

function editorInput(label, name, value, attrs = "") {
  return `<label class="field"><span>${label}</span><input name="${name}" value="${esc(value)}" ${attrs} /></label>`;
}

function newPlaybookDraft() {
  return { title: "", description: "", body: "# Instructions\n\n", tags: [], apps: [], models: [], files: [], visibility: "private", lifecycle: "draft", access: "owner" };
}

function newCollectionDraft() {
  return { title: "", description: "", visibility: "private", playbooks: [], access: "owner" };
}

function renderEditor() {
  const item = state.editor;
  const isNew = !item.id;
  const canDelete = item.access === "owner";
  const actions = `<span class="save-status" data-save-status>${esc(state.autosaveStatus)}</span><button class="button" data-action="cancel-edit">${isNew ? "Cancel" : "Done"}</button><button class="button primary" data-action="save-playbook">Save</button>`;
  return `${pageHeader(isNew ? "New Playbook" : item.title, isNew ? "Start with a clear procedure" : "Markdown editor", actions)}
    <div class="editor-layout"><div class="editor-main">
      ${editorInput("Title", "title", item.title, "maxlength=255")}
      <label class="field"><span>Description</span><textarea name="description" rows="2">${esc(item.description)}</textarea></label>
      <label class="field"><span>Instructions</span><textarea class="markdown-editor" name="body" rows="24" spellcheck="true">${esc(item.body)}</textarea></label>
    </div><aside class="editor-side">
      <div class="panel"><h3>Publishing</h3>
        <label class="field"><span>Visibility</span><select name="visibility"><option value="private" ${item.visibility === "private" ? "selected" : ""}>Private</option><option value="public" ${item.visibility === "public" ? "selected" : ""}>Public</option></select></label>
        ${!isNew ? `<button class="button wide" data-action="toggle-publish">${item.lifecycle === "published" ? "Move to drafts" : "Publish"}</button>` : '<small>Save the draft before publishing.</small>'}
      </div>
      <div class="panel"><h3>Tags and Apps</h3>${editorInput("Tags", "tags", (item.tags ?? []).join(", "), "placeholder='sales, research'")}${editorInput("Apps", "apps", (item.apps ?? []).join(", "), "placeholder='canvas, browser'")}</div>
      <div class="panel"><div class="panel-title"><h3>Preferred models</h3><button class="text-button" data-action="add-model">Add</button></div>${renderModelRows(item.models ?? [])}<small>Ordered preferences. The composer falls back to its current model.</small></div>
      <div class="panel"><div class="panel-title"><h3>Supporting files</h3><button class="text-button" data-action="add-file">Add</button></div>${renderFileRows(item.files ?? [])}<small>Visible to editors and included when an agent reads the Playbook.</small></div>
      ${!isNew ? `<div class="panel"><button class="button wide" data-share-playbook="${esc(item.id)}">Share</button>${canDelete ? `<button class="button danger wide" data-delete-playbook="${esc(item.id)}">Delete Playbook</button>` : ""}</div>` : ""}
    </aside></div>`;
}

function renderModelRows(models) {
  if (!models.length) return '<p class="muted">No preferences.</p>';
  return `<div class="stack">${models.map((model, index) => `<div class="repeat-row model-row" data-model-index="${index}">
    <select data-model-provider><option value="codex" ${model.provider === "codex" ? "selected" : ""}>ChatGPT</option><option value="claudeAgent" ${model.provider === "claudeAgent" ? "selected" : ""}>Claude</option><option value="opencode" ${model.provider === "opencode" ? "selected" : ""}>OpenCode</option></select>
    <input data-model-name list="model-catalog" value="${esc(model.model)}" placeholder="Model ID" />
    <input data-model-options value="${esc(JSON.stringify(model.options ?? {}))}" placeholder='Options JSON' />
    <div><button class="mini" data-move-model="up" title="Move up">↑</button><button class="mini" data-move-model="down" title="Move down">↓</button><button class="mini" data-remove-model title="Remove">×</button></div>
  </div>`).join("")}</div><datalist id="model-catalog">${state.possibleModels.map((model) => `<option value="${esc(model.model)}">${esc(model.name)} · ${esc(model.provider)}</option>`).join("")}</datalist>`;
}

function renderFileRows(files) {
  if (!files.length) return '<p class="muted">No supporting files.</p>';
  return `<div class="stack">${files.map((file, index) => `<details class="file-editor" data-file-index="${index}"><summary>${esc(file.path)}</summary>
    <input data-file-path value="${esc(file.path)}" placeholder="notes/example.md" />
    <input data-file-mime value="${esc(file.mimeType)}" placeholder="text/plain" />
    <textarea data-file-content rows="8">${esc(file.content)}</textarea>
    <button class="text-button danger-text" data-remove-file>Remove</button></details>`).join("")}</div>`;
}

function renderCollections() {
  const search = `<label class="search collection-search">${icon("search")}<input data-search value="${esc(state.query)}" placeholder="Search collections" /></label>`;
  return `${pageHeader("Collections", "Curated sets of playbooks from the community", search)}${grid(state.data.items, collectionCard, "No collections yet.")}`;
}

function renderCollection(item) {
  const canEdit = item.access === "owner" || item.access === "editor";
  const actions = `<button class="button" data-copy="${esc(item.path)}">${icon("copy")} Copy path</button>${canEdit ? `<button class="button" data-edit-collection="${esc(item.id)}">Edit</button>` : ""}`;
  return `${pageHeader(item.title, item.description, actions)}<div class="collection-meta">${badges(item)}${author(item.author)}<button class="like ${item.liked ? "liked" : ""}" data-like-collection="${esc(item.id)}">${icon("heart")} ${item.likes}</button></div>${grid(item.playbooks, playbookCard, "This collection is empty.")}`;
}

function renderCollectionEditor() {
  const item = state.editor;
  const isNew = !item.id;
  const actions = `<button class="button" data-action="cancel-edit">Cancel</button><button class="button primary" data-action="save-collection">Save</button>`;
  return `${pageHeader(isNew ? "New collection" : item.title, "Organize Playbooks in a deliberate order", actions)}
    <div class="editor-layout"><div class="editor-main">
      ${editorInput("Title", "title", item.title)}
      <label class="field"><span>Description</span><textarea name="description" rows="4">${esc(item.description)}</textarea></label>
      <div class="panel"><h3>Playbooks</h3>${(item.playbooks ?? []).length ? item.playbooks.map((playbook, index) => `<div class="collection-item" data-collection-index="${index}"><b>${esc(playbook.title)}</b><div><button class="mini" data-move-collection-item="up">↑</button><button class="mini" data-move-collection-item="down">↓</button><button class="mini" data-remove-collection-item>×</button></div></div>`).join("") : '<p class="muted">No Playbooks yet.</p>'}<button class="button" data-action="add-collection-item">Add Playbook</button></div>
    </div><aside class="editor-side"><div class="panel"><h3>Access</h3><label class="field"><span>Visibility</span><select name="visibility"><option value="private" ${item.visibility === "private" ? "selected" : ""}>Private</option><option value="public" ${item.visibility === "public" ? "selected" : ""}>Public</option></select></label><small>Anyone invited to a private collection can view its private Playbooks.</small></div>
      ${!isNew ? `<div class="panel"><button class="button wide" data-share-collection="${esc(item.id)}">Share</button>${item.access === "owner" ? `<button class="button danger wide" data-delete-collection="${esc(item.id)}">Delete collection</button>` : ""}</div>` : ""}</aside></div>`;
}

function renderRuns() {
  const items = state.data.items;
  return `${pageHeader("Runs", "Playbooks active in your Threads")}${items.length ? `<div class="run-list">${items.map((run) => `<button class="run-row" data-run="${esc(run.id)}"><span class="status ${esc(run.status)}"></span><span><b>${esc(run.label)}</b><small>${statusLabel(run.status)}${run.reason ? ` · ${esc(run.reason)}` : ""}</small></span><time>${relative(run.updatedAt)}</time></button>`).join("")}</div>` : '<div class="empty"><h3>No Runs yet.</h3><p>Play a published Playbook to begin.</p></div>'}`;
}

function renderRun(run) {
  const active = !["completed", "deleted"].includes(run.status);
  const actions = `<span class="run-pill ${esc(run.status)}">${statusLabel(run.status)}</span><button class="button primary" data-open-thread="${esc(run.threadId)}">${icon("thread")} Go to thread</button>`;
  const message = run.reason || run.note || (run.status === "needs_input" ? "Continue the conversation in its Thread. The agent is waiting for your input before it continues." : "This run is active in its linked Thread.");
  return `${pageHeader(run.label, `Started ${relative(run.startedAt)} ago`, actions)}
    <div class="run-summary"><section class="run-panel"><div class="run-panel-title"><span class="status ${esc(run.status)}"></span><h2>${run.status === "needs_input" ? "This run needs your input" : statusLabel(run.status)}</h2></div><p>${esc(message)}</p><div class="run-controls"><span>Pause stops active schedules and continuing work. Delete stops them and removes this run from the active list; both keep your data.</span>${active ? run.status === "paused" ? `<button class="button" data-run-action="resume">Resume</button>` : `<button class="button" data-run-action="pause">${icon("pause")} Pause</button>` : ""}${run.status !== "deleted" ? `<button class="text-button danger-text" data-run-action="delete">Delete</button>` : ""}</div></section></div>`;
}

function renderProfile(profile) {
  return `${pageHeader(profile.name || "Profile", `${profile.likes} likes across published work`)}<div class="profile-head">${profile.avatarUrl ? `<img src="${esc(profile.avatarUrl)}" alt="" />` : `<span>${esc((profile.name || "?")[0])}</span>`}<div><h2>${esc(profile.name || "Unknown")}</h2><p>${profile.playbooks.length} Playbooks · ${profile.collections.length} collections</p></div></div>
    <section><h2>Published</h2>${grid(profile.playbooks, playbookCard, "No published Playbooks.")}</section>${profile.collections.length ? `<section><h2>Collections</h2>${grid(profile.collections, collectionCard)}</section>` : ""}`;
}

function renderModal() {
  if (!state.modal) return "";
  if (state.modal.kind === "file") {
    const file = state.modal.file;
    return `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" data-modal><div class="panel-title"><div><h2>${esc(file.path)}</h2><small>${esc(file.mimeType)}</small></div><button class="icon-button" data-action="close-modal">×</button></div><pre class="file-preview">${esc(file.content)}</pre></section></div>`;
  }
  if (state.modal.kind === "share") {
    return `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" data-modal><div class="panel-title"><h2>Share</h2><button class="icon-button" data-action="close-modal">×</button></div>
      <form data-share-form><div class="inline-fields"><input name="email" type="email" placeholder="name@example.com" required /><select name="role"><option value="viewer">Can view</option><option value="editor">Can edit</option></select><button class="button primary">Invite</button></div></form>
      <div class="grant-list">${state.modal.grants.map((grant) => `<div><span><b>${esc(grant.name || grant.email)}</b><small>${esc(grant.status)} · ${esc(grant.role)}</small></span><button class="text-button danger-text" data-revoke-grant="${esc(grant.id)}">Remove</button></div>`).join("") || '<p class="muted">No invitations yet.</p>'}</div></section></div>`;
  }
  if (state.modal.kind === "pick-playbook") {
    return `<div class="modal-backdrop" data-action="close-modal"><section class="modal" data-modal><div class="panel-title"><h2>Add Playbook</h2><button class="icon-button" data-action="close-modal">×</button></div><div class="picker-list">${state.modal.items.map((item) => `<button data-pick-playbook="${esc(item.id)}"><b>${esc(item.title)}</b><small>${esc(item.lifecycle)} · ${esc(item.visibility)}</small></button>`).join("") || '<p class="muted">No available Playbooks.</p>'}</div></section></div>`;
  }
  if (state.modal.kind === "pick-collection") {
    return `<div class="modal-backdrop" data-action="close-modal"><section class="modal" data-modal><div class="panel-title"><h2>Add to collection</h2><button class="icon-button" data-action="close-modal">×</button></div><div class="picker-list">${state.modal.items.map((item) => `<button data-pick-collection="${esc(item.id)}"><b>${esc(item.title)}</b><small>${esc(item.visibility)}</small></button>`).join("") || '<p class="muted">Create an editable collection first.</p>'}</div></section></div>`;
  }
  return "";
}

function statusLabel(status) {
  return ({ running: "Running", needs_input: "Needs input", paused: "Paused", completed: "Completed", deleted: "Deleted" })[status] ?? status;
}

function relative(value) {
  const delta = Date.now() - Date.parse(value);
  if (!Number.isFinite(delta)) return "";
  const mins = Math.max(0, Math.floor(delta / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

async function load() {
  state.loading = true;
  state.error = null;
  render();
  try {
    const route = state.route;
    if (route.name === "explore") {
      const includeProfiles = state.query.trim().length > 0;
      const [playbooks, collections, tags, profilePlaybooks, profileCollections] = await Promise.all([
        api.listPlaybooks({ query: state.query, view: "explore", tag: route.tag, limit: 50 }),
        api.listCollections({ query: state.query }).then((result) => ({ ...result, items: result.items.filter((item) => item.visibility === "public") })), api.listTags(),
        includeProfiles ? api.listPlaybooks({ query: "", view: "explore", limit: 100 }) : { items: [] },
        includeProfiles ? api.listCollections({ query: "" }) : { items: [] },
      ]);
      const authorQuery = state.query.trim().toLocaleLowerCase();
      const profileMap = new Map();
      for (const item of [...profilePlaybooks.items, ...profileCollections.items.filter((entry) => entry.visibility === "public")]) {
        if (item.author.name?.toLocaleLowerCase().includes(authorQuery)) profileMap.set(item.author.id, item.author);
      }
      state.data = { playbooks, collections, tags, profiles: [...profileMap.values()] };
    } else if (route.name === "library") {
      if (state.libraryTab === "collections") {
        const result = await api.listCollections({ query: state.query });
        state.data = { items: result.items.filter((item) => item.access !== "viewer" || item.visibility === "private" || item.liked) };
      } else if (state.libraryTab === "likes") {
        const [playbooks, collections] = await Promise.all([
          api.listPlaybooks({ query: state.query, view: "likes", limit: 100 }),
          api.listCollections({ query: state.query }),
        ]);
        state.data = { ...playbooks, collections: collections.items.filter((item) => item.liked) };
      } else if (state.libraryTab === "published") {
        const [playbooks, collections] = await Promise.all([
          api.listPlaybooks({ query: state.query, view: "published", limit: 100 }),
          api.listCollections({ query: state.query }),
        ]);
        state.data = { ...playbooks, collections: collections.items.filter((item) => item.access === "owner" || item.access === "editor") };
      } else state.data = await api.listPlaybooks({ query: state.query, view: state.libraryTab, limit: 100 });
    } else if (route.name === "playbook") state.data = await api.getPlaybook(route.id);
    else if (route.name === "editor") {
      if (route.id && state.editor?.id !== route.id) state.editor = await api.getPlaybook(route.id);
      else if (!route.id && !state.editor) state.editor = newPlaybookDraft();
    }
    else if (route.name === "collection") state.data = await api.getCollection(route.id);
    else if (route.name === "collection-editor") {
      if (route.id && state.editor?.id !== route.id) state.editor = await api.getCollection(route.id);
      else if (!route.id && !state.editor) state.editor = newCollectionDraft();
    }
    else if (route.name === "collections") state.data = await api.listCollections({ query: state.query });
    else if (route.name === "runs") state.data = await api.listRuns({ limit: 100 });
    else if (route.name === "run") state.data = await api.getRun(route.id);
    else if (route.name === "profile") state.data = await api.getProfile(route.id);
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.loading = false;
    render();
  }
}

function render() {
  let content;
  if (state.loading) content = '<div class="loading"><span></span>Loading</div>';
  else if (state.error) content = `<div class="error"><h2>Couldn’t load Playbooks</h2><p>${esc(state.error)}</p><button class="button" data-action="retry">Try again</button></div>`;
  else if (state.route.name === "explore") content = renderExplore();
  else if (state.route.name === "library") content = renderLibrary();
  else if (state.route.name === "playbook") content = renderPlaybook(state.data);
  else if (state.route.name === "editor") content = renderEditor();
  else if (state.route.name === "collections") content = renderCollections();
  else if (state.route.name === "collection") content = renderCollection(state.data);
  else if (state.route.name === "collection-editor") content = renderCollectionEditor();
  else if (state.route.name === "runs") content = renderRuns();
  else if (state.route.name === "run") content = renderRun(state.data);
  else if (state.route.name === "profile") content = renderProfile(state.data);
  root.innerHTML = shell(content ?? "");
}

function syncEditorFromDom() {
  if (!state.editor) return;
  const get = (selector) => root.querySelector(selector)?.value ?? "";
  state.editor.title = get('[name="title"]');
  state.editor.description = get('[name="description"]');
  state.editor.visibility = get('[name="visibility"]') || "private";
  if (state.route.name === "editor") {
    state.editor.body = get('[name="body"]');
    state.editor.tags = get('[name="tags"]').split(",").map((v) => v.trim()).filter(Boolean);
    state.editor.apps = get('[name="apps"]').split(",").map((v) => v.trim()).filter(Boolean);
    state.editor.models = [...root.querySelectorAll("[data-model-index]")].map((row) => {
      let options = {};
      try { options = JSON.parse(row.querySelector("[data-model-options]").value || "{}"); } catch { throw new Error("Model options must be valid JSON."); }
      return { provider: row.querySelector("[data-model-provider]").value, model: row.querySelector("[data-model-name]").value.trim(), options };
    }).filter((model) => model.model);
    state.editor.files = [...root.querySelectorAll("[data-file-index]")].map((row) => ({
      path: row.querySelector("[data-file-path]").value.trim(), mimeType: row.querySelector("[data-file-mime]").value.trim() || "text/plain", encoding: "utf-8", content: row.querySelector("[data-file-content]").value,
    })).filter((file) => file.path);
  }
}

function playbookEditorPayload() {
  return {
    title: state.editor.title,
    description: state.editor.description,
    body: state.editor.body,
    tags: state.editor.tags,
    apps: state.editor.apps,
    models: state.editor.models,
    files: state.editor.files,
  };
}

async function persistExistingPlaybook() {
  syncEditorFromDom();
  const desiredVisibility = state.editor.visibility;
  let saved = await api.updatePlaybook(state.editor.id, playbookEditorPayload());
  if (saved.visibility !== desiredVisibility) saved = await api.setVisibility(saved.id, desiredVisibility);
  state.editor = { ...state.editor, lifecycle: saved.lifecycle, visibility: saved.visibility, updatedAt: saved.updatedAt };
  return saved;
}

let autosaveTimer;
let autosaveChain = Promise.resolve();
let pendingAutosave = null;

function schedulePlaybookAutosave() {
  if (state.route.name !== "editor" || !state.editor?.id) return;
  try {
    syncEditorFromDom();
    pendingAutosave = {
      id: state.editor.id,
      visibility: state.editor.visibility,
      payload: structuredClone(playbookEditorPayload()),
    };
  } catch (error) {
    setSaveStatus(error instanceof Error ? error.message : "Couldn't save");
    return;
  }
  clearTimeout(autosaveTimer);
  setSaveStatus("Saving…");
  autosaveTimer = setTimeout(() => {
    const snapshot = pendingAutosave;
    pendingAutosave = null;
    if (!snapshot) return;
    autosaveChain = autosaveChain.then(async () => {
      try {
        let saved = await api.updatePlaybook(snapshot.id, snapshot.payload);
        if (saved.visibility !== snapshot.visibility) saved = await api.setVisibility(snapshot.id, snapshot.visibility);
        if (state.editor?.id === snapshot.id) {
          state.editor = { ...state.editor, lifecycle: saved.lifecycle, visibility: saved.visibility, updatedAt: saved.updatedAt };
        }
        setSaveStatus("Saved");
      } catch (error) {
        setSaveStatus(error instanceof Error ? error.message : "Couldn't save");
      }
    });
  }, 700);
}

function setSaveStatus(value) {
  state.autosaveStatus = value;
  const node = root.querySelector("[data-save-status]");
  if (node) node.textContent = value;
}

async function act(work) {
  if (state.busy) return;
  state.busy = true;
  try { await work(); } catch (error) { state.error = error instanceof Error ? error.message : String(error); render(); } finally { state.busy = false; }
}

root.addEventListener("click", (event) => {
  const target = event.target.closest("button, [data-playbook], [data-collection]");
  if (!target) return;
  if (target.matches("[data-modal]")) return;
  if (target.dataset.action === "close-modal" && event.target.closest("[data-modal]") && !event.target.closest("button")) return;
  event.stopPropagation();

  if (target.dataset.nav) return navigate({ name: target.dataset.nav === "runs" ? "runs" : target.dataset.nav });
  if (target.dataset.accountTab) { state.libraryTab = target.dataset.accountTab; return navigate({ name: "library" }); }
  if (target.dataset.action === "back") return goBack();
  if (target.dataset.action === "retry") return void load();
  if (target.dataset.action === "close-modal") { state.modal = null; return render(); }
  if (target.dataset.tag !== undefined) return navigate({ name: "explore", ...(target.dataset.tag ? { tag: target.dataset.tag } : {}) }, { replace: true });
  if (target.dataset.libraryTab) { state.libraryTab = target.dataset.libraryTab; return void load(); }
  if (target.dataset.profile) return navigate({ name: "profile", id: target.dataset.profile });
  if (target.dataset.playbook) return target.dataset.playbook && navigate({ name: "playbook", id: target.dataset.playbook });
  if (target.dataset.collection) return navigate({ name: "collection", id: target.dataset.collection });
  if (target.dataset.run) return navigate({ name: "run", id: target.dataset.run });
  if (target.dataset.copy) return void navigator.clipboard.writeText(target.dataset.copy);

  if (target.dataset.likePlaybook) return void act(async () => { const item = findPlaybook(target.dataset.likePlaybook); const result = await api.setPlaybookLike(target.dataset.likePlaybook, !item?.liked); await load(); });
  if (target.dataset.likeCollection) return void act(async () => { const item = findCollection(target.dataset.likeCollection); await api.setCollectionLike(target.dataset.likeCollection, !item?.liked); await load(); });
  if (target.dataset.play) return void act(async () => {
    const item = state.data?.id === target.dataset.play ? state.data : await api.getPlaybook(target.dataset.play);
    await stagePlaybook(runtime, item);
  });
  if (target.dataset.addToCollection) return void act(async () => {
    const result = await api.listCollections({ query: "" });
    const playbook = findPlaybook(target.dataset.addToCollection);
    state.modal = {
      kind: "pick-collection",
      playbookId: target.dataset.addToCollection,
      items: result.items.filter((item) =>
        (item.access === "owner" || item.access === "editor") &&
        (item.visibility === "private" || (playbook?.visibility === "public" && playbook?.lifecycle === "published"))),
    };
    render();
  });
  if (target.dataset.pickCollection) return void act(async () => {
    await api.addCollectionItem(target.dataset.pickCollection, { playbookId: state.modal.playbookId });
    state.modal = null;
    render();
  });
  if (target.dataset.openThread) return void act(() => runtime.thread.open({ threadId: target.dataset.openThread }));
  if (target.dataset.runAction) return void act(async () => {
    const run = state.data;
    await stageRunAction(runtime, target.dataset.runAction, run);
  });

  if (target.dataset.action === "new-playbook") {
    state.autosaveStatus = "";
    state.editor = newPlaybookDraft();
    return navigate({ name: "editor" });
  }
  if (target.dataset.editPlaybook) return void act(async () => { state.autosaveStatus = ""; state.editor = await api.getPlaybook(target.dataset.editPlaybook); navigate({ name: "editor", id: target.dataset.editPlaybook }); });
  if (target.dataset.action === "cancel-edit") {
    if (!state.editor?.id) return goBack();
    clearTimeout(autosaveTimer);
    pendingAutosave = null;
    return void act(async () => { await autosaveChain; await persistExistingPlaybook(); goBack(); });
  }
  if (target.dataset.action === "save-playbook") return void act(async () => {
    clearTimeout(autosaveTimer);
    pendingAutosave = null;
    await autosaveChain;
    syncEditorFromDom();
    const saved = state.editor.id ? await persistExistingPlaybook() : await api.createPlaybook({ ...playbookEditorPayload(), visibility: state.editor.visibility });
    state.editor = null; navigate({ name: "playbook", id: saved.id }, { replace: true });
  });
  if (target.dataset.action === "toggle-publish") return void act(async () => {
    clearTimeout(autosaveTimer);
    pendingAutosave = null;
    await autosaveChain;
    const saved = await persistExistingPlaybook();
    state.editor = await api.setPublication(saved.id, saved.lifecycle === "published" ? "draft" : "published");
    state.autosaveStatus = "Saved";
    render();
  });
  if (target.dataset.deletePlaybook) return void act(async () => { if (!confirm("Delete this Playbook? Existing Runs will remain manageable.")) return; await api.deletePlaybook(target.dataset.deletePlaybook); navigate({ name: "library" }, { replace: true }); });
  if (target.dataset.action === "add-model") { syncEditorFromDom(); state.editor.models.push({ provider: "codex", model: state.possibleModels.find((m) => m.provider === "codex")?.model ?? "", options: {} }); render(); schedulePlaybookAutosave(); return; }
  if (target.dataset.removeModel !== undefined) { syncEditorFromDom(); state.editor.models.splice(Number(target.closest("[data-model-index]").dataset.modelIndex), 1); render(); schedulePlaybookAutosave(); return; }
  if (target.dataset.moveModel) { syncEditorFromDom(); move(state.editor.models, Number(target.closest("[data-model-index]").dataset.modelIndex), target.dataset.moveModel); schedulePlaybookAutosave(); return; }
  if (target.dataset.action === "add-file") { syncEditorFromDom(); state.editor.files.push({ path: "", mimeType: "text/plain", encoding: "utf-8", content: "" }); render(); schedulePlaybookAutosave(); return; }
  if (target.dataset.removeFile !== undefined) { syncEditorFromDom(); state.editor.files.splice(Number(target.closest("[data-file-index]").dataset.fileIndex), 1); render(); schedulePlaybookAutosave(); return; }
  if (target.dataset.file) { const file = state.data.files.find((entry) => entry.path === target.dataset.file); if (file) state.modal = { kind: "file", file }; return render(); }
  if (target.dataset.sharePlaybook) return void act(() => openShare("playbook", target.dataset.sharePlaybook));

  if (target.dataset.action === "new-collection") { state.editor = newCollectionDraft(); return navigate({ name: "collection-editor" }); }
  if (target.dataset.editCollection) return void act(async () => { state.editor = await api.getCollection(target.dataset.editCollection); navigate({ name: "collection-editor", id: target.dataset.editCollection }); });
  if (target.dataset.action === "save-collection") return void act(async () => {
    syncEditorFromDom();
    let saved;
    if (state.editor.id) {
      saved = await api.updateCollection(state.editor.id, { title: state.editor.title, description: state.editor.description, visibility: state.editor.visibility });
      await api.reorderCollection(saved.id, state.editor.playbooks.map((item) => item.id));
    } else {
      if (state.editor.visibility === "public" && state.editor.playbooks.some((item) => item.lifecycle !== "published" || item.visibility !== "public")) {
        throw new Error("A public collection can contain only public published Playbooks.");
      }
      saved = await api.createCollection({ title: state.editor.title, description: state.editor.description, visibility: state.editor.visibility });
      for (const [position, item] of state.editor.playbooks.entries()) {
        saved = await api.addCollectionItem(saved.id, { playbookId: item.id, position });
      }
    }
    state.editor = null; navigate({ name: "collection", id: saved.id }, { replace: true });
  });
  if (target.dataset.action === "add-collection-item") return void act(async () => {
    const [editable, publicItems] = await Promise.all([
      api.listPlaybooks({ view: "published", limit: 100 }),
      api.listPlaybooks({ view: "explore", limit: 100 }),
    ]);
    const items = [...new Map([...editable.items, ...publicItems.items].map((item) => [item.id, item])).values()]
      .filter((item) => item.visibility === "public" || item.access === "owner" || item.access === "editor");
    state.modal = { kind: "pick-playbook", items: items.filter((item) => !state.editor.playbooks.some((entry) => entry.id === item.id)) };
    render();
  });
  if (target.dataset.pickPlaybook) return void act(async () => { const item = state.modal.items.find((entry) => entry.id === target.dataset.pickPlaybook); if (state.editor.id) await api.addCollectionItem(state.editor.id, { playbookId: item.id, position: state.editor.playbooks.length }); state.editor.playbooks.push(item); state.modal = null; render(); });
  if (target.dataset.removeCollectionItem !== undefined) return void act(async () => { syncEditorFromDom(); const index = Number(target.closest("[data-collection-index]").dataset.collectionIndex); const [item] = state.editor.playbooks.splice(index, 1); if (state.editor.id) await api.removeCollectionItem(state.editor.id, item.id); render(); });
  if (target.dataset.moveCollectionItem) { syncEditorFromDom(); move(state.editor.playbooks, Number(target.closest("[data-collection-index]").dataset.collectionIndex), target.dataset.moveCollectionItem); return render(); }
  if (target.dataset.shareCollection) return void act(() => openShare("collection", target.dataset.shareCollection));
  if (target.dataset.deleteCollection) return void act(async () => { if (!confirm("Delete this collection? The Playbooks inside it are not deleted.")) return; await api.deleteCollection(target.dataset.deleteCollection); navigate({ name: "library" }, { replace: true }); });
  if (target.dataset.revokeGrant) return void act(async () => { const modal = state.modal; if (modal.resource === "playbook") await api.revokePlaybookGrant(modal.id, target.dataset.revokeGrant); else await api.revokeCollectionGrant(modal.id, target.dataset.revokeGrant); await openShare(modal.resource, modal.id); });
});

root.addEventListener("submit", (event) => {
  if (!event.target.matches("[data-share-form]")) return;
  event.preventDefault();
  const data = new FormData(event.target);
  void act(async () => {
    const input = { email: data.get("email"), role: data.get("role") };
    if (state.modal.resource === "playbook") await api.grantPlaybook(state.modal.id, input); else await api.grantCollection(state.modal.id, input);
    await openShare(state.modal.resource, state.modal.id);
  });
});

let searchTimer;
root.addEventListener("input", (event) => {
  if (event.target.matches("[data-search]")) {
    state.query = event.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void load(), 250);
    return;
  }
  if (event.target.closest(".editor-layout")) schedulePlaybookAutosave();
});

root.addEventListener("change", (event) => {
  if (event.target.closest(".editor-layout")) schedulePlaybookAutosave();
});

function move(items, index, direction) {
  const next = direction === "up" ? index - 1 : index + 1;
  if (next < 0 || next >= items.length) return;
  [items[index], items[next]] = [items[next], items[index]];
  render();
}

function findPlaybook(id) {
  if (state.data?.id === id) return state.data;
  return state.data?.items?.find((item) => item.id === id) ?? state.data?.playbooks?.items?.find((item) => item.id === id);
}

function findCollection(id) {
  if (state.data?.id === id) return state.data;
  return state.data?.items?.find((item) => item.id === id) ?? state.data?.collections?.items?.find((item) => item.id === id);
}

async function openShare(resource, id) {
  const grants = resource === "playbook" ? await api.listPlaybookGrants(id) : await api.listCollectionGrants(id);
  state.modal = { kind: "share", resource, id, grants: grants.items };
  render();
}

async function refreshRail() {
  try {
    const [published, drafts, likes, runs] = await Promise.all([
      api.listPlaybooks({ query: "", view: "published", limit: 100 }),
      api.listPlaybooks({ query: "", view: "drafts", limit: 100 }),
      api.listPlaybooks({ query: "", view: "likes", limit: 100 }),
      api.listRuns({ limit: 100 }),
    ]);
    state.rail = {
      published: published.items.length,
      drafts: drafts.items.length,
      likes: published.items.filter((item) => item.access === "owner").reduce((total, item) => total + Number(item.likes || 0), 0),
      runs: runs.items,
    };
    render();
  } catch {
    // The main surface owns request errors; the rail remains usable without counts.
  }
}

async function start() {
  runtime?.tab?.onNavigate?.((input) => {
    try {
      const route = JSON.parse(input.route);
      if (route && typeof route.name === "string") {
        state.route = route;
        state.history = [route];
        state.historyIndex = 0;
        void load();
      }
    } catch {
      // Ignore an invalid retained route and keep Explore as the safe entry point.
    }
  });
  try { state.possibleModels = await runtime?.models?.listPossible?.() ?? []; } catch { state.possibleModels = []; }
  const subscriptions = [api.subscribeLibrary, api.subscribeExplore, api.subscribeRuns];
  const unsubscribers = (
    await Promise.allSettled(subscriptions.map((subscribe) => subscribe(() => { void refreshRail(); void load(); })))
  ).flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  window.addEventListener("beforeunload", () => unsubscribers.forEach((unsubscribe) => unsubscribe?.()));
  void refreshRail();
  await load();
}

void start();
