# Design

The Canvas document named `Apps - App` is the authoritative design artifact for the Apps App.

This directory documents Apps-specific product coverage. Host previews of the public App Bar are
integration references, not a second platform primitive or design authority.

Current app-owned states:

- Launcher
- Search results
- App detail with full README, Permissions, and Developer information
- Install, Open, and Update actions in search results and App detail
- Offline catalog state

Install and update act directly from the catalog. Permission declarations and optional choices
remain visible in the App detail Permissions tab; a separate install-review screen is not part of
the current flow.
