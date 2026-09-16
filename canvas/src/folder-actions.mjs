export async function createFolderForDocument(api, { name, document }) {
  return api.moveDocumentToNewFolder(document.id, name);
}

export function nestedFolderForm(folder) {
  if (!folder?.id) throw new Error("A parent folder is required.");
  return { kind: "folder-form", mode: "create-child", parentId: folder.id };
}

export function folderCreationParentId(form, { route, currentFolderId }) {
  if (form.mode === "create-child") return form.parentId;
  if (form.mode === "create") return route === "folder" ? currentFolderId ?? null : null;
  throw new Error(`Unsupported folder creation mode: ${form.mode}`);
}
