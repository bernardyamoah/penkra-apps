# Create a Run

Call this in the Thread where the Playbook will run, before doing the work. The App binds the Run to
the invoking Thread and retains an immutable snapshot of the Playbook. Repeating the call for the
same active Playbook and Thread is idempotent; a different active Run conflicts.
