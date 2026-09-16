import assert from "node:assert/strict";
import test from "node:test";

import {
  createFolderForDocument,
  folderCreationParentId,
  nestedFolderForm,
} from "./folder-actions.mjs";

test("creating a folder from a design uses one atomic backend operation", async () => {
  const calls = [];
  const api = {
    async moveDocumentToNewFolder(documentId, name) {
      calls.push(["moveDocumentToNewFolder", documentId, name]);
      return {
        folder: { id: "child-folder", name, parentId: "parent-folder" },
        movedDocument: { id: documentId, folderId: "child-folder" },
      };
    },
  };

  const result = await createFolderForDocument(api, {
    name: "Research",
    document: { id: "design-1", folderId: "parent-folder" },
  });

  assert.deepEqual(calls, [["moveDocumentToNewFolder", "design-1", "Research"]]);
  assert.deepEqual(result, {
    folder: { id: "child-folder", name: "Research", parentId: "parent-folder" },
    movedDocument: { id: "design-1", folderId: "child-folder" },
  });
});

test("starting nested-folder creation retains the selected parent", () => {
  assert.deepEqual(nestedFolderForm({ id: "parent-folder" }), {
    kind: "folder-form",
    mode: "create-child",
    parentId: "parent-folder",
  });
});

test("nested-folder submission uses its retained parent after the menu closes", () => {
  assert.equal(folderCreationParentId(
    { mode: "create-child", parentId: "parent-folder" },
    { route: "library", currentFolderId: null },
  ), "parent-folder");
});

test("ordinary folder creation keeps its existing route behavior", () => {
  assert.equal(folderCreationParentId(
    { mode: "create" },
    { route: "library", currentFolderId: null },
  ), null);
  assert.equal(folderCreationParentId(
    { mode: "create" },
    { route: "folder", currentFolderId: "open-folder" },
  ), "open-folder");
});
