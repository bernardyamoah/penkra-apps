export async function runCurrentBackgroundTasks(
  items,
  worker,
  { concurrency = 2, isCurrent = () => true } = {},
) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (isCurrent()) {
      const item = items[next++];
      if (item === undefined) return;
      await worker(item);
    }
  }));
}
