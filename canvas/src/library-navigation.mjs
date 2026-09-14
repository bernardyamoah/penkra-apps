export function activateLibraryTab(route, filter, { select, navigateToLibrary, render }) {
  select(filter);
  if (route === "library") {
    render();
    return;
  }
  return navigateToLibrary();
}
