export function createRouteCoordinator({
  isDocumentOpen,
  openDocument,
  onRouteError = () => undefined,
  setRoute,
  showDocumentUnavailable,
  showLibrary,
  showFolder,
  showTrash,
}) {
  let hostNavigationRequested = false;
  let transitions = Promise.resolve();

  const enqueue = (transition) => {
    const result = transitions.then(transition, transition);
    transitions = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const showDefaultLibrary = () => {
    if (hostNavigationRequested) return transitions;
    return enqueue(showLibrary);
  };

  const persistRoute = (route) => {
    void Promise.resolve(setRoute(route)).catch(onRouteError);
  };

  const handleHostNavigation = (input) => {
    hostNavigationRequested = true;
    return enqueue(() => {
      if (input.route === "/document" && input.state?.documentId) {
        return openDocument(input.state.documentId);
      }
      if (input.route === "/document-unavailable" && input.state?.documentId) {
        return showDocumentUnavailable(input.state);
      }
      if (input.route === "/folder" && input.state?.folderId) return showFolder(input.state.folderId);
      if (input.route === "/trash") return showTrash();
      return showLibrary();
    });
  };

  const navigateToDocument = (documentId) =>
    enqueue(async () => {
      await openDocument(documentId);
      if (!isDocumentOpen(documentId)) return;
      persistRoute({ route: "/document", state: { documentId } });
    });

  const navigateToLibrary = () =>
    enqueue(async () => {
      await showLibrary();
      persistRoute({ route: "/" });
    });

  const navigateToFolder = (folderId) =>
    enqueue(async () => {
      await showFolder(folderId);
      persistRoute({ route: "/folder", state: { folderId } });
    });

  const navigateToTrash = () =>
    enqueue(async () => {
      await showTrash();
      persistRoute({ route: "/trash" });
    });

  const navigateToDocumentUnavailable = (input) =>
    enqueue(async () => {
      await showDocumentUnavailable(input);
      persistRoute({ route: "/document-unavailable", state: input });
    });

  return {
    handleHostNavigation,
    navigateToDocument,
    navigateToDocumentUnavailable,
    navigateToLibrary,
    navigateToFolder,
    navigateToTrash,
    showDefaultLibrary,
  };
}
