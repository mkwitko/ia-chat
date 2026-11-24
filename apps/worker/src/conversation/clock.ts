// Time seen by the turn, injectable so tests run on a fake clock (E-15).

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
  /** Runs fn after ms; returns a cancel function. */
  after(ms: number, fn: () => void): () => void;
}

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  after: (ms, fn) => {
    const timer = setTimeout(fn, ms);
    return () => {
      clearTimeout(timer);
    };
  },
};

interface Timer {
  at: number;
  fn: () => void;
  cancelled: boolean;
}

export type FakeClock = Clock & { advance(ms: number): Promise<void> };

/** Test clock: nothing happens until advance() moves time forward. */
export function createFakeClock(start = 0): FakeClock {
  let current = start;
  const timers: Timer[] = [];
  const after = (ms: number, fn: () => void) => {
    const timer: Timer = { at: current + ms, fn, cancelled: false };
    timers.push(timer);
    return () => {
      timer.cancelled = true;
    };
  };
  return {
    now: () => current,
    after,
    sleep: (ms) => new Promise((resolve) => after(ms, resolve)),
    async advance(ms) {
      const target = current + ms;
      for (;;) {
        const due = timers
          .filter((timer) => !timer.cancelled && timer.at <= target)
          .sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        current = due.at;
        due.cancelled = true;
        due.fn();
        await Promise.resolve(); // let awaiting code react before the next timer
      }
      current = target;
      await Promise.resolve();
    },
  };
}
