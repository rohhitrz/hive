/** Runs at most `n` tasks at once; the rest wait in FIFO order. */
export function createLimiter(n: number) {
  const max = Math.max(1, Math.floor(n));
  let active = 0;
  const waiting: (() => void)[] = [];

  return async function limit<T>(task: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((resolve) => waiting.push(resolve));
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      waiting.shift()?.();
    }
  };
}
