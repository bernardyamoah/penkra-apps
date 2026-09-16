# Playbooks

Playbooks are Markdown procedures for agents. A copied `playbooks://` path is a reference, not the
procedure itself. Resolve it with the matching Playbooks operation before acting.

## Starting a Run

When the user sends `Run <playbooks://playbook/...>`:

1. Call `playbooks get` and read the complete Markdown and every supporting file.
2. Call `playbooks runs create` before beginning work. Retain the returned Run path.
3. Follow the Playbook. Use its ordered model preferences only through Penkra's staged composer;
   normal composer fallback applies when none is available.
4. Call `runs needs-input` only when work actually requires a human decision.
5. Call `runs complete` when the continuing procedure is finished.

One Thread may have only one active Run. Do not create a second Run to work around that constraint.

## Pause, Resume, and Delete

The user's sent Thread message is confirmation for the named action.

- Before Pause, Resume, or Delete, call `runs status` and reread the complete retained snapshot.
- Pause stops active schedules, jobs, and automatic continuations while preserving all data.
- Resume restarts the continuing work appropriate to that retained context.
- Delete stops active schedules, jobs, and continuations and then hides the Run. It never cleans up
  files, outputs, or other core data.
- Discover related work from the retained Playbook, Thread context, and available tools. Playbooks
  does not keep a separate artifact registry.
- Report `outcome: partial` with a precise summary when anything could not be stopped or resumed.
  Do not report a completed outcome when work remains.

Existing Runs remain manageable if their source Playbook is edited, privatized, unpublished, or
deleted. Use the retained Run snapshot in those cases.
