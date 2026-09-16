export function playbookComposition(playbook) {
  return {
    text: `Run “${playbook.title}” — ${playbook.path}`,
    model: playbook.models ?? [],
  };
}

export async function stagePlaybook(runtime, playbook) {
  return runtime.thread.compose(playbookComposition(playbook));
}

export function runActionComposition(action, run) {
  const label = action[0].toUpperCase() + action.slice(1);
  return { text: `${label} “${run.label}” — ${run.path}` };
}

export async function stageRunAction(runtime, action, run) {
  return runtime.thread.open({
    threadId: run.threadId,
    composition: runActionComposition(action, run),
  });
}
