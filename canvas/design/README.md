# Design

The Canvas document named `Canvas - App` is the authoritative UI/UX design artifact for the Canvas
App.

The current saved document contains nine approved top-level screens:

- Home — nested folders (Recent)
- Home — All designs
- Folder — Clients (opened)
- Folder — Personal (empty)
- Editor — design switcher open
- Editor — Share dialog
- Home — New design dialog
- Home — Trash
- Home — search, no results

Implementation follows those saved screens. Additional states must be added to the document before
they are treated as approved visual requirements.

Trusted Penkra panel chrome shown in the document is integration context; Canvas must not recreate
it at runtime.
